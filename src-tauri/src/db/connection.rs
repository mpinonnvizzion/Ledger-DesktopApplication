use std::fs;
use std::path::Path;

use rusqlite::Connection;

use crate::error::DomainError;

const DB_FILENAME: &str = "ledger.db";

pub fn open_database(app_data_dir: &Path) -> Result<Connection, DomainError> {
    fs::create_dir_all(app_data_dir)?;

    let db_path = app_data_dir.join(DB_FILENAME);
    let conn = Connection::open(&db_path)?;

    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "busy_timeout", "5000")?;

    Ok(conn)
}

pub fn verify_wal_mode(conn: &Connection) -> Result<(), DomainError> {
    let mode: String = conn.pragma_query_value(None, "journal_mode", |row| row.get(0))?;
    if mode.to_lowercase() != "wal" {
        return Err(DomainError::Database(format!(
            "Expected WAL mode, got '{}'",
            mode
        )));
    }
    Ok(())
}

pub fn verify_foreign_keys(conn: &Connection) -> Result<(), DomainError> {
    let enabled: i32 = conn.pragma_query_value(None, "foreign_keys", |row| row.get(0))?;
    if enabled != 1 {
        return Err(DomainError::Database(
            "Foreign keys are not enabled".to_string(),
        ));
    }
    Ok(())
}

pub fn wal_checkpoint(conn: &Connection) -> Result<(), DomainError> {
    conn.pragma_update(None, "wal_checkpoint", "TRUNCATE")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn open_database_creates_directory_and_file() {
        let tmp = TempDir::new().unwrap();
        let data_dir = tmp.path().join("nested").join("app_data");
        let conn = open_database(&data_dir).unwrap();
        assert!(data_dir.join(DB_FILENAME).exists());
        drop(conn);
    }

    #[test]
    fn open_database_enables_wal_mode() {
        let tmp = TempDir::new().unwrap();
        let conn = open_database(tmp.path()).unwrap();
        verify_wal_mode(&conn).unwrap();
    }

    #[test]
    fn open_database_enables_foreign_keys() {
        let tmp = TempDir::new().unwrap();
        let conn = open_database(tmp.path()).unwrap();
        verify_foreign_keys(&conn).unwrap();
    }

    #[test]
    fn open_database_sets_busy_timeout() {
        let tmp = TempDir::new().unwrap();
        let conn = open_database(tmp.path()).unwrap();
        let timeout: i32 = conn
            .pragma_query_value(None, "busy_timeout", |row| row.get(0))
            .unwrap();
        assert_eq!(timeout, 5000);
    }

    #[test]
    fn wal_checkpoint_runs_without_error() {
        let tmp = TempDir::new().unwrap();
        let conn = open_database(tmp.path()).unwrap();
        wal_checkpoint(&conn).unwrap();
    }
}
