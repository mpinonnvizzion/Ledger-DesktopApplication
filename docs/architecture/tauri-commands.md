# Tauri Command Architecture

**Version:** 1.0
**Last Updated:** 2026-07-07
**Scope:** Sprints 2–4 (Milestone 2: Local Data Platform)

---

## Purpose

This document defines conventions for Tauri IPC commands — the boundary between the React frontend and the Rust backend. Every piece of data the frontend reads or writes passes through this boundary. Consistency here prevents a class of bugs and makes the API predictable for both frontend and backend developers.

---

## IPC Boundary Principle

The React frontend never accesses SQLite directly. All data operations go through Tauri's `invoke()` system:

```
React (TypeScript)  →  invoke("command_name", { args })  →  Rust Command  →  Repository  →  SQLite
```

This boundary exists because:

- **Security**: The frontend runs in a webview. Giving it direct database access would expose the SQL layer to the same risks as a web application (injection, unauthorized access).
- **Separation**: The Rust backend owns validation, business logic, and data integrity. The frontend owns presentation.
- **Testability**: Commands can be tested independently of the UI. Repositories can be tested independently of commands.
- **Platform safety**: Rust handles file I/O, OS integration, and concurrency. The frontend stays in its lane.

See [ADR 0002](../adr/0002-desktop-first-architecture.md).

---

## Naming Conventions

### Command Names

Commands use `snake_case` and follow the pattern `verb_entity` or `verb_entity_qualifier`:

| Pattern | Example |
|---------|---------|
| Create | `create_account` |
| Read one | `get_account` |
| Read list | `list_accounts` |
| Update | `update_account` |
| Delete | `delete_account` |
| Search | `search_transactions` |
| Specialized | `list_accounts_by_workspace` |

Avoid generic names like `get_data` or `execute_query`. Each command should describe exactly one operation.

### Module Organization

Commands are organized by domain entity:

```
src-tauri/src/commands/
  mod.rs           // re-exports all command modules
  workspace.rs
  account.rs
  category.rs
  transaction.rs   // Sprint 4
  system.rs        // app-level commands (db info, health check)
```

Each module registers its commands. The `mod.rs` re-exports them for registration in `lib.rs`.

---

## Request Shape

### Parameters

Command parameters use Tauri's `#[tauri::command]` attribute with named arguments. Arguments are deserialized from the frontend's `invoke()` call:

```rust
#[tauri::command]
pub fn create_account(
    state: tauri::State<'_, AppState>,
    workspace_id: i64,
    name: String,
    account_type: String,
    currency: String,
    institution_name: Option<String>,
) -> Result<Account, CommandError> {
    // ...
}
```

### Conventions

- Use primitive types and `String` for command parameters. Tauri deserializes these from JSON.
- Use `Option<T>` for optional parameters.
- Use `tauri::State<'_, AppState>` to access the shared database connection.
- Do not pass complex nested objects as parameters unless necessary. Flat parameter lists are easier to debug.
- Do not pass raw SQL, table names, or column names as parameters.

---

## Response Shape

### Success

Commands return the entity or result directly. Tauri serializes the return value to JSON for the frontend:

```rust
#[derive(serde::Serialize)]
pub struct Account {
    pub id: i64,
    pub workspace_id: i64,
    pub name: String,
    pub account_type: String,
    pub currency: String,
    pub balance: i64,
    pub institution_name: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}
```

For list operations, return `Vec<T>`. For delete operations, return `()`.

### Monetary Values

Monetary amounts are returned as integers (cents). The frontend converts to display format. This keeps the IPC boundary unambiguous — there is no question about decimal precision.

---

## Error Response Shape

Commands return `Result<T, CommandError>` where `CommandError` is serialized as a structured error for the frontend:

```rust
#[derive(Debug, serde::Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}
```

### Error Codes

| Code | Meaning | HTTP Analogue |
|------|---------|---------------|
| `not_found` | Entity does not exist | 404 |
| `validation_error` | Input failed a business rule | 400 |
| `conflict` | Uniqueness constraint violated | 409 |
| `database_error` | Unexpected database failure | 500 |
| `internal_error` | Unexpected application failure | 500 |

Error codes are stable strings the frontend can match on. Error messages are human-readable and may change.

### Error Conversion

Commands convert `DomainError` from the repository layer into `CommandError`:

```rust
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
            // ...
        }
    }
}
```

See [error-handling.md](error-handling.md) for the full error strategy.

---

## TypeScript Wrapper

### Pattern

The frontend accesses commands through typed wrappers in `src/api/`. Each domain gets its own file:

```
src/api/
  client.ts       // generic invoke helper (exists from Sprint 1)
  accounts.ts
  workspaces.ts
  categories.ts
  transactions.ts  // Sprint 4
```

### Wrapper Example

```typescript
import { invoke } from "@tauri-apps/api/core";

export interface Account {
  id: number;
  workspace_id: number;
  name: string;
  account_type: string;
  currency: string;
  balance: number;
  institution_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  workspace_id: number;
  name: string;
  account_type: string;
  currency: string;
  institution_name?: string;
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  return invoke("create_account", input);
}

export async function listAccountsByWorkspace(workspaceId: number): Promise<Account[]> {
  return invoke("list_accounts_by_workspace", { workspaceId });
}
```

### Conventions

- TypeScript interfaces mirror Rust response structs.
- Functions are named to match the Rust command (camelCase in TypeScript, snake_case in Rust).
- All functions return `Promise<T>` — the frontend handles loading and error states.
- Error handling is centralized in a shared error handler or per-call try/catch. See [state-management.md](state-management.md).

---

## Command Scope

### What Commands Should Do

1. Extract parameters from the invocation
2. Acquire the database connection from Tauri state
3. Call the appropriate repository method
4. Return the result (or convert the error)

### What Commands Should Not Do

- Contain SQL queries (belongs in repositories)
- Contain validation logic (belongs in repositories)
- Format data for display (belongs in the frontend)
- Manage UI state (belongs in the frontend)
- Access the filesystem directly for user data (belongs in dedicated system commands)

A command is a thin adapter between the IPC boundary and the domain layer. If a command function is longer than ~20 lines, logic is likely leaking into it that belongs elsewhere.

---

## Security Considerations

- **No raw SQL**: Commands never accept SQL strings as parameters.
- **Parameterized queries**: All database access uses parameterized queries (enforced at the repository layer).
- **Input validation**: Repositories validate all input before database operations.
- **No filesystem paths from frontend**: The frontend never sends file paths for database operations. The backend resolves all paths.
- **State isolation**: Each Tauri command invocation gets its own set of parameters. There is no shared mutable state beyond the database connection.

---

## Registration

All commands are registered in `src-tauri/src/lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    commands::greet,
    commands::workspace::create_workspace,
    commands::workspace::list_workspaces,
    commands::account::create_account,
    commands::account::list_accounts_by_workspace,
    // ...
])
```

Commands must be registered to be callable from the frontend. Unregistered commands fail silently from the frontend's perspective.

---

## Sprint Scope

**Sprint 2**: No new data commands. The `greet` proof-of-concept remains. Sprint 2 focuses on the database layer.

**Sprint 3**: Introduces CRUD commands for workspaces, accounts, and categories.

**Sprint 4**: Introduces CRUD, search, and filter commands for transactions. Adds the import data path.

---

## Related Documents

- [ADR 0002: Desktop-First Architecture](../adr/0002-desktop-first-architecture.md)
- [Repository Architecture](repositories.md)
- [Error Handling Architecture](error-handling.md)
- [State Management Architecture](state-management.md)
- [Folder Structure](folder-structure.md)
