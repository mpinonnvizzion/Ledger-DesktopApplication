use tauri::State;

use crate::error::CommandError;
use crate::models::category::{Category, CategoryType, CreateCategoryInput, UpdateCategoryInput};
use crate::repositories::category::CategoryRepository;
use crate::state::AppState;

#[tauri::command]
pub fn create_category(
    state: State<'_, AppState>,
    workspace_id: i64,
    name: String,
    category_type: CategoryType,
    parent_id: Option<i64>,
) -> Result<Category, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = CategoryRepository::new(&conn);
    let input = CreateCategoryInput {
        workspace_id,
        name,
        category_type,
        parent_id,
    };
    repo.create(input)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn get_category(state: State<'_, AppState>, id: i64) -> Result<Category, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = CategoryRepository::new(&conn);
    repo.get_by_id(id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn list_categories_by_workspace(
    state: State<'_, AppState>,
    workspace_id: i64,
) -> Result<Vec<Category>, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = CategoryRepository::new(&conn);
    repo.list_by_workspace(workspace_id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn update_category(
    state: State<'_, AppState>,
    id: i64,
    name: Option<String>,
    parent_id: Option<i64>,
) -> Result<Category, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = CategoryRepository::new(&conn);
    let input = UpdateCategoryInput { name, parent_id };
    repo.update(id, input)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn delete_category(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = CategoryRepository::new(&conn);
    repo.delete(id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn seed_default_categories(
    state: State<'_, AppState>,
    workspace_id: i64,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = CategoryRepository::new(&conn);
    repo.seed_defaults(workspace_id)
        .map_err(|e| String::from(CommandError::from(e)))
}
