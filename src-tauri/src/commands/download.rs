use crate::services::ytdlp;
use std::path::PathBuf;

#[tauri::command]
pub async fn get_download_filename(url: String, format_id: String) -> Result<String, String> {
    ytdlp::get_filename(&url, &format_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_video(
    url: String,
    format_id: String,
    save_path: String,
) -> Result<String, String> {
    let output_path = PathBuf::from(&save_path);

    ytdlp::download_to_file(&url, &format_id, &output_path)
        .await
        .map_err(|e| e.to_string())?;

    Ok(save_path)
}
