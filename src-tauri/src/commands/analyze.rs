use crate::services::{
    execution::{build_plan, AttemptProgress},
    runtime::RuntimeCatalog,
    settings::SettingsStore,
};
use crate::services::{url_validator, ytdlp};
use crate::types::VideoInfo;
use tauri::{ipc::Channel, State};

#[tauri::command]
pub async fn analyze_url(
    url: String,
    settings: State<'_, SettingsStore>,
    catalog: State<'_, RuntimeCatalog>,
    on_attempt: Channel<AttemptProgress>,
) -> Result<VideoInfo, String> {
    let sanitized = url_validator::validate_url(&url).map_err(|e| e.to_string())?;
    let snapshot = settings.get().map_err(|e| e.to_string())?;
    let plan = build_plan(&snapshot, &sanitized, &catalog.runtimes().await, None)
        .map_err(|e| e.to_string())?;
    ytdlp::analyze(&sanitized, &plan, |progress| {
        let _ = on_attempt.send(progress);
    })
    .await
    .map_err(|e| e.to_string())
}
