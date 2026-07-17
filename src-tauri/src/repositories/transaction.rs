use rusqlite::Connection;

use crate::error::DomainError;
use crate::models::transaction::{
    CreateTransactionInput, Direction, Transaction, TransactionListResult, TransactionQuery,
    TransactionSource, TransactionStatus, UpdateTransactionInput,
};

const MAX_DESCRIPTION_LENGTH: usize = 500;
const MAX_NOTES_LENGTH: usize = 2000;
const DEFAULT_LIMIT: i64 = 50;
const MAX_LIMIT: i64 = 500;

pub struct TransactionRepository<'a> {
    conn: &'a Connection,
}

impl<'a> TransactionRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn create(
        &self,
        input: CreateTransactionInput,
    ) -> Result<Transaction, DomainError> {
        self.validate_create_input(&input)?;

        let status = input.status.unwrap_or(TransactionStatus::Uncleared);
        let source = input.source.unwrap_or(TransactionSource::Manual);

        let tx = self.conn.unchecked_transaction().map_err(|e| {
            DomainError::Database(format!("Failed to begin transaction: {}", e))
        })?;

        tx.execute(
            "INSERT INTO transactions (workspace_id, account_id, category_id, amount_minor, description, date, notes, status, source) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                input.workspace_id,
                input.account_id,
                input.category_id,
                input.amount_minor,
                input.description,
                input.date,
                input.notes,
                status.as_str(),
                source.as_str(),
            ],
        )?;

        let id = tx.last_insert_rowid();

        tx.execute(
            "UPDATE accounts SET balance = balance + ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![input.amount_minor, input.account_id],
        )?;

        tx.commit().map_err(|e| {
            DomainError::Database(format!("Failed to commit transaction: {}", e))
        })?;

        self.get_by_id(id)
    }

    pub fn get_by_id(&self, id: i64) -> Result<Transaction, DomainError> {
        let txn = self.conn.query_row(
            "SELECT id, workspace_id, account_id, category_id, amount_minor, description, date, notes, status, source, created_at, updated_at FROM transactions WHERE id = ?1",
            rusqlite::params![id],
            |row| Self::row_to_transaction(row),
        )?;
        Ok(txn)
    }

    pub fn update(
        &self,
        id: i64,
        input: UpdateTransactionInput,
    ) -> Result<Transaction, DomainError> {
        let existing = self.get_by_id(id)?;

        let new_account_id = input.account_id.unwrap_or(existing.account_id);
        let new_amount = input.amount_minor.unwrap_or(existing.amount_minor);
        let new_description = input.description.unwrap_or(existing.description.clone());
        let new_date = input.date.unwrap_or(existing.date.clone());
        let new_notes = match input.notes {
            Some(n) => n,
            None => existing.notes.clone(),
        };
        let new_category_id = match input.category_id {
            Some(c) => c,
            None => existing.category_id,
        };
        let new_status = input.status.unwrap_or(existing.status.clone());

        if new_amount == 0 {
            return Err(DomainError::Validation(
                "Transaction amount cannot be zero.".into(),
            ));
        }

        if new_description.len() > MAX_DESCRIPTION_LENGTH {
            return Err(DomainError::Validation(format!(
                "Description cannot exceed {} characters.",
                MAX_DESCRIPTION_LENGTH
            )));
        }

        if let Some(ref notes) = new_notes {
            if notes.len() > MAX_NOTES_LENGTH {
                return Err(DomainError::Validation(format!(
                    "Notes cannot exceed {} characters.",
                    MAX_NOTES_LENGTH
                )));
            }
        }

        validate_date(&new_date)?;

        if new_account_id != existing.account_id {
            let acct_ws: i64 = self
                .conn
                .query_row(
                    "SELECT workspace_id FROM accounts WHERE id = ?1",
                    rusqlite::params![new_account_id],
                    |row| row.get(0),
                )
                .map_err(|_| {
                    DomainError::Validation("Account does not exist.".into())
                })?;
            if acct_ws != existing.workspace_id {
                return Err(DomainError::Validation(
                    "Cross-workspace account assignment is not allowed.".into(),
                ));
            }
        }

        if let Some(cat_id) = new_category_id {
            let cat_ws: i64 = self
                .conn
                .query_row(
                    "SELECT workspace_id FROM categories WHERE id = ?1",
                    rusqlite::params![cat_id],
                    |row| row.get(0),
                )
                .map_err(|_| {
                    DomainError::Validation("Category does not exist.".into())
                })?;
            if cat_ws != existing.workspace_id {
                return Err(DomainError::Validation(
                    "Cross-workspace category assignment is not allowed.".into(),
                ));
            }
        }

        let tx = self.conn.unchecked_transaction().map_err(|e| {
            DomainError::Database(format!("Failed to begin transaction: {}", e))
        })?;

        if new_account_id != existing.account_id {
            tx.execute(
                "UPDATE accounts SET balance = balance - ?1, updated_at = datetime('now') WHERE id = ?2",
                rusqlite::params![existing.amount_minor, existing.account_id],
            )?;
            tx.execute(
                "UPDATE accounts SET balance = balance + ?1, updated_at = datetime('now') WHERE id = ?2",
                rusqlite::params![new_amount, new_account_id],
            )?;
        } else if new_amount != existing.amount_minor {
            let diff = new_amount - existing.amount_minor;
            tx.execute(
                "UPDATE accounts SET balance = balance + ?1, updated_at = datetime('now') WHERE id = ?2",
                rusqlite::params![diff, existing.account_id],
            )?;
        }

        tx.execute(
            "UPDATE transactions SET account_id = ?1, category_id = ?2, amount_minor = ?3, description = ?4, date = ?5, notes = ?6, status = ?7, updated_at = datetime('now') WHERE id = ?8",
            rusqlite::params![
                new_account_id,
                new_category_id,
                new_amount,
                new_description,
                new_date,
                new_notes,
                new_status.as_str(),
                id,
            ],
        )?;

        tx.commit().map_err(|e| {
            DomainError::Database(format!("Failed to commit transaction: {}", e))
        })?;

        self.get_by_id(id)
    }

    pub fn delete(&self, id: i64) -> Result<(), DomainError> {
        let existing = self.get_by_id(id)?;

        let tx = self.conn.unchecked_transaction().map_err(|e| {
            DomainError::Database(format!("Failed to begin transaction: {}", e))
        })?;

        tx.execute(
            "UPDATE accounts SET balance = balance - ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![existing.amount_minor, existing.account_id],
        )?;

        tx.execute(
            "DELETE FROM transactions WHERE id = ?1",
            rusqlite::params![id],
        )?;

        tx.commit().map_err(|e| {
            DomainError::Database(format!("Failed to commit transaction: {}", e))
        })?;

        Ok(())
    }

    pub fn list(
        &self,
        query: TransactionQuery,
    ) -> Result<TransactionListResult, DomainError> {
        let mut conditions = vec!["workspace_id = ?".to_string()];
        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> =
            vec![Box::new(query.workspace_id)];

        if let Some(account_id) = query.account_id {
            conditions.push("account_id = ?".to_string());
            params.push(Box::new(account_id));
        }

        if let Some(category_id) = query.category_id {
            conditions.push("category_id = ?".to_string());
            params.push(Box::new(category_id));
        }

        if let Some(ref date_from) = query.date_from {
            validate_date(date_from)?;
            conditions.push("date >= ?".to_string());
            params.push(Box::new(date_from.clone()));
        }

        if let Some(ref date_to) = query.date_to {
            validate_date(date_to)?;
            conditions.push("date <= ?".to_string());
            params.push(Box::new(date_to.clone()));
        }

        if let Some(ref search) = query.search {
            conditions.push("LOWER(description) LIKE ?".to_string());
            params.push(Box::new(format!("%{}%", search.to_lowercase())));
        }

        if let Some(amount_min) = query.amount_min {
            conditions.push("ABS(amount_minor) >= ?".to_string());
            params.push(Box::new(amount_min));
        }

        if let Some(amount_max) = query.amount_max {
            conditions.push("ABS(amount_minor) <= ?".to_string());
            params.push(Box::new(amount_max));
        }

        if let Some(ref direction) = query.direction {
            match direction {
                Direction::Income => conditions.push("amount_minor > 0".to_string()),
                Direction::Expense => conditions.push("amount_minor < 0".to_string()),
            }
        }

        let where_clause = conditions.join(" AND ");

        let count_sql = format!(
            "SELECT COUNT(*) FROM transactions WHERE {}",
            where_clause
        );
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            params.iter().map(|p| p.as_ref()).collect();

        let total_count: i64 = self
            .conn
            .query_row(&count_sql, param_refs.as_slice(), |row| row.get(0))?;

        let limit = query
            .limit
            .unwrap_or(DEFAULT_LIMIT)
            .max(1)
            .min(MAX_LIMIT);
        let offset = query.offset.unwrap_or(0).max(0);

        let select_sql = format!(
            "SELECT id, workspace_id, account_id, category_id, amount_minor, description, date, notes, status, source, created_at, updated_at FROM transactions WHERE {} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?",
            where_clause
        );

        params.push(Box::new(limit));
        params.push(Box::new(offset));

        let select_refs: Vec<&dyn rusqlite::types::ToSql> =
            params.iter().map(|p| p.as_ref()).collect();

        let mut stmt = self.conn.prepare(&select_sql)?;
        let transactions = stmt
            .query_map(select_refs.as_slice(), |row| {
                Self::row_to_transaction(row)
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(TransactionListResult {
            transactions,
            total_count,
        })
    }

    pub fn create_batch(
        &self,
        inputs: Vec<CreateTransactionInput>,
    ) -> Result<Vec<Transaction>, DomainError> {
        for input in &inputs {
            self.validate_create_input(input)?;
        }

        let tx = self.conn.unchecked_transaction().map_err(|e| {
            DomainError::Database(format!("Failed to begin transaction: {}", e))
        })?;

        let mut ids = Vec::with_capacity(inputs.len());

        for input in &inputs {
            let status = input
                .status
                .as_ref()
                .unwrap_or(&TransactionStatus::Uncleared);
            let source = input
                .source
                .as_ref()
                .unwrap_or(&TransactionSource::Manual);

            tx.execute(
                "INSERT INTO transactions (workspace_id, account_id, category_id, amount_minor, description, date, notes, status, source) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![
                    input.workspace_id,
                    input.account_id,
                    input.category_id,
                    input.amount_minor,
                    input.description,
                    input.date,
                    input.notes,
                    status.as_str(),
                    source.as_str(),
                ],
            )?;

            ids.push(tx.last_insert_rowid());

            tx.execute(
                "UPDATE accounts SET balance = balance + ?1, updated_at = datetime('now') WHERE id = ?2",
                rusqlite::params![input.amount_minor, input.account_id],
            )?;
        }

        tx.commit().map_err(|e| {
            DomainError::Database(format!("Failed to commit batch: {}", e))
        })?;

        let mut results = Vec::with_capacity(ids.len());
        for id in ids {
            results.push(self.get_by_id(id)?);
        }

        Ok(results)
    }

    pub fn verify_balance(&self, account_id: i64) -> Result<bool, DomainError> {
        let cached: i64 = self
            .conn
            .query_row(
                "SELECT balance FROM accounts WHERE id = ?1",
                rusqlite::params![account_id],
                |row| row.get(0),
            )
            .map_err(|_| {
                DomainError::Validation("Account does not exist.".into())
            })?;

        let computed: i64 = self
            .conn
            .query_row(
                "SELECT COALESCE(SUM(amount_minor), 0) FROM transactions WHERE account_id = ?1",
                rusqlite::params![account_id],
                |row| row.get(0),
            )?;

        Ok(cached == computed)
    }

    pub fn rebuild_balance(&self, account_id: i64) -> Result<i64, DomainError> {
        let _exists: i64 = self
            .conn
            .query_row(
                "SELECT id FROM accounts WHERE id = ?1",
                rusqlite::params![account_id],
                |row| row.get(0),
            )
            .map_err(|_| {
                DomainError::Validation("Account does not exist.".into())
            })?;

        let computed: i64 = self
            .conn
            .query_row(
                "SELECT COALESCE(SUM(amount_minor), 0) FROM transactions WHERE account_id = ?1",
                rusqlite::params![account_id],
                |row| row.get(0),
            )?;

        self.conn.execute(
            "UPDATE accounts SET balance = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![computed, account_id],
        )?;

        Ok(computed)
    }

    pub fn get_account_balance(&self, account_id: i64) -> Result<i64, DomainError> {
        let balance: i64 = self
            .conn
            .query_row(
                "SELECT balance FROM accounts WHERE id = ?1",
                rusqlite::params![account_id],
                |row| row.get(0),
            )
            .map_err(|_| {
                DomainError::Validation("Account does not exist.".into())
            })?;
        Ok(balance)
    }

    fn validate_create_input(
        &self,
        input: &CreateTransactionInput,
    ) -> Result<(), DomainError> {
        if input.amount_minor == 0 {
            return Err(DomainError::Validation(
                "Transaction amount cannot be zero.".into(),
            ));
        }

        if input.description.len() > MAX_DESCRIPTION_LENGTH {
            return Err(DomainError::Validation(format!(
                "Description cannot exceed {} characters.",
                MAX_DESCRIPTION_LENGTH
            )));
        }

        if let Some(ref notes) = input.notes {
            if notes.len() > MAX_NOTES_LENGTH {
                return Err(DomainError::Validation(format!(
                    "Notes cannot exceed {} characters.",
                    MAX_NOTES_LENGTH
                )));
            }
        }

        validate_date(&input.date)?;

        let ws_exists: bool = self
            .conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM workspaces WHERE id = ?1",
                rusqlite::params![input.workspace_id],
                |row| row.get(0),
            )
            .unwrap_or(false);
        if !ws_exists {
            return Err(DomainError::Validation(
                "Workspace does not exist.".into(),
            ));
        }

        let acct_ws: i64 = self
            .conn
            .query_row(
                "SELECT workspace_id FROM accounts WHERE id = ?1",
                rusqlite::params![input.account_id],
                |row| row.get(0),
            )
            .map_err(|_| {
                DomainError::Validation("Account does not exist.".into())
            })?;

        if acct_ws != input.workspace_id {
            return Err(DomainError::Validation(
                "Cross-workspace account assignment is not allowed.".into(),
            ));
        }

        if let Some(cat_id) = input.category_id {
            let cat_ws: i64 = self
                .conn
                .query_row(
                    "SELECT workspace_id FROM categories WHERE id = ?1",
                    rusqlite::params![cat_id],
                    |row| row.get(0),
                )
                .map_err(|_| {
                    DomainError::Validation("Category does not exist.".into())
                })?;
            if cat_ws != input.workspace_id {
                return Err(DomainError::Validation(
                    "Cross-workspace category assignment is not allowed.".into(),
                ));
            }
        }

        Ok(())
    }

    fn row_to_transaction(
        row: &rusqlite::Row,
    ) -> Result<Transaction, rusqlite::Error> {
        Ok(Transaction {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            account_id: row.get(2)?,
            category_id: row.get(3)?,
            amount_minor: row.get(4)?,
            description: row.get(5)?,
            date: row.get(6)?,
            notes: row.get(7)?,
            status: TransactionStatus::from_str(
                &row.get::<_, String>(8)?,
            )
            .unwrap_or(TransactionStatus::Uncleared),
            source: TransactionSource::from_str(
                &row.get::<_, String>(9)?,
            )
            .unwrap_or(TransactionSource::Manual),
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
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
    use crate::models::account::{AccountType, CreateAccountInput};
    use crate::models::workspace::{CreateWorkspaceInput, WorkspaceType};
    use crate::repositories::account::AccountRepository;
    use crate::repositories::category::CategoryRepository;
    use crate::repositories::test_helpers::setup_test_db;
    use crate::repositories::workspace::WorkspaceRepository;
    use rusqlite::Connection;

    struct TestFixture {
        ws_id: i64,
        acct_id: i64,
        acct2_id: i64,
        cat_id: i64,
    }

    fn setup() -> (Connection, TestFixture) {
        let conn = setup_test_db();

        let ws_repo = WorkspaceRepository::new(&conn);
        let ws = ws_repo
            .create(CreateWorkspaceInput {
                name: "Test".into(),
                workspace_type: WorkspaceType::Personal,
                currency: None,
            })
            .unwrap();

        let acct_repo = AccountRepository::new(&conn);
        let acct = acct_repo
            .create(CreateAccountInput {
                workspace_id: ws.id,
                name: "Checking".into(),
                account_type: AccountType::Checking,
                currency: None,
                institution_name: None,
            })
            .unwrap();

        let acct2 = acct_repo
            .create(CreateAccountInput {
                workspace_id: ws.id,
                name: "Savings".into(),
                account_type: AccountType::Savings,
                currency: None,
                institution_name: None,
            })
            .unwrap();

        let cat_repo = CategoryRepository::new(&conn);
        use crate::models::category::CreateCategoryInput;
        let cat = cat_repo
            .create(CreateCategoryInput {
                workspace_id: ws.id,
                name: "Groceries".into(),
                category_type: crate::models::category::CategoryType::Expense,
                parent_id: None,
            })
            .unwrap();

        (
            conn,
            TestFixture {
                ws_id: ws.id,
                acct_id: acct.id,
                acct2_id: acct2.id,
                cat_id: cat.id,
            },
        )
    }

    fn assert_balance_consistent(conn: &Connection, account_id: i64) {
        let repo = TransactionRepository::new(conn);
        assert!(
            repo.verify_balance(account_id).unwrap(),
            "Balance inconsistency for account {}",
            account_id
        );
    }

    fn make_input(f: &TestFixture, amount: i64, date: &str) -> CreateTransactionInput {
        CreateTransactionInput {
            workspace_id: f.ws_id,
            account_id: f.acct_id,
            category_id: Some(f.cat_id),
            amount_minor: amount,
            description: "Test".into(),
            date: date.into(),
            notes: None,
            status: None,
            source: None,
        }
    }

    // --- CRUD ---

    #[test]
    fn create_income_transaction() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let txn = repo.create(make_input(&f, 50000, "2026-07-15")).unwrap();
        assert_eq!(txn.amount_minor, 50000);
        assert_eq!(txn.status, TransactionStatus::Uncleared);
        assert_eq!(txn.source, TransactionSource::Manual);
        assert_balance_consistent(&conn, f.acct_id);

        let balance = repo.get_account_balance(f.acct_id).unwrap();
        assert_eq!(balance, 50000);
    }

    #[test]
    fn create_expense_transaction() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let txn = repo.create(make_input(&f, -3000, "2026-07-15")).unwrap();
        assert_eq!(txn.amount_minor, -3000);
        assert_balance_consistent(&conn, f.acct_id);

        let balance = repo.get_account_balance(f.acct_id).unwrap();
        assert_eq!(balance, -3000);
    }

    #[test]
    fn create_zero_amount_fails() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        let result = repo.create(make_input(&f, 0, "2026-07-15"));
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_invalid_account_fails() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        let mut input = make_input(&f, 1000, "2026-07-15");
        input.account_id = 999;
        let result = repo.create(input);
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_cross_workspace_account_fails() {
        let (conn, f) = setup();
        let ws_repo = WorkspaceRepository::new(&conn);
        let ws2 = ws_repo
            .create(CreateWorkspaceInput {
                name: "Other".into(),
                workspace_type: WorkspaceType::Personal,
                currency: None,
            })
            .unwrap();
        let acct_repo = AccountRepository::new(&conn);
        let other_acct = acct_repo
            .create(CreateAccountInput {
                workspace_id: ws2.id,
                name: "Other Checking".into(),
                account_type: AccountType::Checking,
                currency: None,
                institution_name: None,
            })
            .unwrap();

        let repo = TransactionRepository::new(&conn);
        let mut input = make_input(&f, 1000, "2026-07-15");
        input.account_id = other_acct.id;
        let result = repo.create(input);
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_invalid_category_fails() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        let mut input = make_input(&f, 1000, "2026-07-15");
        input.category_id = Some(999);
        let result = repo.create(input);
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_cross_workspace_category_fails() {
        let (conn, f) = setup();
        let ws_repo = WorkspaceRepository::new(&conn);
        let ws2 = ws_repo
            .create(CreateWorkspaceInput {
                name: "Other".into(),
                workspace_type: WorkspaceType::Personal,
                currency: None,
            })
            .unwrap();
        let cat_repo = CategoryRepository::new(&conn);
        use crate::models::category::CreateCategoryInput;
        let other_cat = cat_repo
            .create(CreateCategoryInput {
                workspace_id: ws2.id,
                name: "Other Cat".into(),
                category_type: crate::models::category::CategoryType::Expense,
                parent_id: None,
            })
            .unwrap();

        let repo = TransactionRepository::new(&conn);
        let mut input = make_input(&f, 1000, "2026-07-15");
        input.category_id = Some(other_cat.id);
        let result = repo.create(input);
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_invalid_date_fails() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        let result = repo.create(make_input(&f, 1000, "not-a-date"));
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn create_long_description_fails() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        let mut input = make_input(&f, 1000, "2026-07-15");
        input.description = "x".repeat(501);
        let result = repo.create(input);
        assert!(matches!(result, Err(DomainError::Validation(_))));
    }

    #[test]
    fn get_by_id() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        let created = repo.create(make_input(&f, 5000, "2026-07-15")).unwrap();
        let fetched = repo.get_by_id(created.id).unwrap();
        assert_eq!(fetched.amount_minor, 5000);
    }

    #[test]
    fn get_nonexistent_returns_not_found() {
        let (conn, _) = setup();
        let repo = TransactionRepository::new(&conn);
        let result = repo.get_by_id(999);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    #[test]
    fn update_amount_adjusts_balance() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let txn = repo.create(make_input(&f, 10000, "2026-07-15")).unwrap();
        assert_eq!(repo.get_account_balance(f.acct_id).unwrap(), 10000);

        repo.update(
            txn.id,
            UpdateTransactionInput {
                amount_minor: Some(15000),
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(repo.get_account_balance(f.acct_id).unwrap(), 15000);
        assert_balance_consistent(&conn, f.acct_id);
    }

    #[test]
    fn update_account_moves_balance() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let txn = repo.create(make_input(&f, 10000, "2026-07-15")).unwrap();
        assert_eq!(repo.get_account_balance(f.acct_id).unwrap(), 10000);
        assert_eq!(repo.get_account_balance(f.acct2_id).unwrap(), 0);

        repo.update(
            txn.id,
            UpdateTransactionInput {
                account_id: Some(f.acct2_id),
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(repo.get_account_balance(f.acct_id).unwrap(), 0);
        assert_eq!(repo.get_account_balance(f.acct2_id).unwrap(), 10000);
        assert_balance_consistent(&conn, f.acct_id);
        assert_balance_consistent(&conn, f.acct2_id);
    }

    #[test]
    fn update_with_zero_amount_fails() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        let txn = repo.create(make_input(&f, 5000, "2026-07-15")).unwrap();

        let result = repo.update(
            txn.id,
            UpdateTransactionInput {
                amount_minor: Some(0),
                ..Default::default()
            },
        );
        assert!(matches!(result, Err(DomainError::Validation(_))));
        assert_eq!(repo.get_account_balance(f.acct_id).unwrap(), 5000);
    }

    #[test]
    fn delete_reverses_balance() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let txn = repo.create(make_input(&f, 10000, "2026-07-15")).unwrap();
        assert_eq!(repo.get_account_balance(f.acct_id).unwrap(), 10000);

        repo.delete(txn.id).unwrap();
        assert_eq!(repo.get_account_balance(f.acct_id).unwrap(), 0);
        assert_balance_consistent(&conn, f.acct_id);
    }

    #[test]
    fn delete_nonexistent_returns_not_found() {
        let (conn, _) = setup();
        let repo = TransactionRepository::new(&conn);
        let result = repo.delete(999);
        assert!(matches!(result, Err(DomainError::NotFound)));
    }

    // --- List / filter / search ---

    #[test]
    fn list_no_filters() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 1000, "2026-07-01")).unwrap();
        repo.create(make_input(&f, -500, "2026-07-02")).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.total_count, 2);
        assert_eq!(result.transactions.len(), 2);
        assert!(result.transactions[0].date >= result.transactions[1].date);
    }

    #[test]
    fn list_filter_by_account() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 1000, "2026-07-01")).unwrap();

        let mut input2 = make_input(&f, 2000, "2026-07-02");
        input2.account_id = f.acct2_id;
        repo.create(input2).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                account_id: Some(f.acct2_id),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.total_count, 1);
        assert_eq!(result.transactions[0].account_id, f.acct2_id);
    }

    #[test]
    fn list_filter_by_category() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 1000, "2026-07-01")).unwrap();

        let mut no_cat = make_input(&f, 2000, "2026-07-02");
        no_cat.category_id = None;
        repo.create(no_cat).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                category_id: Some(f.cat_id),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.total_count, 1);
    }

    #[test]
    fn list_filter_by_date_range() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 1000, "2026-06-15")).unwrap();
        repo.create(make_input(&f, 2000, "2026-07-15")).unwrap();
        repo.create(make_input(&f, 3000, "2026-08-15")).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                date_from: Some("2026-07-01".into()),
                date_to: Some("2026-07-31".into()),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.total_count, 1);
        assert_eq!(result.transactions[0].amount_minor, 2000);
    }

    #[test]
    fn list_filter_by_direction_income() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 1000, "2026-07-01")).unwrap();
        repo.create(make_input(&f, -500, "2026-07-02")).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                direction: Some(Direction::Income),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.total_count, 1);
        assert!(result.transactions[0].amount_minor > 0);
    }

    #[test]
    fn list_filter_by_direction_expense() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 1000, "2026-07-01")).unwrap();
        repo.create(make_input(&f, -500, "2026-07-02")).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                direction: Some(Direction::Expense),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.total_count, 1);
        assert!(result.transactions[0].amount_minor < 0);
    }

    #[test]
    fn list_text_search() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let mut input1 = make_input(&f, 1000, "2026-07-01");
        input1.description = "Coffee at Starbucks".into();
        repo.create(input1).unwrap();

        let mut input2 = make_input(&f, 2000, "2026-07-02");
        input2.description = "Groceries at Walmart".into();
        repo.create(input2).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                search: Some("coffee".into()),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.total_count, 1);
        assert!(result.transactions[0].description.contains("Coffee"));
    }

    #[test]
    fn list_amount_range_filter() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 1000, "2026-07-01")).unwrap();
        repo.create(make_input(&f, 5000, "2026-07-02")).unwrap();
        repo.create(make_input(&f, -3000, "2026-07-03")).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                amount_min: Some(2000),
                amount_max: Some(5000),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.total_count, 2);
    }

    #[test]
    fn list_respects_limit_and_offset() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        for i in 0..10 {
            repo.create(make_input(&f, 1000 + i, &format!("2026-07-{:02}", i + 1)))
                .unwrap();
        }

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                limit: Some(3),
                offset: Some(2),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.transactions.len(), 3);
        assert_eq!(result.total_count, 10);
    }

    #[test]
    fn list_clamps_limit_to_max() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 1000, "2026-07-01")).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                limit: Some(1000),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.transactions.len(), 1);
    }

    #[test]
    fn list_total_count_ignores_limit() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        for i in 0..5 {
            repo.create(make_input(&f, 1000, &format!("2026-07-{:02}", i + 1)))
                .unwrap();
        }

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                limit: Some(2),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.transactions.len(), 2);
        assert_eq!(result.total_count, 5);
    }

    #[test]
    fn list_default_ordering() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 1000, "2026-07-01")).unwrap();
        repo.create(make_input(&f, 2000, "2026-07-10")).unwrap();
        repo.create(make_input(&f, 3000, "2026-07-05")).unwrap();

        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                ..Default::default()
            })
            .unwrap();
        assert_eq!(result.transactions[0].date, "2026-07-10");
        assert_eq!(result.transactions[1].date, "2026-07-05");
        assert_eq!(result.transactions[2].date, "2026-07-01");
    }

    // --- Batch ---

    #[test]
    fn batch_create_succeeds() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let inputs = vec![
            make_input(&f, 10000, "2026-07-01"),
            make_input(&f, -3000, "2026-07-02"),
            make_input(&f, 5000, "2026-07-03"),
        ];

        let results = repo.create_batch(inputs).unwrap();
        assert_eq!(results.len(), 3);

        let balance = repo.get_account_balance(f.acct_id).unwrap();
        assert_eq!(balance, 12000);
        assert_balance_consistent(&conn, f.acct_id);
    }

    #[test]
    fn batch_create_rollback_on_failure() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let inputs = vec![
            make_input(&f, 10000, "2026-07-01"),
            make_input(&f, 0, "2026-07-02"), // invalid
        ];

        let result = repo.create_batch(inputs);
        assert!(result.is_err());

        let balance = repo.get_account_balance(f.acct_id).unwrap();
        assert_eq!(balance, 0);

        let list = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                ..Default::default()
            })
            .unwrap();
        assert_eq!(list.total_count, 0);
    }

    #[test]
    fn batch_create_mixed_amounts() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let inputs = vec![
            make_input(&f, 100000, "2026-07-01"),
            make_input(&f, -25000, "2026-07-02"),
            make_input(&f, -15000, "2026-07-03"),
        ];

        repo.create_batch(inputs).unwrap();
        let balance = repo.get_account_balance(f.acct_id).unwrap();
        assert_eq!(balance, 60000);
        assert_balance_consistent(&conn, f.acct_id);
    }

    // --- Balance utilities ---

    #[test]
    fn verify_balance_returns_true() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 5000, "2026-07-15")).unwrap();
        assert!(repo.verify_balance(f.acct_id).unwrap());
    }

    #[test]
    fn verify_balance_returns_false_after_tampering() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 5000, "2026-07-15")).unwrap();

        conn.execute(
            "UPDATE accounts SET balance = 99999 WHERE id = ?1",
            rusqlite::params![f.acct_id],
        )
        .unwrap();

        assert!(!repo.verify_balance(f.acct_id).unwrap());
    }

    #[test]
    fn rebuild_balance_corrects_drift() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);
        repo.create(make_input(&f, 5000, "2026-07-15")).unwrap();
        repo.create(make_input(&f, -2000, "2026-07-16")).unwrap();

        conn.execute(
            "UPDATE accounts SET balance = 99999 WHERE id = ?1",
            rusqlite::params![f.acct_id],
        )
        .unwrap();

        assert!(!repo.verify_balance(f.acct_id).unwrap());

        let rebuilt = repo.rebuild_balance(f.acct_id).unwrap();
        assert_eq!(rebuilt, 3000);
        assert!(repo.verify_balance(f.acct_id).unwrap());
    }

    // --- Foreign key / cascade ---

    #[test]
    fn delete_account_cascades_to_transactions() {
        let (conn, f) = setup();
        let txn_repo = TransactionRepository::new(&conn);
        txn_repo.create(make_input(&f, 5000, "2026-07-15")).unwrap();

        let acct_repo = AccountRepository::new(&conn);
        acct_repo.delete(f.acct_id).unwrap();

        let list = txn_repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                ..Default::default()
            })
            .unwrap();
        assert_eq!(list.total_count, 0);
    }

    #[test]
    fn delete_category_nullifies_transaction() {
        let (conn, f) = setup();
        let txn_repo = TransactionRepository::new(&conn);
        let txn = txn_repo.create(make_input(&f, 5000, "2026-07-15")).unwrap();
        assert_eq!(txn.category_id, Some(f.cat_id));

        let cat_repo = CategoryRepository::new(&conn);
        cat_repo.delete(f.cat_id).unwrap();

        let refetched = txn_repo.get_by_id(txn.id).unwrap();
        assert_eq!(refetched.category_id, None);
    }

    #[test]
    fn delete_workspace_cascades_through_accounts() {
        let (conn, f) = setup();
        let txn_repo = TransactionRepository::new(&conn);
        txn_repo.create(make_input(&f, 5000, "2026-07-15")).unwrap();

        let ws_repo = WorkspaceRepository::new(&conn);
        ws_repo.delete(f.ws_id).unwrap();

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM transactions WHERE workspace_id = ?1",
                rusqlite::params![f.ws_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn fk_violation_on_invalid_account() {
        let (conn, f) = setup();
        let result = conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) VALUES (?1, 999, 1000, 'Test', '2026-07-15')",
            rusqlite::params![f.ws_id],
        );
        assert!(result.is_err());
    }

    // --- Migration tests ---

    #[test]
    fn migration_creates_correct_columns() {
        let conn = setup_test_db();
        let mut stmt = conn
            .prepare("PRAGMA table_info(transactions)")
            .unwrap();
        let columns: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        let expected = vec![
            "id",
            "workspace_id",
            "account_id",
            "category_id",
            "amount_minor",
            "description",
            "date",
            "notes",
            "status",
            "source",
            "created_at",
            "updated_at",
        ];
        assert_eq!(columns, expected);
    }

    #[test]
    fn migration_creates_indexes() {
        let conn = setup_test_db();
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='transactions' AND name LIKE 'idx_%'")
            .unwrap();
        let mut indexes: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        indexes.sort();

        assert_eq!(indexes.len(), 4);
        assert!(indexes.contains(&"idx_transactions_account_id".to_string()));
        assert!(indexes.contains(&"idx_transactions_category_id".to_string()));
        assert!(indexes.contains(&"idx_transactions_date".to_string()));
        assert!(indexes.contains(&"idx_transactions_workspace_id".to_string()));
    }

    #[test]
    fn check_constraint_rejects_zero_amount() {
        let (conn, f) = setup();
        let result = conn.execute(
            "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) VALUES (?1, ?2, 0, 'Test', '2026-07-15')",
            rusqlite::params![f.ws_id, f.acct_id],
        );
        assert!(result.is_err());
    }

    #[test]
    fn no_transaction_type_or_import_session_columns() {
        let conn = setup_test_db();
        let mut stmt = conn
            .prepare("PRAGMA table_info(transactions)")
            .unwrap();
        let columns: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert!(!columns.contains(&"transaction_type".to_string()));
        assert!(!columns.contains(&"import_session_id".to_string()));
        assert!(!columns.contains(&"transfer_pair_id".to_string()));
    }

    // --- Performance tests ---

    #[test]
    fn performance_10k_list() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let tx = conn.unchecked_transaction().unwrap();
        for i in 0..10_000 {
            tx.execute(
                "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    f.ws_id,
                    f.acct_id,
                    ((i % 200) as i64 + 1) * if i % 3 == 0 { -100 } else { 100 },
                    format!("Txn {}", i),
                    format!("2026-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1),
                ],
            )
            .unwrap();
        }
        tx.commit().unwrap();

        let start = std::time::Instant::now();
        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                limit: Some(50),
                ..Default::default()
            })
            .unwrap();
        let elapsed = start.elapsed();

        println!(
            "PERF 10k list (no filter, limit 50): {:?}, total_count={}",
            elapsed, result.total_count
        );
        assert_eq!(result.total_count, 10_000);
        assert_eq!(result.transactions.len(), 50);

        let plan: String = conn
            .query_row(
                "EXPLAIN QUERY PLAN SELECT id FROM transactions WHERE workspace_id = 1 ORDER BY date DESC, id DESC LIMIT 50",
                [],
                |row| row.get(3),
            )
            .unwrap();
        println!("PERF 10k query plan: {}", plan);
    }

    #[test]
    fn performance_50k_filter() {
        let (conn, f) = setup();

        let tx = conn.unchecked_transaction().unwrap();
        for i in 0..50_000 {
            tx.execute(
                "INSERT INTO transactions (workspace_id, account_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    f.ws_id,
                    if i % 2 == 0 { f.acct_id } else { f.acct2_id },
                    ((i % 200) as i64 + 1) * if i % 3 == 0 { -100 } else { 100 },
                    format!("Txn {}", i),
                    format!("2026-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1),
                ],
            )
            .unwrap();
        }
        tx.commit().unwrap();

        let repo = TransactionRepository::new(&conn);
        let start = std::time::Instant::now();
        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                account_id: Some(f.acct_id),
                date_from: Some("2026-03-01".into()),
                date_to: Some("2026-06-30".into()),
                ..Default::default()
            })
            .unwrap();
        let elapsed = start.elapsed();

        println!(
            "PERF 50k filter (account + date range): {:?}, matched={}",
            elapsed, result.total_count
        );

        let plan: String = conn
            .query_row(
                "EXPLAIN QUERY PLAN SELECT id FROM transactions WHERE workspace_id = 1 AND account_id = 1 AND date >= '2026-03-01' AND date <= '2026-06-30' ORDER BY date DESC, id DESC LIMIT 50",
                [],
                |row| row.get(3),
            )
            .unwrap();
        println!("PERF 50k query plan: {}", plan);
    }

    #[test]
    fn performance_100k_filter() {
        let (conn, f) = setup();

        let tx = conn.unchecked_transaction().unwrap();
        for i in 0..100_000 {
            tx.execute(
                "INSERT INTO transactions (workspace_id, account_id, category_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    f.ws_id,
                    if i % 2 == 0 { f.acct_id } else { f.acct2_id },
                    if i % 3 == 0 { Some(f.cat_id) } else { None::<i64> },
                    ((i % 200) as i64 + 1) * if i % 4 == 0 { -100 } else { 100 },
                    format!("Txn {}", i),
                    format!("2026-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1),
                ],
            )
            .unwrap();
        }
        tx.commit().unwrap();

        let repo = TransactionRepository::new(&conn);
        let start = std::time::Instant::now();
        let result = repo
            .list(TransactionQuery {
                workspace_id: f.ws_id,
                category_id: Some(f.cat_id),
                direction: Some(Direction::Expense),
                ..Default::default()
            })
            .unwrap();
        let elapsed = start.elapsed();

        println!(
            "PERF 100k filter (category + direction): {:?}, matched={}",
            elapsed, result.total_count
        );

        let plan: String = conn
            .query_row(
                "EXPLAIN QUERY PLAN SELECT id FROM transactions WHERE workspace_id = 1 AND category_id = 1 AND amount_minor < 0 ORDER BY date DESC, id DESC LIMIT 50",
                [],
                |row| row.get(3),
            )
            .unwrap();
        println!("PERF 100k query plan: {}", plan);
    }

    #[test]
    fn performance_balance_correct_after_bulk() {
        let (conn, f) = setup();
        let repo = TransactionRepository::new(&conn);

        let mut inputs = Vec::new();
        for i in 0..1000 {
            let mut input = make_input(
                &f,
                ((i % 50) as i64 + 1) * if i % 3 == 0 { -100 } else { 100 },
                &format!("2026-07-{:02}", (i % 28) + 1),
            );
            input.description = format!("Bulk {}", i);
            inputs.push(input);
        }

        repo.create_batch(inputs).unwrap();
        assert_balance_consistent(&conn, f.acct_id);
    }

    impl Default for UpdateTransactionInput {
        fn default() -> Self {
            Self {
                account_id: None,
                category_id: None,
                amount_minor: None,
                description: None,
                date: None,
                notes: None,
                status: None,
            }
        }
    }

    impl Default for TransactionQuery {
        fn default() -> Self {
            Self {
                workspace_id: 0,
                account_id: None,
                category_id: None,
                date_from: None,
                date_to: None,
                search: None,
                amount_min: None,
                amount_max: None,
                direction: None,
                limit: None,
                offset: None,
            }
        }
    }
}
