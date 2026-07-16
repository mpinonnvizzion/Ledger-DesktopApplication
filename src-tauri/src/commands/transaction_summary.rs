use tauri::State;

use crate::error::CommandError;
use crate::models::transaction_summary::TransactionSummary;
use crate::repositories::transaction_summary::TransactionSummaryRepository;
use crate::state::AppState;

#[tauri::command]
pub fn get_transaction_summary(
    state: State<'_, AppState>,
    workspace_id: i64,
    date_from: String,
    date_to: String,
) -> Result<TransactionSummary, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = TransactionSummaryRepository::new(&conn);
    repo.monthly_summary(workspace_id, &date_from, &date_to)
        .map_err(|e| String::from(CommandError::from(e)))
}
