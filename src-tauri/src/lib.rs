mod commands;
mod services;
mod types;

use services::download_registry::DownloadRegistry;
use services::{runtime::RuntimeCatalog, settings::SettingsStore};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(DownloadRegistry::new())
        .manage(RuntimeCatalog::default())
        .setup(|app| {
            app.manage(SettingsStore::new(
                app.path().app_config_dir()?.join("settings.json"),
            ));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::analyze::analyze_url,
            commands::download::download_video,
            commands::download::cancel_download,
            commands::download::pause_download,
            commands::download::discard_partial_download,
            commands::download::get_download_filename,
            commands::explorer::show_in_folder,
            commands::version::get_ytdlp_version,
            commands::setup::check_ytdlp_status,
            commands::setup::install_ytdlp,
            commands::setup::get_impersonation_capabilities,
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
