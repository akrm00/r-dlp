use crate::services::ytdlp;

#[tauri::command]
pub async fn get_ytdlp_version() -> Result<String, String> {
    ytdlp::get_version().await.map_err(|e| e.to_string())
}
