mod commands;
pub mod db;
pub mod error;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            let conn = db::connection::open_database(&app_data_dir)
                .expect("Failed to open database");

            db::migration::run_migrations(&conn)
                .expect("Failed to run database migrations");

            app.manage(AppState::new(conn));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::greet,
            commands::system::db_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
