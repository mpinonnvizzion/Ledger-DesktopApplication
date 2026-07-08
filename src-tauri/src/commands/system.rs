use serde::Serialize;
use tauri::{Manager, State};

use crate::db::connection::{verify_foreign_keys, verify_wal_mode};
use crate::db::migration::get_schema_version;
use crate::state::AppState;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Ledger Desktop is running.", name)
}

#[derive(Serialize)]
pub struct DatabaseInfo {
    pub path: String,
    pub schema_version: i64,
    pub wal_mode: bool,
    pub foreign_keys: bool,
}

#[tauri::command]
pub fn db_info(state: State<'_, AppState>, app: tauri::AppHandle) -> Result<DatabaseInfo, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;

    let path = app
        .path()
        .app_data_dir()
        .map(|p| p.join("ledger.db").to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    let schema_version = get_schema_version(&conn).map_err(|e| format!("{}", e))?;
    let wal_mode = verify_wal_mode(&conn).is_ok();
    let foreign_keys = verify_foreign_keys(&conn).is_ok();

    Ok(DatabaseInfo {
        path,
        schema_version,
        wal_mode,
        foreign_keys,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_returns_expected_message() {
        let result = greet("Alice");
        assert_eq!(result, "Hello, Alice! Ledger Desktop is running.");
    }
}
