use rusqlite::Connection;

use crate::error::DomainError;
use crate::models::budget::{Budget, CategorySpending, CreateBudgetInput};

fn last_day_of_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
                29
            } else {
                28
            }
        }
        _ => 31,
    }
}

pub struct BudgetRepository<'a> {
    conn: &'a Connection,
}

impl<'a> BudgetRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn create(&self, input: CreateBudgetInput) -> Result<Budget, DomainError> {
        if input.amount_minor <= 0 {
            return Err(DomainError::Validation(
                "Budget amount must be greater than zero.".into(),
            ));
        }
        if input.month < 1 || input.month > 12 {
            return Err(DomainError::Validation(
                "Month must be between 1 and 12.".into(),
            ));
        }
        if input.year < 1900 || input.year > 2999 {
            return Err(DomainError::Validation(
                "Year must be between 1900 and 2999.".into(),
            ));
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
            return Err(DomainError::Validation(
                "Workspace does not exist.".into(),
            ));
        }

        let category_type: Option<String> = self
            .conn
            .query_row(
                "SELECT category_type FROM categories WHERE id = ?1 AND workspace_id = ?2",
                rusqlite::params![input.category_id, input.workspace_id],
                |row| row.get(0),
            )
            .ok();

        match category_type.as_deref() {
            None => {
                return Err(DomainError::Validation(
                    "Category does not exist in this workspace.".into(),
                ));
            }
            Some("income") => {
                return Err(DomainError::Validation(
                    "Budgets can only be set for expense categories.".into(),
                ));
            }
            _ => {}
        }

        let result = self.conn.execute(
            "INSERT INTO budgets (workspace_id, category_id, amount_minor, month, year) \
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                input.workspace_id,
                input.category_id,
                input.amount_minor,
                input.month,
                input.year,
            ],
        );

        match result {
            Ok(_) => {}
            Err(rusqlite::Error::SqliteFailure(err, _))
                if err.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_UNIQUE =>
            {
                return Err(DomainError::Conflict(
                    "A budget already exists for this category in this month.".into(),
                ));
            }
            Err(e) => return Err(DomainError::from(e)),
        }

        let id = self.conn.last_insert_rowid();
        self.get_by_id(id)
    }

    pub fn get_by_id(&self, id: i64) -> Result<Budget, DomainError> {
        let budget = self.conn.query_row(
            "SELECT id, workspace_id, category_id, amount_minor, month, year, created_at, updated_at \
             FROM budgets WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Budget {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    category_id: row.get(2)?,
                    amount_minor: row.get(3)?,
                    month: row.get(4)?,
                    year: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )?;
        Ok(budget)
    }

    pub fn list_by_workspace_month(
        &self,
        workspace_id: i64,
        month: i64,
        year: i64,
    ) -> Result<Vec<Budget>, DomainError> {
        let mut stmt = self.conn.prepare(
            "SELECT b.id, b.workspace_id, b.category_id, b.amount_minor, b.month, b.year, \
                    b.created_at, b.updated_at \
             FROM budgets b \
             JOIN categories c ON b.category_id = c.id \
             WHERE b.workspace_id = ?1 AND b.month = ?2 AND b.year = ?3 \
             ORDER BY c.name",
        )?;

        let rows = stmt.query_map(
            rusqlite::params![workspace_id, month, year],
            |row| {
                Ok(Budget {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    category_id: row.get(2)?,
                    amount_minor: row.get(3)?,
                    month: row.get(4)?,
                    year: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )?;

        let mut budgets = Vec::new();
        for row in rows {
            budgets.push(row?);
        }
        Ok(budgets)
    }

    pub fn update(&self, id: i64, amount_minor: i64) -> Result<Budget, DomainError> {
        if amount_minor <= 0 {
            return Err(DomainError::Validation(
                "Budget amount must be greater than zero.".into(),
            ));
        }

        let exists: bool = self
            .conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM budgets WHERE id = ?1",
                rusqlite::params![id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !exists {
            return Err(DomainError::NotFound);
        }

        self.conn.execute(
            "UPDATE budgets SET amount_minor = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![amount_minor, id],
        )?;

        self.get_by_id(id)
    }

    pub fn delete(&self, id: i64) -> Result<(), DomainError> {
        let rows = self.conn.execute(
            "DELETE FROM budgets WHERE id = ?1",
            rusqlite::params![id],
        )?;

        if rows == 0 {
            return Err(DomainError::NotFound);
        }
        Ok(())
    }

    pub fn get_category_spending(
        &self,
        workspace_id: i64,
        month: i64,
        year: i64,
    ) -> Result<Vec<CategorySpending>, DomainError> {
        let last_day = last_day_of_month(year, month);
        let date_from = format!("{:04}-{:02}-01", year, month);
        let date_to = format!("{:04}-{:02}-{:02}", year, month, last_day);

        let mut stmt = self.conn.prepare(
            "SELECT category_id, COALESCE(SUM(ABS(amount_minor)), 0) AS spent_minor \
             FROM transactions \
             WHERE workspace_id = ?1 \
               AND date >= ?2 AND date <= ?3 \
               AND amount_minor < 0 \
               AND category_id IS NOT NULL \
             GROUP BY category_id",
        )?;

        let rows = stmt.query_map(
            rusqlite::params![workspace_id, date_from, date_to],
            |row| {
                Ok(CategorySpending {
                    category_id: row.get(0)?,
                    spent_minor: row.get(1)?,
                })
            },
        )?;

        let mut spending = Vec::new();
        for row in rows {
            spending.push(row?);
        }
        Ok(spending)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::account::{AccountType, CreateAccountInput};
    use crate::models::category::CreateCategoryInput;
    use crate::models::workspace::{CreateWorkspaceInput, WorkspaceType};
    use crate::repositories::account::AccountRepository;
    use crate::repositories::category::CategoryRepository;
    use crate::repositories::test_helpers::setup_test_db;
    use crate::repositories::workspace::WorkspaceRepository;

    struct TestFixture {
        workspace_id: i64,
        expense_category_id: i64,
        income_category_id: i64,
        account_id: i64,
    }

    fn setup_fixture(conn: &Connection) -> TestFixture {
        let ws_repo = WorkspaceRepository::new(conn);
        let ws = ws_repo
            .create(CreateWorkspaceInput {
                name: "Test".to_string(),
                workspace_type: WorkspaceType::Personal,
                currency: None,
            })
            .unwrap();

        let cat_repo = CategoryRepository::new(conn);
        let expense_cat = cat_repo
            .create(CreateCategoryInput {
                workspace_id: ws.id,
                name: "Food".to_string(),
                category_type: crate::models::category::CategoryType::Expense,
                parent_id: None,
            })
            .unwrap();

        let income_cat = cat_repo
            .create(CreateCategoryInput {
                workspace_id: ws.id,
                name: "Salary".to_string(),
                category_type: crate::models::category::CategoryType::Income,
                parent_id: None,
            })
            .unwrap();

        let acct_repo = AccountRepository::new(conn);
        let acct = acct_repo
            .create(CreateAccountInput {
                workspace_id: ws.id,
                name: "Checking".to_string(),
                account_type: AccountType::Checking,
                currency: None,
                institution_name: None,
            })
            .unwrap();

        TestFixture {
            workspace_id: ws.id,
            expense_category_id: expense_cat.id,
            income_category_id: income_cat.id,
            account_id: acct.id,
        }
    }

    #[test]
    fn create_budget() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let budget = repo
            .create(CreateBudgetInput {
                workspace_id: f.workspace_id,
                category_id: f.expense_category_id,
                amount_minor: 50000,
                month: 10,
                year: 2026,
            })
            .unwrap();

        assert_eq!(budget.workspace_id, f.workspace_id);
        assert_eq!(budget.category_id, f.expense_category_id);
        assert_eq!(budget.amount_minor, 50000);
        assert_eq!(budget.month, 10);
        assert_eq!(budget.year, 2026);
    }

    #[test]
    fn create_rejects_income_category() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let result = repo.create(CreateBudgetInput {
            workspace_id: f.workspace_id,
            category_id: f.income_category_id,
            amount_minor: 50000,
            month: 10,
            year: 2026,
        });

        assert!(matches!(result, Err(DomainError::Validation(msg)) if msg.contains("expense")));
    }

    #[test]
    fn create_rejects_zero_amount() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let result = repo.create(CreateBudgetInput {
            workspace_id: f.workspace_id,
            category_id: f.expense_category_id,
            amount_minor: 0,
            month: 10,
            year: 2026,
        });

        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_rejects_negative_amount() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let result = repo.create(CreateBudgetInput {
            workspace_id: f.workspace_id,
            category_id: f.expense_category_id,
            amount_minor: -100,
            month: 10,
            year: 2026,
        });

        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_rejects_invalid_month() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let result = repo.create(CreateBudgetInput {
            workspace_id: f.workspace_id,
            category_id: f.expense_category_id,
            amount_minor: 50000,
            month: 13,
            year: 2026,
        });

        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_rejects_duplicate() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        repo.create(CreateBudgetInput {
            workspace_id: f.workspace_id,
            category_id: f.expense_category_id,
            amount_minor: 50000,
            month: 10,
            year: 2026,
        })
        .unwrap();

        let result = repo.create(CreateBudgetInput {
            workspace_id: f.workspace_id,
            category_id: f.expense_category_id,
            amount_minor: 60000,
            month: 10,
            year: 2026,
        });

        assert!(matches!(result, Err(DomainError::Conflict(_))));
    }

    #[test]
    fn create_allows_same_category_different_month() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        repo.create(CreateBudgetInput {
            workspace_id: f.workspace_id,
            category_id: f.expense_category_id,
            amount_minor: 50000,
            month: 10,
            year: 2026,
        })
        .unwrap();

        let budget = repo
            .create(CreateBudgetInput {
                workspace_id: f.workspace_id,
                category_id: f.expense_category_id,
                amount_minor: 60000,
                month: 11,
                year: 2026,
            })
            .unwrap();

        assert_eq!(budget.month, 11);
    }

    #[test]
    fn create_rejects_nonexistent_workspace() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let result = repo.create(CreateBudgetInput {
            workspace_id: 999,
            category_id: f.expense_category_id,
            amount_minor: 50000,
            month: 10,
            year: 2026,
        });

        assert!(matches!(result, Err(DomainError::Validation(msg)) if msg.contains("Workspace")));
    }

    #[test]
    fn create_rejects_nonexistent_category() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let result = repo.create(CreateBudgetInput {
            workspace_id: f.workspace_id,
            category_id: 999,
            amount_minor: 50000,
            month: 10,
            year: 2026,
        });

        assert!(matches!(result, Err(DomainError::Validation(msg)) if msg.contains("Category")));
    }

    #[test]
    fn list_by_workspace_month() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        repo.create(CreateBudgetInput {
            workspace_id: f.workspace_id,
            category_id: f.expense_category_id,
            amount_minor: 50000,
            month: 10,
            year: 2026,
        })
        .unwrap();

        let budgets = repo
            .list_by_workspace_month(f.workspace_id, 10, 2026)
            .unwrap();
        assert_eq!(budgets.len(), 1);
        assert_eq!(budgets[0].amount_minor, 50000);

        let empty = repo
            .list_by_workspace_month(f.workspace_id, 11, 2026)
            .unwrap();
        assert_eq!(empty.len(), 0);
    }

    #[test]
    fn update_budget() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let budget = repo
            .create(CreateBudgetInput {
                workspace_id: f.workspace_id,
                category_id: f.expense_category_id,
                amount_minor: 50000,
                month: 10,
                year: 2026,
            })
            .unwrap();

        let updated = repo.update(budget.id, 75000).unwrap();
        assert_eq!(updated.amount_minor, 75000);
        assert_eq!(updated.category_id, f.expense_category_id);
    }

    #[test]
    fn update_rejects_zero_amount() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let budget = repo
            .create(CreateBudgetInput {
                workspace_id: f.workspace_id,
                category_id: f.expense_category_id,
                amount_minor: 50000,
                month: 10,
                year: 2026,
            })
            .unwrap();

        let result = repo.update(budget.id, 0);
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn update_nonexistent_returns_not_found() {
        let conn = setup_test_db();
        let _f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let result = repo.update(999, 50000);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn delete_budget() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let budget = repo
            .create(CreateBudgetInput {
                workspace_id: f.workspace_id,
                category_id: f.expense_category_id,
                amount_minor: 50000,
                month: 10,
                year: 2026,
            })
            .unwrap();

        repo.delete(budget.id).unwrap();

        let result = repo.get_by_id(budget.id);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn delete_nonexistent_returns_not_found() {
        let conn = setup_test_db();
        let _f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let result = repo.delete(999);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn cascade_on_category_delete() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let budget = repo
            .create(CreateBudgetInput {
                workspace_id: f.workspace_id,
                category_id: f.expense_category_id,
                amount_minor: 50000,
                month: 10,
                year: 2026,
            })
            .unwrap();

        let cat_repo = CategoryRepository::new(&conn);
        cat_repo.delete(f.expense_category_id).unwrap();

        let result = repo.get_by_id(budget.id);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn get_category_spending_with_transactions() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);

        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, category_id, amount_minor, description, date) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![f.workspace_id, f.account_id, f.expense_category_id, -15000, "Groceries", "2026-10-05"],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, category_id, amount_minor, description, date) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![f.workspace_id, f.account_id, f.expense_category_id, -8000, "Restaurant", "2026-10-12"],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) \
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![f.workspace_id, f.account_id, 200000, "Salary", "2026-10-01"],
        ).unwrap();

        let repo = BudgetRepository::new(&conn);
        let spending = repo
            .get_category_spending(f.workspace_id, 10, 2026)
            .unwrap();

        assert_eq!(spending.len(), 1);
        assert_eq!(spending[0].category_id, f.expense_category_id);
        assert_eq!(spending[0].spent_minor, 23000);
    }

    #[test]
    fn get_category_spending_excludes_other_months() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);

        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, category_id, amount_minor, description, date) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![f.workspace_id, f.account_id, f.expense_category_id, -15000, "Groceries", "2026-10-05"],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, category_id, amount_minor, description, date) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![f.workspace_id, f.account_id, f.expense_category_id, -20000, "Old groceries", "2026-09-15"],
        ).unwrap();

        let repo = BudgetRepository::new(&conn);
        let spending = repo
            .get_category_spending(f.workspace_id, 10, 2026)
            .unwrap();

        assert_eq!(spending.len(), 1);
        assert_eq!(spending[0].spent_minor, 15000);
    }

    #[test]
    fn get_category_spending_empty_month() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);
        let repo = BudgetRepository::new(&conn);

        let spending = repo
            .get_category_spending(f.workspace_id, 10, 2026)
            .unwrap();
        assert_eq!(spending.len(), 0);
    }

    #[test]
    fn get_category_spending_excludes_income() {
        let conn = setup_test_db();
        let f = setup_fixture(&conn);

        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, category_id, amount_minor, description, date) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![f.workspace_id, f.account_id, f.income_category_id, 200000, "Salary", "2026-10-01"],
        ).unwrap();

        let repo = BudgetRepository::new(&conn);
        let spending = repo
            .get_category_spending(f.workspace_id, 10, 2026)
            .unwrap();

        assert_eq!(spending.len(), 0);
    }
}
