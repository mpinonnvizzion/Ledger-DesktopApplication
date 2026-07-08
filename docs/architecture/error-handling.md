# Error Handling Architecture

**Version:** 1.0
**Last Updated:** 2026-07-07
**Scope:** Sprints 2–4 (Milestone 2: Local Data Platform)

---

## Purpose

This document defines how errors are categorized, propagated, and displayed in Ledger Desktop. Consistent error handling prevents information leakage, provides useful feedback to users, and makes debugging straightforward for developers.

---

## Error Categories

### Domain Errors (Rust Backend)

Errors that arise from business logic and data operations:

| Error | Meaning | Example |
|-------|---------|---------|
| `NotFound` | Requested entity does not exist | `get_account(999)` when no account 999 exists |
| `Validation` | Input fails a business rule | Account name is empty, invalid account type |
| `Conflict` | Operation violates uniqueness | Duplicate workspace name |
| `Database` | Unexpected SQLite error | Disk full, file locked, corruption |

### System Errors (Rust Backend)

Errors from the platform or runtime:

| Error | Meaning | Example |
|-------|---------|---------|
| `Io` | File system operation failed | Cannot create database directory |
| `Migration` | Schema migration failed | SQL syntax error in migration file |
| `State` | Application state is invalid | Database connection not initialized |

### Frontend Errors

Errors in the React layer:

| Error | Meaning | Example |
|-------|---------|---------|
| Command error | Tauri invoke returned an error | Validation failure from backend |
| Render error | Component threw during render | Null reference, bad data shape |
| Network error | IPC channel unavailable | Tauri process crashed (rare) |

---

## Rust Error Handling

### DomainError Enum

A single error enum for all domain-layer errors:

```rust
#[derive(Debug)]
pub enum DomainError {
    NotFound,
    Validation(String),
    Conflict(String),
    Database(String),
    Io(String),
    Migration(String),
}
```

### Error Conversion

Convert library errors at the boundary where they occur:

```rust
impl From<rusqlite::Error> for DomainError {
    fn from(err: rusqlite::Error) -> Self {
        match err {
            rusqlite::Error::QueryReturnedNoRows => DomainError::NotFound,
            _ => DomainError::Database(err.to_string()),
        }
    }
}
```

### The `?` Operator

Use Rust's `?` operator to propagate errors up the call stack. Each layer converts to `DomainError` at its boundary:

```
SQLite error → rusqlite::Error → DomainError (at repository) → CommandError (at command)
```

---

## Command Error Boundary

Tauri commands are the final Rust layer before the frontend. They convert `DomainError` into a serializable `CommandError`:

```rust
#[derive(Debug, serde::Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl From<DomainError> for CommandError {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::NotFound => CommandError {
                code: "not_found".into(),
                message: "The requested resource was not found.".into(),
            },
            DomainError::Validation(msg) => CommandError {
                code: "validation_error".into(),
                message: msg,
            },
            DomainError::Conflict(msg) => CommandError {
                code: "conflict".into(),
                message: msg,
            },
            DomainError::Database(_) => CommandError {
                code: "database_error".into(),
                message: "A database error occurred. Please try again.".into(),
            },
            DomainError::Io(_) => CommandError {
                code: "internal_error".into(),
                message: "An internal error occurred.".into(),
            },
            DomainError::Migration(_) => CommandError {
                code: "internal_error".into(),
                message: "A database migration error occurred.".into(),
            },
        }
    }
}
```

### Key Rule: Internal Details Are Stripped

The `CommandError.message` for `Database`, `Io`, and `Migration` errors is generic. The actual SQLite error message, file path, or migration name is not sent to the frontend. Internal details are logged on the Rust side.

---

## Frontend Error Display

### User-Facing Errors

Only display error messages that help the user take action:

| Code | User Message | Action |
|------|-------------|--------|
| `validation_error` | Show the specific validation message | User corrects input |
| `not_found` | "This item no longer exists" | Navigate away or refresh |
| `conflict` | Show the specific conflict message | User changes input |
| `database_error` | "Something went wrong. Please try again." | User retries |
| `internal_error` | "Something went wrong. Please restart the app." | User restarts |

### What Not to Show Users

- SQLite error codes or messages
- File paths
- Stack traces
- Migration names or SQL
- Rust panic messages

---

## Logging Philosophy

### What to Log

- All `Database`, `Io`, and `Migration` errors with full detail (error message, context)
- Failed operations with enough context to reproduce (command name, parameter summary)
- Migration execution (which migrations ran, success/failure)
- Application startup sequence (database opened, migrations complete)

### What Not to Log

- User financial data (account balances, transaction amounts, payee names)
- Full parameter values for commands (may contain PII)
- Successful routine operations (individual CRUD calls)

### Log Destination

During development and Milestone 2, log to `stderr` (Rust's `eprintln!` or a structured logger like `tracing`). A formal logging framework decision (and potential file-based logging) can be made in a future sprint.

Do not log to a file by default in production without user consent. This is a privacy consideration — log files on disk could contain error context that reveals information about the user's financial data.

### Privacy Rule

If an error message might contain user data (e.g., a validation error that includes the input value), sanitize before logging. Log the error type and code, not the user-provided content.

---

## Panic Policy

### Do Not Panic in Production Code

Repositories and commands must not use `unwrap()` or `expect()` on fallible operations in production paths. Use `?` to propagate errors.

### Acceptable Panics

- In test code (`unwrap()` in tests is fine)
- For invariants that genuinely cannot be violated (e.g., `Mutex` poisoning indicates a previous panic — at that point, the app is already in an unrecoverable state)
- During application initialization if the database cannot be opened (the app cannot function without it)

### Startup Failures

If the database cannot be opened or migrations fail on startup, the application should display a clear error dialog and exit rather than launching in a broken state. This is the one place where "crash" is the correct behavior.

---

## Future: Crash Reporting

Crash reporting (e.g., Sentry) is a Sprint 11 consideration (Beta Hardening). When implemented:

- Crash reports must not contain financial data
- Reports should include: app version, OS version, error type, stack trace
- Reports should not include: database contents, file paths that reveal username, transaction data
- Crash reporting must be opt-in or clearly disclosed

Sprint 2–4 should not implement crash reporting. But error types should be designed so that they can be safely sent to a remote service later without modification.

---

## Sprint Scope

**Sprint 2**: Create `error.rs` with `DomainError` and `CommandError`. Implement error conversion for `rusqlite::Error`. Add error handling to database initialization and migration runner.

**Sprint 3**: Extend error handling to repository operations. Implement validation error messages. Add error display in frontend command wrappers.

**Sprint 4**: No new error categories expected. Extend existing patterns to transaction operations.

---

## Related Documents

- [Tauri Command Architecture](tauri-commands.md)
- [Repository Architecture](repositories.md)
- [State Management Architecture](state-management.md)
- [Security Model](../specifications/security-model.md)
