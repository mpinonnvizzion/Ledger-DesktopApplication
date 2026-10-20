use tauri::State;

use crate::error::CommandError;
use crate::models::budget::{Budget, CategorySpending, CreateBudgetInput};
use crate::repositories::budget::BudgetRepository;
use crate::state::AppState;

#[tauri::command]
pub fn create_budget(
    state: State<'_, AppState>,
    workspace_id: i64,
    category_id: i64,
    amount_minor: i64,
    month: i64,
    year: i64,
) -> Result<Budget, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = BudgetRepository::new(&conn);
    let input = CreateBudgetInput {
        workspace_id,
        category_id,
        amount_minor,
        month,
        year,
    };
    repo.create(input)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn list_budgets(
    state: State<'_, AppState>,
    workspace_id: i64,
    month: i64,
    year: i64,
) -> Result<Vec<Budget>, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = BudgetRepository::new(&conn);
    repo.list_by_workspace_month(workspace_id, month, year)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn update_budget(
    state: State<'_, AppState>,
    id: i64,
    amount_minor: i64,
) -> Result<Budget, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = BudgetRepository::new(&conn);
    repo.update(id, amount_minor)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn delete_budget(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = BudgetRepository::new(&conn);
    repo.delete(id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn get_category_spending(
    state: State<'_, AppState>,
    workspace_id: i64,
    month: i64,
    year: i64,
) -> Result<Vec<CategorySpending>, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = BudgetRepository::new(&conn);
    repo.get_category_spending(workspace_id, month, year)
        .map_err(|e| String::from(CommandError::from(e)))
}
