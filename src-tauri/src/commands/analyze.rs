use crate::services::{url_validator, ytdlp};
use crate::types::VideoInfo;

#[tauri::command]
pub async fn analyze_url(url: String) -> Result<VideoInfo, String> {
    let sanitized = url_validator::validate_url(&url).map_err(|e| e.to_string())?;

    ytdlp::analyze(&sanitized)
        .await
        .map_err(|e| e.to_string())
}
