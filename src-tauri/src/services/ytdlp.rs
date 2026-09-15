use crate::types::{to_video_info, DownloadFilename, VideoInfo, YtDlpInfoDTO};
use anyhow::{Context, Result};
use std::time::Duration;
use tokio::process::Command;

use super::{
    execution::{execute, Attempt, AttemptProgress, ExecutionPlan},
    request_error::RequestFailure,
    runtime::capture,
};

/// Create a Command that hides the console window on Windows.
pub(crate) fn create_command(program: impl AsRef<std::ffi::OsStr>) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    cmd
}

pub async fn analyze(
    url: &str,
    plan: &ExecutionPlan,
    on_attempt: impl Fn(AttemptProgress),
) -> Result<VideoInfo> {
    let (mut info, context) = execute(
        plan,
        |context, attempt| {
            on_attempt(AttemptProgress {
                browser: context.browser.clone(),
                attempt,
            });
        },
        |attempt| async move {
            let output = metadata_output(
                &attempt,
                &["--dump-json", "--no-warnings", "--no-playlist", "--", url],
                Duration::from_secs(30),
            )
            .await?;
            let dto: YtDlpInfoDTO =
                serde_json::from_slice(&output).context("Failed to parse yt-dlp JSON output")?;
            Ok(to_video_info(dto))
        },
    )
    .await?;
    info.execution_context = Some(context);
    Ok(info)
}

pub async fn get_filename(
    url: &str,
    format_id: &str,
    plan: &ExecutionPlan,
) -> Result<DownloadFilename> {
    let (filename, execution_context) = execute(
        plan,
        |_, _| {},
        |attempt| async move {
            let output = metadata_output(
                &attempt,
                &[
                    "--print",
                    "filename",
                    "-f",
                    format_id,
                    "--no-playlist",
                    "--",
                    url,
                ],
                Duration::from_secs(15),
            )
            .await?;
            let filename = String::from_utf8_lossy(&output).trim().to_string();
            Ok(if filename.is_empty() {
                "download".into()
            } else {
                filename
            })
        },
    )
    .await?;
    Ok(DownloadFilename {
        filename,
        execution_context,
    })
}

async fn metadata_output(attempt: &Attempt, args: &[&str], timeout: Duration) -> Result<Vec<u8>> {
    let mut command = attempt.runtime.command();
    attempt.options.apply(&mut command);
    command.args(args);
    let output = capture(command, timeout).await?;
    if !output.status.success() {
        return Err(RequestFailure::from_stderr(&String::from_utf8_lossy(&output.stderr)).into());
    }
    Ok(output.stdout)
}

/// Turn yt-dlp's stderr into a short, user-facing message.
pub(crate) fn clean_error_message(stderr: &str) -> String {
    if stderr.contains("Unsupported URL") {
        return "This URL is not supported. Please check the URL and try again.".to_string();
    }
    if stderr.contains("Video unavailable") || stderr.contains("has been removed") {
        return "This video is unavailable or has been removed.".to_string();
    }
    if stderr.contains("Private video") {
        return "This video is private and cannot be accessed.".to_string();
    }
    if stderr.contains("Sign in to confirm") {
        return "This video requires authentication and cannot be downloaded.".to_string();
    }

    stderr
        .lines()
        .rev()
        .find(|line| line.starts_with("ERROR:"))
        .map(|line| line.trim_start_matches("ERROR:").trim().to_string())
        .unwrap_or_else(|| {
            "Failed to process the video. Please check the URL and try again.".to_string()
        })
}
