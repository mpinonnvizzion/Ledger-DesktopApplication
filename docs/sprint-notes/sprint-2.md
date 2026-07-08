# Sprint 2: Database Foundation — Implementation Plan

**Status:** Complete
**Date:** 2026-07-07

---

## Objective

Implement the local database foundation for Ledger Desktop. After Sprint 2, the application creates and manages a local SQLite database automatically. The database opens on launch with WAL mode, foreign key enforcement, and a forward-only migration system. A database service abstraction owns the connection lifecycle and is shared safely across Tauri command invocations.

Sprint 2 establishes the persistence platform. It does not create domain entities, repositories, finance workflows, or user-facing features.

---

## Scope

### In Scope

- SQLite crate integration in the Rust backend
- Database file creation in Tauri's application data directory
- Connection lifecycle (open, configure, share, close)
- PRAGMA configuration (WAL mode, foreign keys, busy timeout)
- Forward-only embedded migration framework
- Migration tracking table (`_migrations`)
- Schema version management and version-ahead detection
- Application state management (`AppState` with `Mutex<Connection>`)
- Database service abstraction (`src-tauri/src/db/`)
- Error types for database and migration failures
- Initial migration (`0001_initial_schema.sql`)
- WAL checkpoint utility function (backup foundation)
- Database health check command
- Unit tests for migration runner
- Integration tests for connection lifecycle and configuration
- Sprint 2 documentation updates

### Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Workspace, account, category tables | Sprint 3 |
| Transaction table | Sprint 4 |
| Repository pattern | Sprint 3 |
| Tauri CRUD commands | Sprint 3 |
| CSV import or export | Sprint 4 foundation |
| Budgets, goals, reports | Sprint 5 |
| Onboarding, app lock | Sprint 6 |
| Invoicing, clients, vendors | Sprint 7 |
| Licensing, Stripe | Sprint 8 |
| Plaid bank sync | Sprint 10 |
| Database encryption | Deferred per security model |
| Backup UI | Sprint 6+ |
| Frontend changes | No UI work in Sprint 2 |
| Business logic of any kind | Sprint 3+ |

---

## Architecture References

Sprint 2 implements the decisions documented in:

- [Database Architecture](../architecture/database.md) — Connection lifecycle, WAL mode, migrations, data types
- [Folder Structure](../architecture/folder-structure.md) — `db/` module layout
- [Error Handling](../architecture/error-handling.md) — `DomainError`, `CommandError`, error conversion
- [Backup and Restore](../architecture/backup-and-restore.md) — WAL checkpoint foundation
- [ADR 0003](../adr/0003-local-first-data-ownership.md) — Local-first data ownership
- [ADR 0008](../adr/0008-monetary-amounts-as-integer-minor-units.md) — Integer minor units for monetary amounts

---

## Implementation Sequence

### Phase A: SQLite Dependency and Project Organization

**Goal:** Add the SQLite crate to the Rust backend and create the module structure.

1. **Select and add the `rusqlite` crate** to `src-tauri/Cargo.toml`
   - Use `rusqlite` with the `bundled` feature (bundles SQLite source, avoiding system library dependency)
   - The `bundled` feature ensures consistent SQLite versions across macOS and Windows
   - Do not use `tauri-plugin-sql` — direct `rusqlite` gives full control over connection lifecycle, pragma configuration, and migration logic as specified in the database architecture

2. **Create the `db` module**
   ```
   src-tauri/src/db/
     mod.rs           # Module root, re-exports
     connection.rs    # Connection open, pragma setup, lifecycle
     migration.rs     # Migration runner, version tracking
   ```

3. **Create the error module**
   ```
   src-tauri/src/error.rs   # DomainError, CommandError, From impls
   ```

4. **Create the state module**
   ```
   src-tauri/src/state.rs   # AppState struct
   ```

5. **Create the migrations directory**
   ```
   src-tauri/migrations/
     0001_initial_schema.sql
   ```

6. **Update `lib.rs`** to declare new modules (`mod db`, `mod error`, `mod state`)

7. **Verify the project compiles** with `cargo check` in `src-tauri/`

**Verification:** `cargo check` succeeds. No runtime behavior changes.

---

### Phase B: Database Service and Connection Management

**Goal:** Implement the database service that opens, configures, and manages the SQLite connection.

8. **Implement `connection.rs`**
   - `open_database(app_data_dir: &Path) -> Result<Connection, DomainError>`
     - Create the data directory if it does not exist
     - Open `ledger.db` in the directory (create if not exists)
     - Execute `PRAGMA journal_mode = WAL`
     - Execute `PRAGMA foreign_keys = ON`
     - Execute `PRAGMA busy_timeout = 5000`
     - Return the configured connection
   - `verify_wal_mode(conn: &Connection) -> Result<(), DomainError>`
     - Query `PRAGMA journal_mode` and verify it returns `wal`
   - `verify_foreign_keys(conn: &Connection) -> Result<(), DomainError>`
     - Query `PRAGMA foreign_keys` and verify it returns `1`
   - `wal_checkpoint(conn: &Connection) -> Result<(), DomainError>`
     - Execute `PRAGMA wal_checkpoint(TRUNCATE)` (backup foundation)

9. **Implement `error.rs`**
   - Define `DomainError` enum with variants: `Database`, `Io`, `Migration`
     - Sprint 2 needs only these three. `NotFound`, `Validation`, `Conflict` are added in Sprint 3.
   - Define `CommandError` struct with `code: String`, `message: String`
   - Implement `From<rusqlite::Error> for DomainError`
   - Implement `From<std::io::Error> for DomainError`
   - Implement `From<DomainError> for CommandError`
   - Implement Tauri's `IntoResponse` trait or use `Result<T, String>` serialization as appropriate for the Tauri version
   - Strip internal details from `CommandError` messages (no SQLite error text, no file paths)

10. **Implement `state.rs`**
    - Define `AppState` struct holding `Mutex<Connection>`
    - `AppState` is registered as Tauri managed state in `lib.rs`

11. **Update `lib.rs`**
    - On Tauri `setup`, resolve `app_data_dir()`, call `open_database()`, run migrations, wrap in `AppState`, register as managed state
    - Keep existing `greet` command functional

**Verification:** Application launches. Database file is created in the app data directory. `greet` command still works.

---

### Phase C: Migration Framework

**Goal:** Implement the forward-only migration runner with version tracking.

12. **Implement `migration.rs`**
    - `run_migrations(conn: &Connection) -> Result<(), DomainError>`
      - Create `_migrations` table if it does not exist:
        ```sql
        CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        ```
      - Load all embedded migration files, sorted by version number
      - Query `_migrations` for the highest applied version
      - If the database version is higher than the highest embedded migration, return an error (version-ahead detection — prevents an older app from corrupting a newer database)
      - For each unapplied migration (in version order):
        - Begin a transaction
        - Execute the migration SQL
        - Insert a row into `_migrations`
        - Commit the transaction
      - If any migration fails, the transaction rolls back and the error propagates

13. **Embed migrations in the binary**
    - Use Rust's `include_str!()` macro or a build script to embed `.sql` files from `src-tauri/migrations/` into the compiled binary
    - Migrations must be available without reading from the filesystem at runtime (the app may be in a read-only install location)
    - Define a struct or array to hold migration metadata:
      ```rust
      struct Migration {
          version: i64,
          name: &'static str,
          sql: &'static str,
      }
      ```

14. **Create `0001_initial_schema.sql`**
    - This migration creates only the `_migrations` table (if the runner hasn't already via `CREATE TABLE IF NOT EXISTS`) and an `app_settings` key-value table for application configuration:
      ```sql
      CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT
      );
      ```
    - No domain entity tables. No finance tables. `app_settings` stores application-level configuration (database version display, future settings like default currency).

15. **Wire migrations into startup**
    - In `lib.rs` setup, call `run_migrations()` after `open_database()` returns the connection
    - If migrations fail, the application should log the error and exit (the app cannot function without a valid database)

**Verification:** Application launches, `_migrations` table exists with one row (version 1), `app_settings` table exists. On subsequent launches, the migration does not re-run.

---

### Phase D: Health Validation and Testing

**Goal:** Verify the database is configured correctly and write tests.

16. **Add a database info command**
    - Create `src-tauri/src/commands/system.rs` (or extend the existing `mod.rs`)
    - Implement `db_info` Tauri command that returns:
      ```rust
      #[derive(serde::Serialize)]
      pub struct DatabaseInfo {
          pub path: String,
          pub schema_version: i64,
          pub wal_mode: bool,
          pub foreign_keys: bool,
      }
      ```
    - Register `db_info` in `lib.rs` alongside `greet`
    - This command is a diagnostic tool. It is not a finance feature. It may be wired into the Settings page in a future sprint for the "database location" display requirement.

17. **Move `greet` to `system.rs`**
    - Move the existing `greet` command from `commands/mod.rs` to `commands/system.rs`
    - Update `mod.rs` to re-export from `system`
    - Verify the frontend `greet` call still works

18. **Write unit tests for `migration.rs`**
    - Test: `run_migrations` on an empty in-memory database creates `_migrations` and `app_settings`
    - Test: `run_migrations` is idempotent (running twice produces no error, no duplicate rows)
    - Test: A migration with invalid SQL returns `DomainError::Migration`
    - Test: Version-ahead detection returns an error when the database version exceeds the embedded migration count
    - Test: Each migration runs in a transaction (a failing migration does not leave partial changes)

19. **Write unit tests for `connection.rs`**
    - Test: `open_database` creates the directory and file if they do not exist
    - Test: WAL mode is enabled after `open_database`
    - Test: Foreign keys are enabled after `open_database`
    - Test: `busy_timeout` is set (verify via `PRAGMA busy_timeout`)
    - Test: `wal_checkpoint` executes without error

20. **Write integration tests**
    - Test: Open a temporary database, run migrations, close, reopen — data persists
    - Test: Open a temporary database, run migrations, verify `_migrations` has expected rows
    - Test: `AppState` wraps the connection and can be accessed from a simulated command context

**Verification:** All Rust tests pass (`cargo test` in `src-tauri/`). Frontend tests still pass (`npm run test`).

---

### Phase E: Documentation and Finalization

**Goal:** Update documentation and run full verification.

21. **Write Sprint 2 notes** (update this file's status from Planned to Complete)

22. **Update TASKS.md** — Mark Sprint 2 items as complete

23. **Update CHANGELOG.md** — Add Sprint 2 entry under `[Unreleased]`

24. **Update ARCHITECTURE.md** — Update status from "Sprint 1 Complete" to "Sprint 2 Complete"

25. **Run full verification**
    - `cargo check` in `src-tauri/` — compiles without errors
    - `cargo test` in `src-tauri/` — all Rust tests pass (Sprint 1 + Sprint 2)
    - `npm run build` — frontend build succeeds
    - `npm run lint` — no lint errors
    - `npm run format:check` — formatting passes
    - `npm run test` — frontend tests pass
    - `npm run dev` — application launches, database file is created, `greet` works
    - Verify database file exists at the expected path
    - Verify `_migrations` table has one row
    - Verify `app_settings` table exists

**Verification:** All commands exit 0. Database is created and configured correctly. No regressions in Sprint 1 functionality.

---

## Deliverables

| # | Deliverable | Verification |
|---|-------------|-------------|
| 1 | `rusqlite` integrated with `bundled` feature | `cargo check` succeeds |
| 2 | `db/` module with connection and migration logic | Module compiles, exports expected API |
| 3 | `error.rs` with `DomainError` and `CommandError` | Error types compile, conversions work |
| 4 | `state.rs` with `AppState` | State registered in Tauri builder |
| 5 | `0001_initial_schema.sql` embedded migration | `_migrations` and `app_settings` tables created |
| 6 | Forward-only migration runner with version tracking | Migrations apply once, version-ahead detected |
| 7 | WAL mode enabled | `PRAGMA journal_mode` returns `wal` |
| 8 | Foreign keys enabled | `PRAGMA foreign_keys` returns `1` |
| 9 | `db_info` command returns database status | Command callable from frontend |
| 10 | WAL checkpoint utility function | `wal_checkpoint()` available for backup foundation |
| 11 | Unit tests for migration runner | `cargo test` covers migration scenarios |
| 12 | Unit tests for connection lifecycle | `cargo test` covers connection configuration |
| 13 | Integration test for data persistence | Data survives close/reopen cycle |
| 14 | Documentation updated | TASKS.md, CHANGELOG.md, sprint notes updated |

---

## Acceptance Criteria

Sprint 2 is complete when all of the following are true:

1. The application creates a `ledger.db` file in the Tauri app data directory on first launch
2. The database opens successfully on every launch
3. WAL mode is enabled (verified by `PRAGMA journal_mode` returning `wal`)
4. Foreign keys are enabled (verified by `PRAGMA foreign_keys` returning `1`)
5. `busy_timeout` is set to 5000ms
6. The `_migrations` table exists and tracks applied migrations
7. The `app_settings` table exists
8. The initial migration (`0001`) is recorded in `_migrations`
9. Running the app again does not re-apply existing migrations
10. Version-ahead detection prevents an older app from opening a newer database
11. A `db_info` command returns the database path, schema version, WAL status, and foreign key status
12. `wal_checkpoint()` utility function exists and executes without error
13. All migration runner tests pass
14. All connection lifecycle tests pass
15. Data persists across app close and reopen
16. The `greet` command still works (no Sprint 1 regressions)
17. `cargo test`, `npm run test`, `npm run lint`, `npm run format:check`, and `npm run build` all pass
18. No domain entity tables exist (no workspaces, accounts, categories, transactions)
19. No repository layer exists
20. No finance logic exists
21. No user-visible finance functionality exists
22. No frontend changes beyond what is required to call `db_info` (if wired up)
23. TASKS.md, CHANGELOG.md, and sprint notes are updated

---

## Testing Requirements

### Rust Unit Tests

| Test | Module | Validates |
|------|--------|-----------|
| Migration creates tables | `migration.rs` | `_migrations` and `app_settings` exist after migration |
| Migration is idempotent | `migration.rs` | Running twice produces no error or duplicates |
| Invalid migration SQL fails | `migration.rs` | Returns `DomainError::Migration` |
| Version-ahead detected | `migration.rs` | Error when DB version > embedded version |
| Migration transaction rollback | `migration.rs` | Failed migration leaves no partial state |
| Connection creates directory | `connection.rs` | Directory created if missing |
| Connection creates file | `connection.rs` | `ledger.db` created if missing |
| WAL mode enabled | `connection.rs` | `PRAGMA journal_mode` returns `wal` |
| Foreign keys enabled | `connection.rs` | `PRAGMA foreign_keys` returns `1` |
| Busy timeout set | `connection.rs` | `PRAGMA busy_timeout` returns `5000` |
| WAL checkpoint runs | `connection.rs` | No error on `PRAGMA wal_checkpoint(TRUNCATE)` |

### Rust Integration Tests

| Test | Validates |
|------|-----------|
| Open → migrate → close → reopen → data persists | Full lifecycle |
| Open → migrate → verify `_migrations` contents | Migration tracking |
| AppState wraps connection | Tauri state integration |

### Frontend Tests (No Changes Expected)

Existing Sprint 1 tests must continue to pass. No new frontend tests are expected in Sprint 2.

---

## Documentation Updates

| Document | Update |
|----------|--------|
| TASKS.md | Mark Sprint 2 tasks as complete |
| CHANGELOG.md | Add Sprint 2 entry under `[Unreleased]` |
| ARCHITECTURE.md | Update status to "Sprint 2 Complete" |
| `docs/sprint-notes/sprint-2.md` | Update status from Planned to Complete |

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| `rusqlite` `bundled` feature increases compile time | Slower builds | High | Accept the tradeoff — bundled SQLite ensures consistent behavior across platforms. First build is slow; incremental builds are fast. |
| `rusqlite` `bundled` requires C compiler | Build fails on machines without a C toolchain | Low | macOS Xcode CLI tools and Windows Visual Studio Build Tools are already Sprint 1 prerequisites. Document in prerequisites if needed. |
| WAL mode creates additional files | User confusion about `ledger.db-wal` and `ledger.db-shm` | Low | Document in backup architecture (already covered). These files are managed automatically by SQLite. |
| App data directory does not exist | Database creation fails | Low | `open_database()` creates the directory. Tested in unit tests. |
| Migration fails on startup | Application cannot launch | Medium | Display a clear error and exit. Log the migration name and error. The user can restore from backup or contact support. |
| Tauri `setup` hook error handling | Startup crash without useful message | Medium | Wrap setup in proper error handling. Display a dialog or log before exiting. |
| `Mutex<Connection>` contention | Blocked Tauri commands | Low | Single-user desktop app with infrequent writes. Contention is negligible. Monitor in Sprint 4 performance validation. |

---

## Assumptions

- The development machine has a C compiler (required by `rusqlite` with `bundled` feature). This is already a Sprint 1 prerequisite (Xcode CLI tools on macOS, Visual Studio Build Tools on Windows).
- Tauri 2's `setup` hook provides access to `app_data_dir()` before commands are invoked.
- `rusqlite` with `bundled` compiles successfully on both macOS and Windows with the current Rust stable toolchain (1.96.1+).
- In-memory SQLite databases (`:memory:`) support WAL mode verification and PRAGMA configuration for testing purposes. (Note: WAL mode requires a file-based database. Tests that verify WAL should use a temporary file.)
- The `greet` command and existing frontend remain unchanged except for the structural move of `greet` from `commands/mod.rs` to `commands/system.rs`.

---

## Prerequisites

Before starting Sprint 2 implementation, verify:

- Rust stable toolchain (1.96.1+) is installed
- Node.js 20+ and npm are installed
- `npm run dev` launches the app successfully (Sprint 1 baseline)
- `cargo test` in `src-tauri/` passes (Sprint 1 tests)
- `npm run build`, `npm run lint`, `npm run format:check`, `npm run test` all pass

---

## Review Checklist

After implementation, verify each item before committing:

- [ ] `rusqlite` is in `Cargo.toml` with `bundled` feature
- [ ] `src-tauri/src/db/mod.rs` exists
- [ ] `src-tauri/src/db/connection.rs` exists
- [ ] `src-tauri/src/db/migration.rs` exists
- [ ] `src-tauri/src/error.rs` exists
- [ ] `src-tauri/src/state.rs` exists
- [ ] `src-tauri/migrations/0001_initial_schema.sql` exists
- [ ] `src-tauri/src/commands/system.rs` exists with `greet` and `db_info`
- [ ] `lib.rs` declares `mod db`, `mod error`, `mod state`
- [ ] `lib.rs` setup hook opens database, runs migrations, registers `AppState`
- [ ] `db_info` command is registered and callable
- [ ] `greet` command still works from the frontend
- [ ] `cargo check` succeeds
- [ ] `cargo test` passes — all Sprint 2 tests pass
- [ ] `npm run build` succeeds
- [ ] `npm run lint` exits 0
- [ ] `npm run format:check` exits 0
- [ ] `npm run test` exits 0
- [ ] `npm run dev` launches the app
- [ ] Database file created at expected path
- [ ] `_migrations` table has version 1
- [ ] `app_settings` table exists
- [ ] No workspace, account, category, or transaction tables exist
- [ ] No repository modules exist
- [ ] No finance commands exist
- [ ] No frontend changes except optional `db_info` wiring
- [ ] TASKS.md updated
- [ ] CHANGELOG.md updated
- [ ] Sprint 2 notes finalized

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SQLite crate | `rusqlite` with `bundled` | Direct control over connection, pragmas, and migrations. `bundled` avoids system SQLite version inconsistencies. |
| Migration approach | Embedded SQL files via `include_str!()` | Migrations are part of the binary. No filesystem dependency at runtime. Forward-only, no rollbacks. |
| Connection sharing | `Mutex<Connection>` in Tauri managed state | Simple, correct for single-user single-writer. Avoids premature connection pool complexity. |
| Health check | `db_info` Tauri command | Diagnostic tool usable from frontend. Foundation for Settings page database display. |

These are implementation choices within the architectural decisions already documented. No new ADRs are required.

---

## What Sprint 3 Will Build On

Sprint 2 delivers the platform that Sprint 3 extends. Sprint 3 will:

- Add domain entity tables via new migration files (`0002_workspaces.sql`, `0003_accounts.sql`, `0004_categories.sql`)
- Create the `repositories/` module using the `Connection` from `AppState`
- Create the `models/` module for domain types
- Add CRUD Tauri commands that call repositories
- Extend `DomainError` with `NotFound`, `Validation`, `Conflict` variants
- Create TypeScript API wrappers in `src/api/`

Sprint 2 must not implement any of this. But every decision in Sprint 2 should make Sprint 3's work straightforward.
