use crate::types::{to_video_info, VideoInfo, YtDlpInfoDTO};
use anyhow::{bail, Context, Result};
use std::path::PathBuf;
use tokio::process::Command;

use super::ytdlp_setup;

/// Create a Command that hides the console window on Windows.
pub(crate) fn create_command(program: impl AsRef<std::ffi::OsStr>) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    cmd
}

const ANALYZE_TIMEOUT_SECS: u64 = 30;

/// Get the yt-dlp binary path: local app data binary first, then system PATH.
fn get_binary_path() -> String {
    if let Some(local_path) = ytdlp_setup::get_local_binary_path() {
        if local_path.exists() {
            return local_path.to_string_lossy().to_string();
        }
    }

    if cfg!(windows) {
        "yt-dlp.exe".to_string()
    } else {
        "yt-dlp".to_string()
    }
}

pub async fn analyze(url: &str) -> Result<VideoInfo> {
    let binary = get_binary_path();

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(ANALYZE_TIMEOUT_SECS),
        create_command(&binary)
            .args(["--dump-json", "--no-warnings", "--no-playlist", url])
            .output(),
    )
    .await
    .context("Analysis timed out after 30 seconds")?
    .context("Failed to start yt-dlp. Make sure it is installed.")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let cleaned = clean_error_message(&stderr);
        bail!("{}", cleaned);
    }

    let json_str =
        String::from_utf8(output.stdout).context("Failed to parse yt-dlp output as UTF-8")?;

    let dto: YtDlpInfoDTO =
        serde_json::from_str(&json_str).context("Failed to parse yt-dlp JSON output")?;

    Ok(to_video_info(dto))
}

pub async fn get_filename(url: &str, format_id: &str) -> Result<String> {
    let binary = get_binary_path();

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(15),
        create_command(&binary)
            .args([
                "--print",
                "filename",
                "-f",
                format_id,
                "--no-playlist",
                url,
            ])
            .output(),
    )
    .await??;

    if output.status.success() {
        let filename = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !filename.is_empty() {
            return Ok(filename);
        }
    }

    Ok("download".to_string())
}

pub async fn download_to_file(
    url: &str,
    format_id: &str,
    output_path: &PathBuf,
) -> Result<()> {
    let binary = get_binary_path();
    let path_str = output_path
        .to_str()
        .context("Invalid output path")?;

    let output = create_command(&binary)
        .args([
            "-f",
            format_id,
            "-o",
            path_str,
            "--no-warnings",
            "--no-playlist",
            url,
        ])
        .output()
        .await
        .context("Failed to start yt-dlp download")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let cleaned = clean_error_message(&stderr);
        bail!("{}", cleaned);
    }

    Ok(())
}

pub async fn get_version() -> Result<String> {
    let binary = get_binary_path();

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        create_command(&binary).arg("--version").output(),
    )
    .await
    .context("Version check timed out")?
    .context("Failed to run yt-dlp")?;

    if !output.status.success() {
        bail!("Failed to get yt-dlp version");
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn clean_error_message(stderr: &str) -> String {
    if stderr.contains("Unsupported URL") {
        return "This URL is not supported. Please check the URL and try again.".to_string();
    }
    if stderr.contains("Video unavailable") || stderr.contains("not available") {
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
        .find(|line| line.starts_with("ERROR:"))
        .map(|line| line.trim_start_matches("ERROR:").trim().to_string())
        .unwrap_or_else(|| {
            "Failed to process the video. Please check the URL and try again.".to_string()
        })
}
