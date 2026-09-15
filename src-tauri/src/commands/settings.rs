use crate::services::settings::{AppSettings, SettingsStore};
use tauri::State;

#[tauri::command]
pub fn get_settings(store: State<'_, SettingsStore>) -> Result<AppSettings, String> {
    store.get().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_settings(
    store: State<'_, SettingsStore>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    store.update(settings).map_err(|error| error.to_string())
}
