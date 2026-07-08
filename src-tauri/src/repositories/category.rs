use rusqlite::Connection;

use crate::error::DomainError;
use crate::models::category::{Category, CategoryType, CreateCategoryInput, UpdateCategoryInput};

const MAX_NAME_LENGTH: usize = 100;

pub struct CategoryRepository<'a> {
    conn: &'a Connection,
}

impl<'a> CategoryRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn create(&self, input: CreateCategoryInput) -> Result<Category, DomainError> {
        let name = input.name.trim().to_string();
        if name.is_empty() {
            return Err(DomainError::Validation("Category name cannot be empty.".into()));
        }
        if name.len() > MAX_NAME_LENGTH {
            return Err(DomainError::Validation(format!(
                "Category name cannot exceed {} characters.",
                MAX_NAME_LENGTH
            )));
        }

        let workspace_exists: bool = self
            .conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM workspaces WHERE id = ?1",
                rusqlite::params![input.workspace_id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !workspace_exists {
            return Err(DomainError::Validation("Workspace does not exist.".into()));
        }

        if let Some(parent_id) = input.parent_id {
            let parent_workspace: Option<i64> = self
                .conn
                .query_row(
                    "SELECT workspace_id FROM categories WHERE id = ?1",
                    rusqlite::params![parent_id],
                    |row| row.get(0),
                )
                .ok();

            match parent_workspace {
                None => {
                    return Err(DomainError::Validation("Parent category does not exist.".into()));
                }
                Some(pw_id) if pw_id != input.workspace_id => {
                    return Err(DomainError::Validation(
                        "Parent category must belong to the same workspace.".into(),
                    ));
                }
                _ => {}
            }
        }

        let category_type_str = input.category_type.as_str();

        let result = self.conn.execute(
            "INSERT INTO categories (workspace_id, name, category_type, parent_id) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![input.workspace_id, name, category_type_str, input.parent_id],
        );

        match result {
            Ok(_) => {}
            Err(rusqlite::Error::SqliteFailure(err, _))
                if err.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_UNIQUE =>
            {
                return Err(DomainError::Conflict(format!(
                    "A {} category named '{}' already exists in this workspace.",
                    category_type_str, name
                )));
            }
            Err(e) => return Err(DomainError::from(e)),
        }

        let id = self.conn.last_insert_rowid();
        self.get_by_id(id)
    }

    pub fn get_by_id(&self, id: i64) -> Result<Category, DomainError> {
        let category = self.conn.query_row(
            "SELECT id, workspace_id, name, category_type, parent_id, is_system, created_at, updated_at FROM categories WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Category {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    category_type: CategoryType::from_str(&row.get::<_, String>(3)?).unwrap_or(CategoryType::Expense),
                    parent_id: row.get(4)?,
                    is_system: row.get::<_, i32>(5)? != 0,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )?;
        Ok(category)
    }

    pub fn list_by_workspace(&self, workspace_id: i64) -> Result<Vec<Category>, DomainError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, name, category_type, parent_id, is_system, created_at, updated_at FROM categories WHERE workspace_id = ?1 ORDER BY category_type, name",
        )?;
        let categories = stmt
            .query_map(rusqlite::params![workspace_id], |row| {
                Ok(Category {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    category_type: CategoryType::from_str(&row.get::<_, String>(3)?).unwrap_or(CategoryType::Expense),
                    parent_id: row.get(4)?,
                    is_system: row.get::<_, i32>(5)? != 0,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(categories)
    }

    pub fn update(&self, id: i64, input: UpdateCategoryInput) -> Result<Category, DomainError> {
        let existing = self.get_by_id(id)?;

        if existing.is_system {
            if input.name.is_some() {
                return Err(DomainError::Validation(
                    "System categories cannot be renamed.".into(),
                ));
            }
        }

        let name = match input.name {
            Some(n) => {
                let trimmed = n.trim().to_string();
                if trimmed.is_empty() {
                    return Err(DomainError::Validation("Category name cannot be empty.".into()));
                }
                if trimmed.len() > MAX_NAME_LENGTH {
                    return Err(DomainError::Validation(format!(
                        "Category name cannot exceed {} characters.",
                        MAX_NAME_LENGTH
                    )));
                }
                trimmed
            }
            None => existing.name,
        };

        let parent_id = match input.parent_id {
            Some(pid) => {
                let parent_workspace: Option<i64> = self
                    .conn
                    .query_row(
                        "SELECT workspace_id FROM categories WHERE id = ?1",
                        rusqlite::params![pid],
                        |row| row.get(0),
                    )
                    .ok();

                match parent_workspace {
                    None => {
                        return Err(DomainError::Validation("Parent category does not exist.".into()));
                    }
                    Some(pw_id) if pw_id != existing.workspace_id => {
                        return Err(DomainError::Validation(
                            "Parent category must belong to the same workspace.".into(),
                        ));
                    }
                    _ => Some(pid),
                }
            }
            None => existing.parent_id,
        };

        let result = self.conn.execute(
            "UPDATE categories SET name = ?1, parent_id = ?2, updated_at = datetime('now') WHERE id = ?3",
            rusqlite::params![name, parent_id, id],
        );

        match result {
            Ok(_) => {}
            Err(rusqlite::Error::SqliteFailure(err, _))
                if err.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_UNIQUE =>
            {
                return Err(DomainError::Conflict(format!(
                    "A category named '{}' already exists in this workspace.",
                    name
                )));
            }
            Err(e) => return Err(DomainError::from(e)),
        }

        self.get_by_id(id)
    }

    pub fn delete(&self, id: i64) -> Result<(), DomainError> {
        let existing = self.get_by_id(id)?;
        if existing.is_system {
            return Err(DomainError::Validation("System categories cannot be deleted.".into()));
        }

        let rows = self.conn.execute("DELETE FROM categories WHERE id = ?1", rusqlite::params![id])?;
        if rows == 0 {
            return Err(DomainError::NotFound);
        }
        Ok(())
    }

    pub fn seed_defaults(&self, workspace_id: i64) -> Result<(), DomainError> {
        let workspace_exists: bool = self
            .conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM workspaces WHERE id = ?1",
                rusqlite::params![workspace_id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !workspace_exists {
            return Err(DomainError::Validation("Workspace does not exist.".into()));
        }

        let income_categories = ["Salary", "Freelance", "Investments", "Other Income"];
        let expense_categories = [
            "Housing",
            "Transportation",
            "Food & Dining",
            "Utilities",
            "Healthcare",
            "Entertainment",
            "Shopping",
            "Education",
            "Personal Care",
            "Insurance",
            "Savings & Investments",
            "Gifts & Donations",
            "Other Expense",
        ];

        for name in &income_categories {
            self.conn.execute(
                "INSERT OR IGNORE INTO categories (workspace_id, name, category_type, is_system) VALUES (?1, ?2, 'income', 1)",
                rusqlite::params![workspace_id, name],
            )?;
        }

        for name in &expense_categories {
            self.conn.execute(
                "INSERT OR IGNORE INTO categories (workspace_id, name, category_type, is_system) VALUES (?1, ?2, 'expense', 1)",
                rusqlite::params![workspace_id, name],
            )?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::workspace::{CreateWorkspaceInput, WorkspaceType};
    use crate::repositories::test_helpers::setup_test_db;
    use crate::repositories::workspace::WorkspaceRepository;

    fn create_test_workspace(conn: &Connection) -> i64 {
        let repo = WorkspaceRepository::new(conn);
        let ws = repo
            .create(CreateWorkspaceInput {
                name: "Test".to_string(),
                workspace_type: WorkspaceType::Personal,
                currency: None,
            })
            .unwrap();
        ws.id
    }

    #[test]
    fn create_category_with_valid_input() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        let cat = repo
            .create(CreateCategoryInput {
                workspace_id: ws_id,
                name: "Groceries".to_string(),
                category_type: CategoryType::Expense,
                parent_id: None,
            })
            .unwrap();

        assert_eq!(cat.name, "Groceries");
        assert_eq!(cat.category_type, CategoryType::Expense);
        assert_eq!(cat.workspace_id, ws_id);
        assert!(!cat.is_system);
    }

    #[test]
    fn create_category_fails_with_empty_name() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        let result = repo.create(CreateCategoryInput {
            workspace_id: ws_id,
            name: "  ".to_string(),
            category_type: CategoryType::Expense,
            parent_id: None,
        });
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_category_fails_with_nonexistent_workspace() {
        let conn = setup_test_db();
        let repo = CategoryRepository::new(&conn);

        let result = repo.create(CreateCategoryInput {
            workspace_id: 999,
            name: "Test".to_string(),
            category_type: CategoryType::Income,
            parent_id: None,
        });
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_duplicate_category_returns_conflict() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        repo.create(CreateCategoryInput {
            workspace_id: ws_id,
            name: "Food".to_string(),
            category_type: CategoryType::Expense,
            parent_id: None,
        })
        .unwrap();

        let result = repo.create(CreateCategoryInput {
            workspace_id: ws_id,
            name: "Food".to_string(),
            category_type: CategoryType::Expense,
            parent_id: None,
        });
        assert!(matches!(result, Err(DomainError::Conflict(_))));
    }

    #[test]
    fn create_category_with_parent_same_workspace() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        let parent = repo
            .create(CreateCategoryInput {
                workspace_id: ws_id,
                name: "Food".to_string(),
                category_type: CategoryType::Expense,
                parent_id: None,
            })
            .unwrap();

        let child = repo
            .create(CreateCategoryInput {
                workspace_id: ws_id,
                name: "Fast Food".to_string(),
                category_type: CategoryType::Expense,
                parent_id: Some(parent.id),
            })
            .unwrap();

        assert_eq!(child.parent_id, Some(parent.id));
    }

    #[test]
    fn create_category_with_parent_different_workspace_fails() {
        let conn = setup_test_db();
        let ws_repo = WorkspaceRepository::new(&conn);
        let ws1 = ws_repo
            .create(CreateWorkspaceInput {
                name: "WS1".to_string(),
                workspace_type: WorkspaceType::Personal,
                currency: None,
            })
            .unwrap();
        let ws2 = ws_repo
            .create(CreateWorkspaceInput {
                name: "WS2".to_string(),
                workspace_type: WorkspaceType::Business,
                currency: None,
            })
            .unwrap();

        let repo = CategoryRepository::new(&conn);
        let parent = repo
            .create(CreateCategoryInput {
                workspace_id: ws1.id,
                name: "Food".to_string(),
                category_type: CategoryType::Expense,
                parent_id: None,
            })
            .unwrap();

        let result = repo.create(CreateCategoryInput {
            workspace_id: ws2.id,
            name: "Sub Food".to_string(),
            category_type: CategoryType::Expense,
            parent_id: Some(parent.id),
        });
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn get_category_by_id() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        let cat = repo
            .create(CreateCategoryInput {
                workspace_id: ws_id,
                name: "Salary".to_string(),
                category_type: CategoryType::Income,
                parent_id: None,
            })
            .unwrap();

        let fetched = repo.get_by_id(cat.id).unwrap();
        assert_eq!(fetched.name, "Salary");
    }

    #[test]
    fn list_categories_by_workspace() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        repo.create(CreateCategoryInput {
            workspace_id: ws_id,
            name: "Food".to_string(),
            category_type: CategoryType::Expense,
            parent_id: None,
        })
        .unwrap();
        repo.create(CreateCategoryInput {
            workspace_id: ws_id,
            name: "Salary".to_string(),
            category_type: CategoryType::Income,
            parent_id: None,
        })
        .unwrap();

        let list = repo.list_by_workspace(ws_id).unwrap();
        assert_eq!(list.len(), 2);

        let empty = repo.list_by_workspace(999).unwrap();
        assert_eq!(empty.len(), 0);
    }

    #[test]
    fn update_category_name() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        let cat = repo
            .create(CreateCategoryInput {
                workspace_id: ws_id,
                name: "Old".to_string(),
                category_type: CategoryType::Expense,
                parent_id: None,
            })
            .unwrap();

        let updated = repo
            .update(cat.id, UpdateCategoryInput { name: Some("New".to_string()), parent_id: None })
            .unwrap();
        assert_eq!(updated.name, "New");
    }

    #[test]
    fn delete_non_system_category() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        let cat = repo
            .create(CreateCategoryInput {
                workspace_id: ws_id,
                name: "Custom".to_string(),
                category_type: CategoryType::Expense,
                parent_id: None,
            })
            .unwrap();

        repo.delete(cat.id).unwrap();
        let result = repo.get_by_id(cat.id);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn delete_system_category_fails() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        repo.seed_defaults(ws_id).unwrap();

        let categories = repo.list_by_workspace(ws_id).unwrap();
        let system_cat = categories.iter().find(|c| c.is_system).unwrap();

        let result = repo.delete(system_cat.id);
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn seed_defaults_creates_categories() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        repo.seed_defaults(ws_id).unwrap();

        let categories = repo.list_by_workspace(ws_id).unwrap();
        assert_eq!(categories.len(), 17); // 4 income + 13 expense
        assert!(categories.iter().all(|c| c.is_system));
    }

    #[test]
    fn seed_defaults_is_idempotent() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        repo.seed_defaults(ws_id).unwrap();
        repo.seed_defaults(ws_id).unwrap();

        let categories = repo.list_by_workspace(ws_id).unwrap();
        assert_eq!(categories.len(), 17);
    }

    #[test]
    fn delete_parent_category_nullifies_children() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = CategoryRepository::new(&conn);

        let parent = repo
            .create(CreateCategoryInput {
                workspace_id: ws_id,
                name: "Parent".to_string(),
                category_type: CategoryType::Expense,
                parent_id: None,
            })
            .unwrap();

        let child = repo
            .create(CreateCategoryInput {
                workspace_id: ws_id,
                name: "Child".to_string(),
                category_type: CategoryType::Expense,
                parent_id: Some(parent.id),
            })
            .unwrap();

        repo.delete(parent.id).unwrap();
        let updated_child = repo.get_by_id(child.id).unwrap();
        assert_eq!(updated_child.parent_id, None);
    }
}
