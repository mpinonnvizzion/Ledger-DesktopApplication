use tauri::State;

use crate::error::CommandError;
use crate::models::transaction::{
    CreateTransactionInput, Direction, Transaction, TransactionListResult, TransactionQuery,
    TransactionSource, TransactionStatus, UpdateTransactionInput,
};
use crate::repositories::transaction::TransactionRepository;
use crate::state::AppState;

#[tauri::command]
pub fn create_transaction(
    state: State<'_, AppState>,
    workspace_id: i64,
    account_id: i64,
    category_id: Option<i64>,
    amount_minor: i64,
    description: String,
    date: String,
    notes: Option<String>,
    status: Option<TransactionStatus>,
    source: Option<TransactionSource>,
) -> Result<Transaction, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionRepository::new(&conn);
    let input = CreateTransactionInput {
        workspace_id,
        account_id,
        category_id,
        amount_minor,
        description,
        date,
        notes,
        status,
        source,
    };
    repo.create(input)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn get_transaction(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Transaction, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionRepository::new(&conn);
    repo.get_by_id(id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn update_transaction(
    state: State<'_, AppState>,
    id: i64,
    account_id: Option<i64>,
    category_id: Option<Option<i64>>,
    amount_minor: Option<i64>,
    description: Option<String>,
    date: Option<String>,
    notes: Option<Option<String>>,
    status: Option<TransactionStatus>,
) -> Result<Transaction, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionRepository::new(&conn);
    let input = UpdateTransactionInput {
        account_id,
        category_id,
        amount_minor,
        description,
        date,
        notes,
        status,
    };
    repo.update(id, input)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn delete_transaction(
    state: State<'_, AppState>,
    id: i64,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionRepository::new(&conn);
    repo.delete(id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn list_transactions(
    state: State<'_, AppState>,
    workspace_id: i64,
    account_id: Option<i64>,
    category_id: Option<i64>,
    date_from: Option<String>,
    date_to: Option<String>,
    search: Option<String>,
    amount_min: Option<i64>,
    amount_max: Option<i64>,
    direction: Option<Direction>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<TransactionListResult, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionRepository::new(&conn);
    let query = TransactionQuery {
        workspace_id,
        account_id,
        category_id,
        date_from,
        date_to,
        search,
        amount_min,
        amount_max,
        direction,
        limit,
        offset,
    };
    repo.list(query)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn create_transaction_batch(
    state: State<'_, AppState>,
    transactions: Vec<CreateTransactionInput>,
) -> Result<Vec<Transaction>, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionRepository::new(&conn);
    repo.create_batch(transactions)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn get_account_balance(
    state: State<'_, AppState>,
    account_id: i64,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionRepository::new(&conn);
    repo.get_account_balance(account_id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn verify_account_balance(
    state: State<'_, AppState>,
    account_id: i64,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionRepository::new(&conn);
    repo.verify_balance(account_id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn rebuild_account_balance(
    state: State<'_, AppState>,
    account_id: i64,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionRepository::new(&conn);
    repo.rebuild_balance(account_id)
        .map_err(|e| String::from(CommandError::from(e)))
}
