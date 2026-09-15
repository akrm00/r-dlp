use crate::services::runtime::{ImpersonationCapabilities, RuntimeCatalog};
use crate::services::ytdlp_setup;
use crate::types::YtdlpStatus;
use tauri::State;

#[tauri::command]
pub async fn check_ytdlp_status(catalog: State<'_, RuntimeCatalog>) -> Result<YtdlpStatus, String> {
    let runtime = catalog
        .runtimes()
        .await
        .into_iter()
        .find(|runtime| runtime.version.is_some());
    Ok(YtdlpStatus {
        installed: runtime.is_some(),
        version: runtime.as_ref().and_then(|runtime| runtime.version.clone()),
        path: runtime.map(|runtime| runtime.program),
    })
}

#[tauri::command]
pub async fn install_ytdlp(catalog: State<'_, RuntimeCatalog>) -> Result<String, String> {
    let result = ytdlp_setup::install().await.map_err(|e| e.to_string());
    catalog.invalidate().await;
    result
}

#[tauri::command]
pub async fn get_impersonation_capabilities(
    catalog: State<'_, RuntimeCatalog>,
    refresh: Option<bool>,
) -> Result<ImpersonationCapabilities, String> {
    Ok(catalog.capabilities(refresh.unwrap_or(false)).await)
}
