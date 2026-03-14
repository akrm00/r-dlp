mod commands;
mod services;
mod types;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::analyze::analyze_url,
            commands::download::download_video,
            commands::download::get_download_filename,
            commands::explorer::show_in_folder,
            commands::version::get_ytdlp_version,
            commands::setup::check_ytdlp_status,
            commands::setup::install_ytdlp,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
