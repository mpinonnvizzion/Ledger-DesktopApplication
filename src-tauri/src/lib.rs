mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod repositories;
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
            commands::workspace::create_workspace,
            commands::workspace::get_workspace,
            commands::workspace::list_workspaces,
            commands::workspace::update_workspace,
            commands::workspace::delete_workspace,
            commands::account::create_account,
            commands::account::get_account,
            commands::account::list_accounts_by_workspace,
            commands::account::update_account,
            commands::account::delete_account,
            commands::category::create_category,
            commands::category::get_category,
            commands::category::list_categories_by_workspace,
            commands::category::update_category,
            commands::category::delete_category,
            commands::category::seed_default_categories,
            commands::transaction_summary::get_transaction_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
