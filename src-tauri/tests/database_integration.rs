use std::sync::Mutex;
use tempfile::TempDir;

use ledger_desktop_lib::db::connection::open_database;
use ledger_desktop_lib::db::migration::{get_schema_version, run_migrations};

#[test]
fn data_persists_across_close_and_reopen() {
    let tmp = TempDir::new().unwrap();

    {
        let conn = open_database(tmp.path()).unwrap();
        run_migrations(&conn).unwrap();

        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES ('test_key', 'test_value')",
            [],
        )
        .unwrap();
    }

    {
        let conn = open_database(tmp.path()).unwrap();
        let value: String = conn
            .query_row(
                "SELECT value FROM app_settings WHERE key = 'test_key'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(value, "test_value");
    }
}

#[test]
fn migrations_table_has_expected_rows() {
    let tmp = TempDir::new().unwrap();
    let conn = open_database(tmp.path()).unwrap();
    run_migrations(&conn).unwrap();

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM _migrations", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 1);

    let version: i64 = conn
        .query_row("SELECT version FROM _migrations WHERE version = 1", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(version, 1);

    let name: String = conn
        .query_row("SELECT name FROM _migrations WHERE version = 1", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(name, "initial_schema");
}

#[test]
fn app_state_wraps_connection() {
    let tmp = TempDir::new().unwrap();
    let conn = open_database(tmp.path()).unwrap();
    run_migrations(&conn).unwrap();

    let state = Mutex::new(conn);

    let locked = state.lock().unwrap();
    let version = get_schema_version(&locked).unwrap();
    assert_eq!(version, 1);
}
