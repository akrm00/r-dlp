use crate::services::ytdlp_setup;
use crate::types::YtdlpStatus;

#[tauri::command]
pub async fn check_ytdlp_status() -> Result<YtdlpStatus, String> {
    let (installed, version, path) = ytdlp_setup::check_installed().await;

    Ok(YtdlpStatus {
        installed,
        version,
        path,
    })
}

#[tauri::command]
pub async fn install_ytdlp() -> Result<String, String> {
    ytdlp_setup::install().await.map_err(|e| e.to_string())
}
