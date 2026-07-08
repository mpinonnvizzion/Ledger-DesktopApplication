# Database Architecture

**Version:** 1.0
**Last Updated:** 2026-07-07
**Scope:** Sprints 2–4 (Milestone 2: Local Data Platform)

---

## Purpose

This document defines how Ledger Desktop uses SQLite as its local data store. It covers connection lifecycle, migration strategy, durability, and testing — everything a developer needs to implement the database layer in Sprint 2 without inventing decisions on the fly.

---

## SQLite's Role

SQLite is the single persistence layer for all user financial data. It is not a cache, a secondary store, or a sync target — it is the primary system of record.

This aligns with the product's local-first and offline-first principles. There is no server database. The SQLite file on disk is the user's data. See [ADR 0003](../adr/0003-local-first-data-ownership.md).

SQLite is well-suited for this role because:

- It is embedded (no separate process to manage)
- It is zero-configuration (no DBA, no tuning for typical use)
- It handles single-writer, concurrent-reader workloads well
- It is the most deployed database engine in the world
- The database is a single file the user can copy, move, or back up

---

## Database Location

The database file lives in Tauri's application data directory, which is OS-managed and appropriate for persistent user data:

| Platform | Typical Path |
|----------|-------------|
| macOS | `~/Library/Application Support/io.nvizzion.ledger/ledger.db` |
| Windows | `%APPDATA%\io.nvizzion.ledger\ledger.db` |

The exact path is determined at runtime by Tauri's `app_data_dir()` resolver using the bundle identifier `io.nvizzion.ledger`.

The application must document this location in the Settings page so users know where their data lives. This is a product requirement — users who own their data must be able to find it. See [Data Model Overview](../specifications/data-model-overview.md) and the backup architecture in [backup-and-restore.md](backup-and-restore.md).

---

## Connection Lifecycle

### Single Connection

Ledger Desktop is a single-user desktop application. A single SQLite connection is opened when the application starts and held for the lifetime of the process. There is no connection pool.

### Initialization Sequence

On application startup, the Rust backend must:

1. Resolve the database file path via Tauri's `app_data_dir()`
2. Create the directory if it does not exist
3. Open a SQLite connection (creating the file if it does not exist)
4. Execute `PRAGMA journal_mode = WAL`
5. Execute `PRAGMA foreign_keys = ON`
6. Execute `PRAGMA busy_timeout = 5000`
7. Run pending migrations
8. The connection is now ready for use

### Shutdown

On application exit, the connection is closed normally. SQLite handles this gracefully — incomplete WAL checkpoints are resolved on the next open.

### Thread Safety

Tauri commands run on a thread pool. The SQLite connection must be shared safely across command invocations. Use a `Mutex<Connection>` managed as Tauri application state. This serializes write access (appropriate for a single-user app) while keeping the API simple.

If read performance becomes a concern with large datasets in Sprint 4, a read-only connection pool can be added. Do not add this complexity before it is needed.

---

## WAL Mode

WAL (Write-Ahead Logging) mode is enabled on every connection open. WAL provides:

- Concurrent readers do not block writers
- Writers do not block readers
- Better performance for the read-heavy, single-writer workload of a desktop finance app
- Crash safety — incomplete transactions are rolled back on recovery

WAL creates two additional files alongside the database (`ledger.db-wal` and `ledger.db-shm`). These are managed automatically by SQLite and are not user-visible in normal operation. Backup documentation must mention that these files exist and may contain uncommitted data. See [backup-and-restore.md](backup-and-restore.md).

---

## Foreign Keys

Foreign key enforcement is off by default in SQLite and must be enabled per connection:

```sql
PRAGMA foreign_keys = ON;
```

This must be set on every connection open, before any queries execute. It ensures that referential integrity (e.g., a transaction referencing a valid account) is enforced at the database level, not just in application code.

Sprint 3 introduces foreign key relationships between domain entities. Sprint 2 enables the pragma as part of the connection initialization sequence so the constraint is always active.

---

## Migration Strategy

### Approach

Migrations are forward-only SQL scripts that run sequentially on application startup. Each migration has a unique version number and is applied exactly once.

### Migration Table

A `_migrations` table tracks which migrations have been applied:

```sql
CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Migration File Layout

```
src-tauri/migrations/
  0001_initial_schema.sql
  0002_add_categories.sql
  0003_add_transactions.sql
  ...
```

Files are named `NNNN_description.sql` and sorted by version number. The migration runner reads all files, compares against `_migrations`, and applies any that have not been run, in order.

### Migration Rules

- Migrations are append-only. Never modify a migration that has been released.
- Each migration must be safe to run on an empty database (first launch) and on an existing database (update).
- Destructive changes (dropping columns, deleting data) require careful consideration and should be documented in the migration file.
- Sprint 2 implements the migration runner. Sprint 3 and 4 add migrations for their respective entities.

### Reversibility

Rollback migrations are not implemented in Sprint 2. SQLite's `ALTER TABLE` support is limited (no `DROP COLUMN` before 3.35.0), making automatic rollbacks fragile. If a migration causes problems, the fix is a new forward migration that corrects the issue.

If rollback migrations become necessary, they should be proposed as an ADR.

---

## Schema Versioning

The application tracks schema version using the `_migrations` table. The highest applied migration version is the current schema version.

On startup, the application compares the current schema version against the expected version (determined by the set of migration files compiled into the binary). If the database has a higher version than the application expects, the application must refuse to open it and display an error — this prevents an older app version from corrupting a database created by a newer version.

---

## Data Types

SQLite uses dynamic typing, but Ledger should establish consistent conventions:

| Concept | SQLite Type | Convention |
|---------|------------|------------|
| Primary key | `INTEGER PRIMARY KEY` | Auto-increment via ROWID alias |
| Foreign key | `INTEGER NOT NULL` | References parent table's `id` |
| Text | `TEXT NOT NULL` | UTF-8 strings |
| Monetary amount | `INTEGER NOT NULL` | Store as cents (integer arithmetic avoids floating-point errors) |
| Date/time | `TEXT NOT NULL` | ISO 8601 format: `2026-07-07T12:00:00Z` |
| Boolean | `INTEGER NOT NULL` | 0 = false, 1 = true |
| Optional fields | Omit `NOT NULL` | Allow NULL only when the domain genuinely permits absence |
| Enum-like values | `TEXT NOT NULL` | Store as string (e.g., `'checking'`, `'savings'`) with CHECK constraints |

### Monetary Amounts as Integers

The v3 reference architecture stores amounts as `REAL` with `ROUND()`. This architecture stores amounts as integers representing the smallest currency unit (cents for USD). Integer arithmetic eliminates floating-point rounding errors that are unacceptable in financial software. The application layer converts between cents and display values.

See [ADR 0008](../adr/0008-monetary-amounts-as-integer-minor-units.md) for the full rationale, alternatives considered, and multi-currency considerations.

---

## Performance Considerations

### Indexes

Sprint 2 creates the base tables. Indexes should be added as entities and queries are defined in Sprints 3 and 4. At minimum, expect indexes on:

- `transactions.account_id`
- `transactions.category_id`
- `transactions.date`
- `accounts.workspace_id`
- `categories.workspace_id`

### Query Patterns

The repository layer (Sprint 3) should use parameterized queries exclusively. Never construct SQL by string concatenation. This prevents SQL injection and allows SQLite's query planner to cache prepared statements.

### Dataset Size Targets

Sprint 4 validates performance against representative datasets. Target benchmarks:

- 10,000 transactions: all queries < 50ms
- 50,000 transactions: list/filter queries < 100ms
- 100,000 transactions: list/filter queries < 200ms

These are stretch targets for Sprint 4. If they are not achievable with basic indexing, document the gap and defer optimization.

---

## Future Encryption

Database encryption is explicitly deferred per the [Security Model Specification](../specifications/security-model.md). The current security model uses an app-level password/PIN lock (Sprint 6) rather than database-level encryption.

If encryption is added later (via SQLCipher or application-level encryption), the migration path must:

- Convert an unencrypted database to encrypted without data loss
- Allow users to export data before encryption is applied
- Handle key storage via the OS keychain (macOS Keychain, Windows Credential Manager)
- Not break the backup workflow (encrypted backups require key management documentation)

Sprint 2 should not design for encryption. It should avoid decisions that would make future encryption impossible (e.g., do not hardcode assumptions about the database file being directly readable by external tools).

---

## Testing Strategy

### Unit Tests

Each migration file should have a corresponding test that:

1. Creates an in-memory SQLite database
2. Runs all migrations up to and including the one under test
3. Verifies the schema is correct (tables exist, columns match, constraints work)
4. Verifies foreign key constraints reject invalid data

### Integration Tests

The database service should have tests that:

1. Open a temporary database file
2. Run the full migration sequence
3. Perform basic CRUD operations
4. Verify data persists across close/reopen cycles
5. Verify WAL mode and foreign keys are enabled

### What Not to Test

Do not test SQLite itself. Trust that `INSERT`, `SELECT`, and `UPDATE` work. Test the application's schema, constraints, and data access logic.

---

## Sprint 2 Scope

Sprint 2 should implement:

- Database file location resolution
- Connection open with WAL mode, foreign keys, and busy timeout
- Migration table and runner
- Initial migration(s) for the schema foundation
- Database service abstraction that owns the connection
- Startup initialization sequence
- Tests for migrations and connection lifecycle
- Documentation of database file location in app (or at minimum, the mechanism for a future Settings display)

Sprint 2 should not implement:

- Domain entity tables (Sprint 3)
- Transaction tables (Sprint 4)
- Repository pattern (Sprint 3)
- Tauri commands for data access (Sprint 3)
- CSV import or export (Sprint 4 foundation)
- Encryption
- Backup UI
- Any frontend changes

---

## Related Documents

- [ADR 0003: Local-First Data Ownership](../adr/0003-local-first-data-ownership.md)
- [Data Model Overview](../specifications/data-model-overview.md)
- [Security Model](../specifications/security-model.md)
- [Backup and Restore Architecture](backup-and-restore.md)
- [Repository Architecture](repositories.md)
- [Error Handling Architecture](error-handling.md)
