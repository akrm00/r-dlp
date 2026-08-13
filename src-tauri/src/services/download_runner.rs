//! Runs a single yt-dlp download, streaming its progress while it works.
//!
//! Unlike the one-shot commands in [`super::ytdlp`], this spawns yt-dlp with piped
//! output so progress lines can be read as they are produced, and so the process can
//! be killed when the user cancels or pauses.

use anyhow::{bail, Context, Result};
use std::path::Path;
use std::process::Stdio;
use std::time::Instant;
use tokio::io::{AsyncBufReadExt, AsyncRead, BufReader};
use tokio::sync::mpsc;

use super::download_registry::{wait_for_stop, StopReason, StopReceiver};
use super::progress_parser::{
    parse_progress_line, DOWNLOAD_TEMPLATE, POSTPROCESS_TEMPLATE,
};
use super::ytdlp::{clean_error_message, create_command, get_binary_path};
use crate::types::{DownloadOutcome, DownloadProgress};

/// Minimum delay between two progress updates pushed to the frontend. yt-dlp emits
/// far more often than a UI can use; stage changes bypass this.
const PROGRESS_THROTTLE: std::time::Duration = std::time::Duration::from_millis(150);

/// Upper bound on the stderr lines kept for the error message.
const MAX_ERROR_LINES: usize = 40;

enum Ended {
    Exited(std::process::ExitStatus),
    Stopped(StopReason),
}

/// Download `url` at `format_id` into `output_path`, reporting progress through
/// `on_progress` until the process ends or `stop_rx` asks it to stop.
pub async fn run_download(
    url: &str,
    format_id: &str,
    output_path: &Path,
    download_id: &str,
    stop_rx: &mut StopReceiver,
    on_progress: impl Fn(DownloadProgress) + Send + 'static,
) -> Result<DownloadOutcome> {
    let binary = get_binary_path();
    let path_str = output_path.to_str().context("Invalid output path")?;

    let mut child = create_command(&binary)
        .args([
            "-f",
            format_id,
            "-o",
            path_str,
            "--newline",
            "--progress",
            "--progress-template",
            DOWNLOAD_TEMPLATE,
            "--progress-template",
            POSTPROCESS_TEMPLATE,
            "--no-warnings",
            "--no-playlist",
            url,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .context("Failed to start yt-dlp download")?;

    let stdout = child.stdout.take().context("Failed to capture yt-dlp output")?;
    let stderr = child.stderr.take().context("Failed to capture yt-dlp errors")?;

    let (progress_tx, progress_rx) = mpsc::unbounded_channel();

    // Progress has been observed on either stream depending on the yt-dlp version,
    // so both are scanned; only stderr keeps its non-progress lines for errors.
    let stdout_reader = tokio::spawn(read_stream(
        stdout,
        download_id.to_string(),
        progress_tx.clone(),
        false,
    ));
    let stderr_reader = tokio::spawn(read_stream(
        stderr,
        download_id.to_string(),
        progress_tx.clone(),
        true,
    ));
    // Both readers hold a clone; dropping ours lets the forwarder finish with them.
    drop(progress_tx);

    let forwarder = tokio::spawn(forward_progress(progress_rx, on_progress));

    let ended = tokio::select! {
        result = child.wait() => {
            Ended::Exited(result.context("Failed to wait for the yt-dlp process")?)
        }
        reason = wait_for_stop(stop_rx) => Ended::Stopped(reason),
    };

    if matches!(&ended, Ended::Stopped(_)) {
        let _ = child.kill().await;
    }

    // The pipes are closed now, so the readers finish on their own.
    let stderr_lines = stderr_reader.await.unwrap_or_default();
    let _ = stdout_reader.await;
    let _ = forwarder.await;

    match ended {
        Ended::Stopped(StopReason::Cancel) => {
            cleanup_partials(output_path);
            Ok(DownloadOutcome::Cancelled)
        }
        Ended::Stopped(StopReason::Pause) => Ok(DownloadOutcome::Paused),
        Ended::Exited(status) => {
            if !status.success() {
                bail!("{}", clean_error_message(&stderr_lines.join("\n")));
            }
            Ok(DownloadOutcome::Completed)
        }
    }
}

/// Read one output stream line by line, forwarding progress and optionally keeping
/// the remaining lines for the error message.
///
/// Lines are read as bytes because yt-dlp output is not guaranteed to be valid UTF-8
/// (video titles on Windows consoles in particular).
async fn read_stream<TStream>(
    stream: TStream,
    download_id: String,
    progress_tx: mpsc::UnboundedSender<DownloadProgress>,
    keep_lines: bool,
) -> Vec<String>
where
    TStream: AsyncRead + Unpin,
{
    let mut segments = BufReader::new(stream).split(b'\n');
    let mut kept = Vec::new();

    while let Ok(Some(segment)) = segments.next_segment().await {
        let line = String::from_utf8_lossy(&segment);

        if let Some(progress) = parse_progress_line(&line, &download_id) {
            if progress_tx.send(progress).is_err() {
                break;
            }
        } else if keep_lines && kept.len() < MAX_ERROR_LINES {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                kept.push(trimmed.to_string());
            }
        }
    }

    kept
}

/// Throttle the progress stream so the UI receives at most one update per
/// [`PROGRESS_THROTTLE`], while never dropping a stage change.
async fn forward_progress(
    mut progress_rx: mpsc::UnboundedReceiver<DownloadProgress>,
    on_progress: impl Fn(DownloadProgress),
) {
    let mut last_emit: Option<Instant> = None;
    let mut last_stage = None;

    while let Some(progress) = progress_rx.recv().await {
        let is_stage_change = last_stage != Some(progress.stage);
        let is_due = last_emit.is_none_or(|at| at.elapsed() >= PROGRESS_THROTTLE);

        if is_stage_change || is_due {
            last_stage = Some(progress.stage);
            last_emit = Some(Instant::now());
            on_progress(progress);
        }
    }
}

/// Remove the artifacts a stopped download leaves behind.
///
/// Only yt-dlp's temporary files are touched, never the destination itself: the user
/// may have picked the name of a file that already existed. Best-effort — a failure
/// here must never surface as an error.
pub fn cleanup_partials(output_path: &Path) {
    let Some(target_name) = output_path.file_name().and_then(|name| name.to_str()) else {
        return;
    };
    let Some(directory) = output_path.parent() else {
        return;
    };

    let Ok(entries) = std::fs::read_dir(directory) else {
        return;
    };

    for entry in entries.flatten() {
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };

        if is_partial_artifact(name, target_name) {
            let _ = std::fs::remove_file(directory.join(name));
        }
    }
}

/// yt-dlp writes `<target>.part`, `<target>.part-FragN` and `<target>.ytdl` next to
/// the final file while downloading.
fn is_partial_artifact(file_name: &str, target_name: &str) -> bool {
    file_name.starts_with(&format!("{target_name}.part"))
        || file_name == format!("{target_name}.ytdl")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognises_yt_dlp_partial_artifacts() {
        assert!(is_partial_artifact("video.mp4.part", "video.mp4"));
        assert!(is_partial_artifact("video.mp4.part-Frag12", "video.mp4"));
        assert!(is_partial_artifact("video.mp4.ytdl", "video.mp4"));
    }

    #[test]
    fn leaves_unrelated_files_alone() {
        // The destination itself is never an artifact: it may predate the download.
        assert!(!is_partial_artifact("video.mp4", "video.mp4"));
        assert!(!is_partial_artifact("other.mp4.part", "video.mp4"));
        assert!(!is_partial_artifact("video.mp4.backup", "video.mp4"));
        assert!(!is_partial_artifact("video.mp4 (1).part", "video.mp4"));
    }
}
