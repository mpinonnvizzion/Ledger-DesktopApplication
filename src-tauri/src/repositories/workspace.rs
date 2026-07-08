use rusqlite::Connection;

use crate::error::DomainError;
use crate::models::workspace::{CreateWorkspaceInput, UpdateWorkspaceInput, Workspace, WorkspaceType};

const MAX_NAME_LENGTH: usize = 100;

pub struct WorkspaceRepository<'a> {
    conn: &'a Connection,
}

impl<'a> WorkspaceRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn create(&self, input: CreateWorkspaceInput) -> Result<Workspace, DomainError> {
        let name = input.name.trim().to_string();
        if name.is_empty() {
            return Err(DomainError::Validation("Workspace name cannot be empty.".into()));
        }
        if name.len() > MAX_NAME_LENGTH {
            return Err(DomainError::Validation(format!(
                "Workspace name cannot exceed {} characters.",
                MAX_NAME_LENGTH
            )));
        }

        let currency = input.currency.unwrap_or_else(|| "USD".to_string());
        let workspace_type_str = input.workspace_type.as_str();

        self.conn.execute(
            "INSERT INTO workspaces (name, workspace_type, currency) VALUES (?1, ?2, ?3)",
            rusqlite::params![name, workspace_type_str, currency],
        )?;

        let id = self.conn.last_insert_rowid();
        self.get_by_id(id)
    }

    pub fn get_by_id(&self, id: i64) -> Result<Workspace, DomainError> {
        let workspace = self.conn.query_row(
            "SELECT id, name, workspace_type, currency, created_at, updated_at FROM workspaces WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Workspace {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    workspace_type: WorkspaceType::from_str(&row.get::<_, String>(2)?).unwrap_or(WorkspaceType::Personal),
                    currency: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )?;
        Ok(workspace)
    }

    pub fn list(&self) -> Result<Vec<Workspace>, DomainError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, workspace_type, currency, created_at, updated_at FROM workspaces ORDER BY id",
        )?;
        let workspaces = stmt
            .query_map([], |row| {
                Ok(Workspace {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    workspace_type: WorkspaceType::from_str(&row.get::<_, String>(2)?).unwrap_or(WorkspaceType::Personal),
                    currency: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(workspaces)
    }

    pub fn update(&self, id: i64, input: UpdateWorkspaceInput) -> Result<Workspace, DomainError> {
        let existing = self.get_by_id(id)?;

        let name = match input.name {
            Some(n) => {
                let trimmed = n.trim().to_string();
                if trimmed.is_empty() {
                    return Err(DomainError::Validation("Workspace name cannot be empty.".into()));
                }
                if trimmed.len() > MAX_NAME_LENGTH {
                    return Err(DomainError::Validation(format!(
                        "Workspace name cannot exceed {} characters.",
                        MAX_NAME_LENGTH
                    )));
                }
                trimmed
            }
            None => existing.name,
        };

        let currency = input.currency.unwrap_or(existing.currency);

        self.conn.execute(
            "UPDATE workspaces SET name = ?1, currency = ?2, updated_at = datetime('now') WHERE id = ?3",
            rusqlite::params![name, currency, id],
        )?;

        self.get_by_id(id)
    }

    pub fn delete(&self, id: i64) -> Result<(), DomainError> {
        let rows = self.conn.execute("DELETE FROM workspaces WHERE id = ?1", rusqlite::params![id])?;
        if rows == 0 {
            return Err(DomainError::NotFound);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::test_helpers::setup_test_db;

    fn create_test_workspace(conn: &Connection) -> Workspace {
        let repo = WorkspaceRepository::new(conn);
        repo.create(CreateWorkspaceInput {
            name: "Test Workspace".to_string(),
            workspace_type: WorkspaceType::Personal,
            currency: None,
        })
        .unwrap()
    }

    #[test]
    fn create_workspace_with_valid_input() {
        let conn = setup_test_db();
        let repo = WorkspaceRepository::new(&conn);
        let ws = repo
            .create(CreateWorkspaceInput {
                name: "My Finances".to_string(),
                workspace_type: WorkspaceType::Personal,
                currency: Some("EUR".to_string()),
            })
            .unwrap();

        assert_eq!(ws.name, "My Finances");
        assert_eq!(ws.workspace_type, WorkspaceType::Personal);
        assert_eq!(ws.currency, "EUR");
        assert!(ws.id > 0);
    }

    #[test]
    fn create_workspace_fails_with_empty_name() {
        let conn = setup_test_db();
        let repo = WorkspaceRepository::new(&conn);
        let result = repo.create(CreateWorkspaceInput {
            name: "   ".to_string(),
            workspace_type: WorkspaceType::Business,
            currency: None,
        });
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_workspace_fails_with_long_name() {
        let conn = setup_test_db();
        let repo = WorkspaceRepository::new(&conn);
        let long_name = "a".repeat(101);
        let result = repo.create(CreateWorkspaceInput {
            name: long_name,
            workspace_type: WorkspaceType::Personal,
            currency: None,
        });
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn get_workspace_by_id() {
        let conn = setup_test_db();
        let ws = create_test_workspace(&conn);
        let repo = WorkspaceRepository::new(&conn);
        let fetched = repo.get_by_id(ws.id).unwrap();
        assert_eq!(fetched.name, "Test Workspace");
    }

    #[test]
    fn get_nonexistent_workspace_returns_not_found() {
        let conn = setup_test_db();
        let repo = WorkspaceRepository::new(&conn);
        let result = repo.get_by_id(999);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn list_workspaces() {
        let conn = setup_test_db();
        let repo = WorkspaceRepository::new(&conn);
        repo.create(CreateWorkspaceInput {
            name: "First".to_string(),
            workspace_type: WorkspaceType::Personal,
            currency: None,
        })
        .unwrap();
        repo.create(CreateWorkspaceInput {
            name: "Second".to_string(),
            workspace_type: WorkspaceType::Business,
            currency: None,
        })
        .unwrap();

        let list = repo.list().unwrap();
        assert_eq!(list.len(), 2);
    }

    #[test]
    fn update_workspace_name() {
        let conn = setup_test_db();
        let ws = create_test_workspace(&conn);
        let repo = WorkspaceRepository::new(&conn);
        let updated = repo
            .update(
                ws.id,
                UpdateWorkspaceInput {
                    name: Some("Renamed".to_string()),
                    currency: None,
                },
            )
            .unwrap();
        assert_eq!(updated.name, "Renamed");
        // Verify the row was actually updated by re-fetching
        let fetched = repo.get_by_id(ws.id).unwrap();
        assert_eq!(fetched.name, "Renamed");
    }

    #[test]
    fn update_workspace_with_empty_name_fails() {
        let conn = setup_test_db();
        let ws = create_test_workspace(&conn);
        let repo = WorkspaceRepository::new(&conn);
        let result = repo.update(
            ws.id,
            UpdateWorkspaceInput {
                name: Some("".to_string()),
                currency: None,
            },
        );
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn delete_workspace() {
        let conn = setup_test_db();
        let ws = create_test_workspace(&conn);
        let repo = WorkspaceRepository::new(&conn);
        repo.delete(ws.id).unwrap();
        let result = repo.get_by_id(ws.id);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn delete_workspace_cascades_to_accounts_and_categories() {
        let conn = setup_test_db();
        let ws = create_test_workspace(&conn);

        conn.execute(
            "INSERT INTO accounts (workspace_id, name, account_type) VALUES (?1, 'Checking', 'checking')",
            rusqlite::params![ws.id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO categories (workspace_id, name, category_type) VALUES (?1, 'Salary', 'income')",
            rusqlite::params![ws.id],
        )
        .unwrap();

        let repo = WorkspaceRepository::new(&conn);
        repo.delete(ws.id).unwrap();

        let account_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM accounts WHERE workspace_id = ?1", rusqlite::params![ws.id], |row| row.get(0))
            .unwrap();
        let category_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM categories WHERE workspace_id = ?1", rusqlite::params![ws.id], |row| row.get(0))
            .unwrap();
        assert_eq!(account_count, 0);
        assert_eq!(category_count, 0);
    }
}
