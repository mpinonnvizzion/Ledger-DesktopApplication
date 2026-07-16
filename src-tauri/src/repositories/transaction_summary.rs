use rusqlite::Connection;

use crate::error::DomainError;
use crate::models::transaction_summary::TransactionSummary;

pub struct TransactionSummaryRepository<'a> {
    conn: &'a Connection,
}

impl<'a> TransactionSummaryRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn monthly_summary(
        &self,
        workspace_id: i64,
        date_from: &str,
        date_to: &str,
    ) -> Result<TransactionSummary, DomainError> {
        validate_date(date_from)?;
        validate_date(date_to)?;

        if date_from > date_to {
            return Err(DomainError::Validation(
                "date_from must not be after date_to.".into(),
            ));
        }

        let workspace_exists: bool = self
            .conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM workspaces WHERE id = ?1",
                rusqlite::params![workspace_id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !workspace_exists {
            return Err(DomainError::Validation(
                "Workspace does not exist.".into(),
            ));
        }

        let summary = self.conn.query_row(
            "SELECT \
                COALESCE(SUM(CASE WHEN amount_minor > 0 THEN amount_minor ELSE 0 END), 0), \
                COALESCE(SUM(CASE WHEN amount_minor < 0 THEN amount_minor ELSE 0 END), 0), \
                COALESCE(SUM(amount_minor), 0), \
                COUNT(*) \
             FROM transactions \
             WHERE workspace_id = ?1 AND date >= ?2 AND date <= ?3",
            rusqlite::params![workspace_id, date_from, date_to],
            |row| {
                Ok(TransactionSummary {
                    income_minor: row.get(0)?,
                    expense_minor: row.get(1)?,
                    net_minor: row.get(2)?,
                    transaction_count: row.get(3)?,
                })
            },
        )?;

        Ok(summary)
    }
}

fn validate_date(date: &str) -> Result<(), DomainError> {
    if date.len() != 10 {
        return Err(DomainError::Validation(format!(
            "Date '{}' must be in YYYY-MM-DD format.",
            date
        )));
    }
    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3 {
        return Err(DomainError::Validation(format!(
            "Date '{}' must be in YYYY-MM-DD format.",
            date
        )));
    }
    let year: u32 = parts[0].parse().map_err(|_| {
        DomainError::Validation(format!("Date '{}' has invalid year.", date))
    })?;
    let month: u32 = parts[1].parse().map_err(|_| {
        DomainError::Validation(format!("Date '{}' has invalid month.", date))
    })?;
    let day: u32 = parts[2].parse().map_err(|_| {
        DomainError::Validation(format!("Date '{}' has invalid day.", date))
    })?;
    if year < 1900 || year > 2999 {
        return Err(DomainError::Validation(format!(
            "Date '{}' has year out of range.",
            date
        )));
    }
    if month < 1 || month > 12 {
        return Err(DomainError::Validation(format!(
            "Date '{}' has month out of range.",
            date
        )));
    }
    if day < 1 || day > 31 {
        return Err(DomainError::Validation(format!(
            "Date '{}' has day out of range.",
            date
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::workspace::{CreateWorkspaceInput, WorkspaceType};
    use crate::repositories::test_helpers::setup_test_db;
    use crate::repositories::workspace::WorkspaceRepository;

    fn setup_with_transactions() -> (Connection, i64) {
        let conn = setup_test_db();

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY,
                workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
                account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                amount_minor INTEGER NOT NULL CHECK(amount_minor != 0),
                description TEXT NOT NULL DEFAULT '',
                date TEXT NOT NULL,
                notes TEXT,
                status TEXT NOT NULL DEFAULT 'uncleared',
                source TEXT NOT NULL DEFAULT 'manual',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );",
        )
        .unwrap();

        let ws_repo = WorkspaceRepository::new(&conn);
        let ws = ws_repo
            .create(CreateWorkspaceInput {
                name: "Test".to_string(),
                workspace_type: WorkspaceType::Personal,
                currency: None,
            })
            .unwrap();

        use crate::models::account::{AccountType, CreateAccountInput};
        use crate::repositories::account::AccountRepository;

        let acct_repo = AccountRepository::new(&conn);
        let acct = acct_repo
            .create(CreateAccountInput {
                workspace_id: ws.id,
                name: "Checking".to_string(),
                account_type: AccountType::Checking,
                currency: None,
                institution_name: None,
            })
            .unwrap();

        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![ws.id, acct.id, 150000, "Salary", "2026-07-01"],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![ws.id, acct.id, 50000, "Freelance", "2026-07-15"],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![ws.id, acct.id, -30000, "Groceries", "2026-07-05"],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![ws.id, acct.id, -12000, "Gas", "2026-07-10"],
        ).unwrap();
        conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![ws.id, acct.id, -8500, "Coffee", "2026-06-28"],
        ).unwrap();

        (conn, ws.id)
    }

    #[test]
    fn summary_for_full_month() {
        let (conn, ws_id) = setup_with_transactions();
        let repo = TransactionSummaryRepository::new(&conn);

        let summary = repo
            .monthly_summary(ws_id, "2026-07-01", "2026-07-31")
            .unwrap();

        assert_eq!(summary.income_minor, 200000);
        assert_eq!(summary.expense_minor, -42000);
        assert_eq!(summary.net_minor, 158000);
        assert_eq!(summary.transaction_count, 4);
    }

    #[test]
    fn summary_excludes_out_of_range() {
        let (conn, ws_id) = setup_with_transactions();
        let repo = TransactionSummaryRepository::new(&conn);

        let summary = repo
            .monthly_summary(ws_id, "2026-06-01", "2026-06-30")
            .unwrap();

        assert_eq!(summary.income_minor, 0);
        assert_eq!(summary.expense_minor, -8500);
        assert_eq!(summary.net_minor, -8500);
        assert_eq!(summary.transaction_count, 1);
    }

    #[test]
    fn summary_empty_range() {
        let (conn, ws_id) = setup_with_transactions();
        let repo = TransactionSummaryRepository::new(&conn);

        let summary = repo
            .monthly_summary(ws_id, "2025-01-01", "2025-01-31")
            .unwrap();

        assert_eq!(summary.income_minor, 0);
        assert_eq!(summary.expense_minor, 0);
        assert_eq!(summary.net_minor, 0);
        assert_eq!(summary.transaction_count, 0);
    }

    #[test]
    fn summary_single_day() {
        let (conn, ws_id) = setup_with_transactions();
        let repo = TransactionSummaryRepository::new(&conn);

        let summary = repo
            .monthly_summary(ws_id, "2026-07-01", "2026-07-01")
            .unwrap();

        assert_eq!(summary.income_minor, 150000);
        assert_eq!(summary.expense_minor, 0);
        assert_eq!(summary.net_minor, 150000);
        assert_eq!(summary.transaction_count, 1);
    }

    #[test]
    fn summary_invalid_workspace() {
        let (conn, _ws_id) = setup_with_transactions();
        let repo = TransactionSummaryRepository::new(&conn);

        let result = repo.monthly_summary(999, "2026-07-01", "2026-07-31");
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn summary_invalid_date_format() {
        let (conn, ws_id) = setup_with_transactions();
        let repo = TransactionSummaryRepository::new(&conn);

        let result = repo.monthly_summary(ws_id, "07/01/2026", "2026-07-31");
        assert!(matches!(result, Err(DomainError::Validation(_))));

        let result = repo.monthly_summary(ws_id, "2026-07-01", "not-a-date");
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn summary_date_from_after_date_to() {
        let (conn, ws_id) = setup_with_transactions();
        let repo = TransactionSummaryRepository::new(&conn);

        let result = repo.monthly_summary(ws_id, "2026-07-31", "2026-07-01");
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn summary_invalid_month() {
        let (conn, ws_id) = setup_with_transactions();
        let repo = TransactionSummaryRepository::new(&conn);

        let result = repo.monthly_summary(ws_id, "2026-13-01", "2026-13-31");
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn expense_minor_is_negative() {
        let (conn, ws_id) = setup_with_transactions();
        let repo = TransactionSummaryRepository::new(&conn);

        let summary = repo
            .monthly_summary(ws_id, "2026-07-01", "2026-07-31")
            .unwrap();

        assert!(summary.expense_minor < 0);
        assert!(summary.income_minor > 0);
        assert_eq!(summary.net_minor, summary.income_minor + summary.expense_minor);
    }
}
