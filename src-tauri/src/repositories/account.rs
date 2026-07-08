use rusqlite::Connection;

use crate::error::DomainError;
use crate::models::account::{Account, AccountType, CreateAccountInput, UpdateAccountInput};

const MAX_NAME_LENGTH: usize = 100;

pub struct AccountRepository<'a> {
    conn: &'a Connection,
}

impl<'a> AccountRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn create(&self, input: CreateAccountInput) -> Result<Account, DomainError> {
        let name = input.name.trim().to_string();
        if name.is_empty() {
            return Err(DomainError::Validation("Account name cannot be empty.".into()));
        }
        if name.len() > MAX_NAME_LENGTH {
            return Err(DomainError::Validation(format!(
                "Account name cannot exceed {} characters.",
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

        let currency = match input.currency {
            Some(c) => c,
            None => {
                self.conn.query_row(
                    "SELECT currency FROM workspaces WHERE id = ?1",
                    rusqlite::params![input.workspace_id],
                    |row| row.get(0),
                )?
            }
        };

        let account_type_str = input.account_type.as_str();

        self.conn.execute(
            "INSERT INTO accounts (workspace_id, name, account_type, currency, institution_name) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![input.workspace_id, name, account_type_str, currency, input.institution_name],
        )?;

        let id = self.conn.last_insert_rowid();
        self.get_by_id(id)
    }

    pub fn get_by_id(&self, id: i64) -> Result<Account, DomainError> {
        let account = self.conn.query_row(
            "SELECT id, workspace_id, name, account_type, currency, balance, institution_name, is_active, created_at, updated_at FROM accounts WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Account {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    account_type: AccountType::from_str(&row.get::<_, String>(3)?).unwrap_or(AccountType::Other),
                    currency: row.get(4)?,
                    balance: row.get(5)?,
                    institution_name: row.get(6)?,
                    is_active: row.get::<_, i32>(7)? != 0,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            },
        )?;
        Ok(account)
    }

    pub fn list_by_workspace(&self, workspace_id: i64) -> Result<Vec<Account>, DomainError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, name, account_type, currency, balance, institution_name, is_active, created_at, updated_at FROM accounts WHERE workspace_id = ?1 ORDER BY id",
        )?;
        let accounts = stmt
            .query_map(rusqlite::params![workspace_id], |row| {
                Ok(Account {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    account_type: AccountType::from_str(&row.get::<_, String>(3)?).unwrap_or(AccountType::Other),
                    currency: row.get(4)?,
                    balance: row.get(5)?,
                    institution_name: row.get(6)?,
                    is_active: row.get::<_, i32>(7)? != 0,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(accounts)
    }

    pub fn update(&self, id: i64, input: UpdateAccountInput) -> Result<Account, DomainError> {
        let existing = self.get_by_id(id)?;

        let name = match input.name {
            Some(n) => {
                let trimmed = n.trim().to_string();
                if trimmed.is_empty() {
                    return Err(DomainError::Validation("Account name cannot be empty.".into()));
                }
                if trimmed.len() > MAX_NAME_LENGTH {
                    return Err(DomainError::Validation(format!(
                        "Account name cannot exceed {} characters.",
                        MAX_NAME_LENGTH
                    )));
                }
                trimmed
            }
            None => existing.name,
        };

        let institution_name = match input.institution_name {
            Some(i) => Some(i),
            None => existing.institution_name,
        };

        let is_active: i32 = match input.is_active {
            Some(a) => if a { 1 } else { 0 },
            None => if existing.is_active { 1 } else { 0 },
        };

        self.conn.execute(
            "UPDATE accounts SET name = ?1, institution_name = ?2, is_active = ?3, updated_at = datetime('now') WHERE id = ?4",
            rusqlite::params![name, institution_name, is_active, id],
        )?;

        self.get_by_id(id)
    }

    pub fn delete(&self, id: i64) -> Result<(), DomainError> {
        let rows = self.conn.execute("DELETE FROM accounts WHERE id = ?1", rusqlite::params![id])?;
        if rows == 0 {
            return Err(DomainError::NotFound);
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
    fn create_account_with_valid_input() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = AccountRepository::new(&conn);

        let account = repo
            .create(CreateAccountInput {
                workspace_id: ws_id,
                name: "Checking".to_string(),
                account_type: AccountType::Checking,
                currency: None,
                institution_name: Some("Chase".to_string()),
            })
            .unwrap();

        assert_eq!(account.name, "Checking");
        assert_eq!(account.account_type, AccountType::Checking);
        assert_eq!(account.currency, "USD");
        assert_eq!(account.balance, 0);
        assert_eq!(account.institution_name, Some("Chase".to_string()));
        assert!(account.is_active);
    }

    #[test]
    fn create_account_fails_with_empty_name() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = AccountRepository::new(&conn);

        let result = repo.create(CreateAccountInput {
            workspace_id: ws_id,
            name: "".to_string(),
            account_type: AccountType::Savings,
            currency: None,
            institution_name: None,
        });
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_account_fails_with_nonexistent_workspace() {
        let conn = setup_test_db();
        let repo = AccountRepository::new(&conn);

        let result = repo.create(CreateAccountInput {
            workspace_id: 999,
            name: "Checking".to_string(),
            account_type: AccountType::Checking,
            currency: None,
            institution_name: None,
        });
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_account_defaults_balance_to_zero() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = AccountRepository::new(&conn);

        let account = repo
            .create(CreateAccountInput {
                workspace_id: ws_id,
                name: "Savings".to_string(),
                account_type: AccountType::Savings,
                currency: None,
                institution_name: None,
            })
            .unwrap();

        assert_eq!(account.balance, 0);
    }

    #[test]
    fn get_account_by_id() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = AccountRepository::new(&conn);

        let created = repo
            .create(CreateAccountInput {
                workspace_id: ws_id,
                name: "Cash".to_string(),
                account_type: AccountType::Cash,
                currency: None,
                institution_name: None,
            })
            .unwrap();

        let fetched = repo.get_by_id(created.id).unwrap();
        assert_eq!(fetched.name, "Cash");
    }

    #[test]
    fn get_nonexistent_account_returns_not_found() {
        let conn = setup_test_db();
        let repo = AccountRepository::new(&conn);
        let result = repo.get_by_id(999);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn list_accounts_by_workspace() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = AccountRepository::new(&conn);

        repo.create(CreateAccountInput {
            workspace_id: ws_id,
            name: "Checking".to_string(),
            account_type: AccountType::Checking,
            currency: None,
            institution_name: None,
        })
        .unwrap();
        repo.create(CreateAccountInput {
            workspace_id: ws_id,
            name: "Savings".to_string(),
            account_type: AccountType::Savings,
            currency: None,
            institution_name: None,
        })
        .unwrap();

        let list = repo.list_by_workspace(ws_id).unwrap();
        assert_eq!(list.len(), 2);

        let other_list = repo.list_by_workspace(999).unwrap();
        assert_eq!(other_list.len(), 0);
    }

    #[test]
    fn update_account_name() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = AccountRepository::new(&conn);

        let account = repo
            .create(CreateAccountInput {
                workspace_id: ws_id,
                name: "Old Name".to_string(),
                account_type: AccountType::Checking,
                currency: None,
                institution_name: None,
            })
            .unwrap();

        let updated = repo
            .update(
                account.id,
                UpdateAccountInput {
                    name: Some("New Name".to_string()),
                    institution_name: None,
                    is_active: None,
                },
            )
            .unwrap();

        assert_eq!(updated.name, "New Name");
    }

    #[test]
    fn update_account_is_active() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = AccountRepository::new(&conn);

        let account = repo
            .create(CreateAccountInput {
                workspace_id: ws_id,
                name: "Test".to_string(),
                account_type: AccountType::Checking,
                currency: None,
                institution_name: None,
            })
            .unwrap();
        assert!(account.is_active);

        let updated = repo
            .update(
                account.id,
                UpdateAccountInput {
                    name: None,
                    institution_name: None,
                    is_active: Some(false),
                },
            )
            .unwrap();
        assert!(!updated.is_active);
    }

    #[test]
    fn delete_account() {
        let conn = setup_test_db();
        let ws_id = create_test_workspace(&conn);
        let repo = AccountRepository::new(&conn);

        let account = repo
            .create(CreateAccountInput {
                workspace_id: ws_id,
                name: "To Delete".to_string(),
                account_type: AccountType::Cash,
                currency: None,
                institution_name: None,
            })
            .unwrap();

        repo.delete(account.id).unwrap();
        let result = repo.get_by_id(account.id);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn delete_nonexistent_account_returns_not_found() {
        let conn = setup_test_db();
        let repo = AccountRepository::new(&conn);
        let result = repo.delete(999);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }
}
