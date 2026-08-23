use crate::services::ytdlp_setup;
use crate::types::{UpdateCheckResult, YtdlpStatus};

#[tauri::command]
pub async fn check_ytdlp_status() -> Result<YtdlpStatus, String> {
    let (installed, version, path, managed) = ytdlp_setup::check_installed().await;

    Ok(YtdlpStatus {
        installed,
        version,
        path,
        managed,
    })
}

#[tauri::command]
pub async fn install_ytdlp() -> Result<String, String> {
    ytdlp_setup::install().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_ytdlp_update(force: bool) -> Result<UpdateCheckResult, String> {
    ytdlp_setup::check_for_update(force)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_ytdlp() -> Result<String, String> {
    ytdlp_setup::update().await.map_err(|e| e.to_string())
}
