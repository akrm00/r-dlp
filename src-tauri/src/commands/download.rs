use crate::services::download_registry::{
    wait_for_stop, DownloadRegistry, StopReason, StopReceiver,
};
use crate::services::download_runner::{cleanup_partials, run_download};
use crate::services::progress_parser::empty_progress;
use crate::services::ytdlp;
use crate::types::{DownloadOutcome, DownloadProgress, DownloadResult, DownloadStage};
use anyhow::Result;
use std::path::PathBuf;
use tauri::ipc::Channel;
use tauri::State;

#[tauri::command]
pub async fn get_download_filename(url: String, format_id: String) -> Result<String, String> {
    ytdlp::get_filename(&url, &format_id)
        .await
        .map_err(|e| e.to_string())
}

/// Download a video, streaming progress back through `on_progress`.
///
/// The download waits for a free queue slot before starting, so several downloads can
/// be requested at once. `download_id` identifies the run for `cancel_download` and
/// `pause_download`; resuming or retrying is the same command invoked again.
#[tauri::command]
pub async fn download_video(
    registry: State<'_, DownloadRegistry>,
    url: String,
    format_id: String,
    save_path: String,
    download_id: String,
    on_progress: Channel<DownloadProgress>,
) -> Result<DownloadResult, String> {
    let mut stop_rx = registry.register(&download_id).await;

    let result = run_queued_download(
        &registry,
        &mut stop_rx,
        &url,
        &format_id,
        &save_path,
        &download_id,
        on_progress,
    )
    .await;

    registry.unregister(&download_id).await;

    result.map_err(|e| e.to_string())
}

/// Delete the temporary files a stopped download left behind, once the user drops it
/// from the list. The downloaded file itself is never touched.
#[tauri::command]
pub async fn discard_partial_download(save_path: String) -> Result<(), String> {
    cleanup_partials(&PathBuf::from(save_path));
    Ok(())
}

#[tauri::command]
pub async fn cancel_download(
    registry: State<'_, DownloadRegistry>,
    download_id: String,
) -> Result<(), String> {
    stop(&registry, &download_id, StopReason::Cancel).await
}

#[tauri::command]
pub async fn pause_download(
    registry: State<'_, DownloadRegistry>,
    download_id: String,
) -> Result<(), String> {
    stop(&registry, &download_id, StopReason::Pause).await
}

async fn stop(
    registry: &DownloadRegistry,
    download_id: &str,
    reason: StopReason,
) -> Result<(), String> {
    if registry.stop(download_id, reason).await {
        Ok(())
    } else {
        Err("This download is no longer running.".to_string())
    }
}

async fn run_queued_download(
    registry: &DownloadRegistry,
    stop_rx: &mut StopReceiver,
    url: &str,
    format_id: &str,
    save_path: &str,
    download_id: &str,
    on_progress: Channel<DownloadProgress>,
) -> Result<DownloadResult> {
    let output_path = PathBuf::from(save_path);

    // Hold the permit for as long as yt-dlp runs: dropping it is what lets the next
    // queued download start.
    let _permit = tokio::select! {
        permit = registry.acquire_slot() => permit,
        reason = wait_for_stop(stop_rx) => {
            // Stopped before it ever started. A resume that is cancelled while queued
            // still has a partial file to discard.
            if reason == StopReason::Cancel {
                cleanup_partials(&output_path);
            }
            return Ok(stopped_result(reason, save_path));
        }
    };

    let _ = on_progress.send(empty_progress(download_id, DownloadStage::Started));

    let channel = on_progress.clone();
    let outcome = run_download(
        url,
        format_id,
        &output_path,
        download_id,
        stop_rx,
        move |progress| {
            let _ = channel.send(progress);
        },
    )
    .await?;

    Ok(DownloadResult {
        outcome,
        path: save_path.to_string(),
    })
}

fn stopped_result(reason: StopReason, save_path: &str) -> DownloadResult {
    DownloadResult {
        outcome: match reason {
            StopReason::Cancel => DownloadOutcome::Cancelled,
            StopReason::Pause => DownloadOutcome::Paused,
        },
        path: save_path.to_string(),
    }
}
