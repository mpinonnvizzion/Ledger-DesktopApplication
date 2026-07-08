# Repository Architecture

**Version:** 1.0
**Last Updated:** 2026-07-07
**Scope:** Sprints 3–4 (Milestone 2: Local Data Platform)

---

## Purpose

This document defines the repository pattern used in Ledger Desktop's Rust backend. Repositories are the boundary between domain logic and SQLite persistence. They provide a clean, testable interface for data access while enforcing validation rules and transaction integrity.

---

## Why Repositories

Ledger Desktop has three layers in its backend:

```
Tauri Commands  →  Repositories  →  SQLite
(IPC boundary)    (domain logic)   (persistence)
```

Without repositories, Tauri commands would contain SQL queries, validation logic, and error mapping mixed together. Repositories separate these concerns:

| Layer | Responsibility |
|-------|---------------|
| Tauri commands | Deserialize request, call repository, serialize response |
| Repositories | Validate domain rules, execute queries, map errors |
| SQLite | Store and retrieve data |

This separation matters because:

- **Testability**: Repositories can be tested against an in-memory SQLite database without Tauri's IPC layer.
- **Maintainability**: Changing a query or validation rule doesn't require modifying the command interface.
- **Consistency**: All data access flows through a single codepath per entity.

---

## Repository Boundaries

### What Belongs in a Repository

- CRUD operations for a single domain entity
- Query methods (list, search, filter) for that entity
- Input validation before data reaches the database
- Foreign key existence checks (e.g., does this `account_id` exist?)
- Error mapping from SQLite errors to domain errors
- Transaction boundaries for multi-step operations

### What Does Not Belong in a Repository

- IPC serialization or deserialization (belongs in Tauri commands)
- UI-specific formatting (belongs in the frontend)
- Cross-entity business logic that spans multiple repositories (belongs in a service layer if needed, but avoid premature abstraction)
- Direct database connection management (belongs in the database service)

---

## Repository Structure

Each domain entity gets its own repository module:

```
src-tauri/src/
  repositories/
    mod.rs
    workspace.rs
    account.rs
    category.rs
    transaction.rs    (Sprint 4)
```

Each repository is a struct that holds a reference to the database connection:

```rust
pub struct AccountRepository<'a> {
    conn: &'a Connection,
}

impl<'a> AccountRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn create(&self, input: CreateAccountInput) -> Result<Account, DomainError> {
        // validate input
        // insert into database
        // return created entity
    }

    pub fn get_by_id(&self, id: i64) -> Result<Account, DomainError> { ... }
    pub fn list_by_workspace(&self, workspace_id: i64) -> Result<Vec<Account>, DomainError> { ... }
    pub fn update(&self, id: i64, input: UpdateAccountInput) -> Result<Account, DomainError> { ... }
    pub fn delete(&self, id: i64) -> Result<(), DomainError> { ... }
}
```

This is a guideline, not a rigid template. Repositories should model the domain, not a generic CRUD interface. Some entities will need specialized query methods (e.g., `transaction.search()`, `transaction.list_by_date_range()`).

---

## Domain Types

### Input Types

Each mutation operation takes a dedicated input struct:

```rust
pub struct CreateAccountInput {
    pub workspace_id: i64,
    pub name: String,
    pub account_type: AccountType,
    pub currency: String,
    pub institution_name: Option<String>,
}
```

Input types are plain data. They carry user-provided values before validation.

### Entity Types

Each entity has a struct representing a complete database row:

```rust
pub struct Account {
    pub id: i64,
    pub workspace_id: i64,
    pub name: String,
    pub account_type: AccountType,
    pub currency: String,
    pub balance: i64,  // cents
    pub institution_name: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}
```

Entity types are returned by repository methods and serialized by Tauri commands for the frontend.

### Enum Types

Use Rust enums for constrained value sets:

```rust
pub enum AccountType {
    Checking,
    Savings,
    CreditCard,
    Cash,
    Investment,
    Loan,
    Other,
}
```

Enums map to `TEXT` columns in SQLite via serialization/deserialization.

---

## Validation

Repositories validate input before it reaches the database. Validation happens in the repository, not in the Tauri command or the frontend.

### Validation Rules

- **Required fields**: Non-optional fields must be non-empty
- **String length**: Names and descriptions must have reasonable maximum lengths
- **Referential integrity**: Foreign keys must reference existing entities (check via query before insert)
- **Business rules**: Account types must be valid enum values, amounts must be non-negative where appropriate, dates must be valid ISO 8601

### Frontend Validation

The frontend may perform its own validation for UX purposes (e.g., showing an error before the user submits). But the frontend validation is advisory — the repository is the authority. The frontend should never assume that its validation is sufficient.

---

## Transaction Boundaries

### Single-Entity Operations

Most repository operations are single SQL statements and do not need explicit transaction management. SQLite wraps each statement in an implicit transaction.

### Multi-Step Operations

Operations that require multiple SQL statements to maintain consistency must use explicit transactions:

```rust
pub fn delete_workspace(&self, id: i64) -> Result<(), DomainError> {
    let tx = self.conn.transaction()?;
    // delete accounts in workspace
    // delete categories in workspace
    // delete the workspace
    tx.commit()?;
    Ok(())
}
```

The rule: if a failure partway through would leave the database in an inconsistent state, use an explicit transaction.

### Cross-Repository Transactions

If an operation spans multiple repositories (e.g., deleting a workspace cascades to accounts and categories), the Tauri command should acquire the connection lock, begin a transaction, pass the transaction to each repository, and commit.

Avoid this pattern unless necessary. Prefer cascade deletes via `ON DELETE CASCADE` foreign key constraints where semantically correct.

---

## Error Propagation

Repositories return `Result<T, DomainError>`. See [error-handling.md](error-handling.md) for the full error taxonomy.

Repository errors should be meaningful to the caller:

- `DomainError::NotFound` — entity does not exist
- `DomainError::Validation(message)` — input failed a business rule
- `DomainError::Conflict` — operation violates a uniqueness constraint
- `DomainError::Database(message)` — unexpected SQLite error

Repositories must not expose raw SQLite error codes to callers. Map `rusqlite` errors to domain errors at the repository boundary.

---

## Testability

### In-Memory Database Tests

Repository tests use an in-memory SQLite database with all migrations applied:

```rust
fn setup_test_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    run_all_migrations(&conn).unwrap();
    conn
}

#[test]
fn create_account_validates_workspace_exists() {
    let conn = setup_test_db();
    let repo = AccountRepository::new(&conn);
    let result = repo.create(CreateAccountInput {
        workspace_id: 999, // does not exist
        name: "Checking".to_string(),
        ..Default::default()
    });
    assert!(matches!(result, Err(DomainError::Validation(_))));
}
```

### What to Test

- Each CRUD operation (create, read, update, delete)
- Validation rejects invalid input
- Foreign key references are checked
- List/filter methods return correct results
- Delete cascades work as expected
- Concurrent operations on the same entity (if relevant)

### What Not to Test

- SQLite query engine behavior
- Rust standard library
- Tauri framework internals

---

## What Belongs Where: Repository vs. Command vs. Frontend

| Concern | Where |
|---------|-------|
| SQL queries | Repository |
| Input validation | Repository |
| Foreign key checks | Repository |
| Error mapping | Repository |
| Transaction management | Repository (or command for cross-repo) |
| IPC serialization | Tauri command |
| Request parameter extraction | Tauri command |
| Response formatting | Tauri command |
| Authorization checks (future) | Tauri command |
| User-facing error messages | Frontend |
| Form validation (UX) | Frontend |
| Data display formatting | Frontend |
| Navigation and routing | Frontend |

---

## Sprint Scope

**Sprint 3** introduces:
- Repository module structure
- Workspace repository (CRUD)
- Account repository (CRUD + list by workspace)
- Category repository (CRUD + seed data + list by workspace)
- Domain types for all Sprint 3 entities
- Validation layer
- Repository tests

**Sprint 4** adds:
- Transaction repository (CRUD + search + filter)
- Import foundation (bulk insert path)
- Performance validation against representative datasets

---

## Related Documents

- [Database Architecture](database.md)
- [Tauri Command Architecture](tauri-commands.md)
- [Error Handling Architecture](error-handling.md)
- [Folder Structure](folder-structure.md)
- [Data Model Overview](../specifications/data-model-overview.md)
