use crate::services::runtime::RuntimeCatalog;
use tauri::State;

#[tauri::command]
pub async fn get_ytdlp_version(catalog: State<'_, RuntimeCatalog>) -> Result<String, String> {
    catalog
        .runtimes()
        .await
        .into_iter()
        .find_map(|runtime| runtime.version)
        .ok_or_else(|| "No working yt-dlp installation found".into())
}
