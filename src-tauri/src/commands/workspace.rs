use tauri::State;

use crate::error::CommandError;
use crate::models::workspace::{CreateWorkspaceInput, UpdateWorkspaceInput, Workspace, WorkspaceType};
use crate::repositories::workspace::WorkspaceRepository;
use crate::state::AppState;

#[tauri::command]
pub fn create_workspace(
    state: State<'_, AppState>,
    name: String,
    workspace_type: WorkspaceType,
    currency: Option<String>,
) -> Result<Workspace, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = WorkspaceRepository::new(&conn);
    let input = CreateWorkspaceInput {
        name,
        workspace_type,
        currency,
    };
    repo.create(input)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn get_workspace(state: State<'_, AppState>, id: i64) -> Result<Workspace, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = WorkspaceRepository::new(&conn);
    repo.get_by_id(id)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn list_workspaces(state: State<'_, AppState>) -> Result<Vec<Workspace>, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = WorkspaceRepository::new(&conn);
    repo.list()
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn update_workspace(
    state: State<'_, AppState>,
    id: i64,
    name: Option<String>,
    currency: Option<String>,
) -> Result<Workspace, String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = WorkspaceRepository::new(&conn);
    let input = UpdateWorkspaceInput { name, currency };
    repo.update(id, input)
        .map_err(|e| String::from(CommandError::from(e)))
}

#[tauri::command]
pub fn delete_workspace(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let repo = WorkspaceRepository::new(&conn);
    repo.delete(id)
        .map_err(|e| String::from(CommandError::from(e)))
}
