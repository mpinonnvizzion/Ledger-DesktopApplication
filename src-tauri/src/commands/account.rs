use tauri::State;

use crate::error::CommandError;
use crate::models::account::{Account, AccountType, CreateAccountInput, UpdateAccountInput};
use crate::repositories::account::AccountRepository;
use crate::state::AppState;

#[tauri::command]
pub fn create_account(
    state: State<'_, AppState>,
    workspace_id: i64,
    name: String,
    account_type: AccountType,
    currency: Option<String>,
    institution_name: Option<String>,
) -> Result<Account, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = AccountRepository::new(&conn);
    let input = CreateAccountInput {
        workspace_id,
        name,
        account_type,
        currency,
        institution_name,
    };
    repo.create(input)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn get_account(state: State<'_, AppState>, id: i64) -> Result<Account, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = AccountRepository::new(&conn);
    repo.get_by_id(id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn list_accounts_by_workspace(
    state: State<'_, AppState>,
    workspace_id: i64,
) -> Result<Vec<Account>, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = AccountRepository::new(&conn);
    repo.list_by_workspace(workspace_id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn update_account(
    state: State<'_, AppState>,
    id: i64,
    name: Option<String>,
    institution_name: Option<String>,
    is_active: Option<bool>,
) -> Result<Account, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = AccountRepository::new(&conn);
    let input = UpdateAccountInput {
        name,
        institution_name,
        is_active,
    };
    repo.update(id, input)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn delete_account(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = AccountRepository::new(&conn);
    repo.delete(id)
        .map_err(|e| String::from(CommandError::from(e)))
}
