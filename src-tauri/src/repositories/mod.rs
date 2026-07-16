pub mod account;
pub mod category;
pub mod transaction_summary;
pub mod workspace;

#[cfg(test)]
pub mod test_helpers {
    use rusqlite::Connection;

    use crate::db::migration::run_migrations;

    pub fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        run_migrations(&conn).unwrap();
        conn
    }
}
