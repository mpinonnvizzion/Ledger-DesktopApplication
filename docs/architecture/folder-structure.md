# Folder Structure Architecture

**Version:** 1.0
**Last Updated:** 2026-07-07
**Scope:** Sprints 2–4 (Milestone 2: Local Data Platform)

---

## Purpose

This document defines the intended folder structure for Ledger Desktop as the local data platform is built. It covers both the Rust backend and the React frontend, establishing conventions that prevent structural drift during Sprints 2–4.

---

## Current State (After Sprint 1)

```
ledger-app/
├── src/                          # React frontend
│   ├── api/
│   │   └── client.ts            # Tauri invoke wrapper (proof of concept)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   └── ui/                  # (empty, future shared primitives)
│   ├── hooks/                   # (empty, future custom hooks)
│   ├── lib/                     # (empty, future utilities)
│   ├── pages/
│   │   ├── Accounts.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Dashboard.test.tsx
│   │   ├── Settings.tsx
│   │   └── Transactions.tsx
│   ├── test/
│   │   └── setup.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── commands/
│   │   │   └── mod.rs           # greet command (proof of concept)
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── rustfmt.toml
├── docs/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── ...
```

---

## Target State (End of Milestone 2)

### Rust Backend

```
src-tauri/
├── src/
│   ├── commands/
│   │   ├── mod.rs               # Re-exports all command modules
│   │   ├── system.rs            # App-level commands (greet, db_info)
│   │   ├── workspace.rs         # Workspace CRUD commands (Sprint 3)
│   │   ├── account.rs           # Account CRUD commands (Sprint 3)
│   │   ├── category.rs          # Category CRUD commands (Sprint 3)
│   │   └── transaction.rs       # Transaction CRUD + search (Sprint 4)
│   ├── db/
│   │   ├── mod.rs               # Database module root
│   │   ├── connection.rs        # Connection open, pragma setup, lifecycle
│   │   └── migration.rs         # Migration runner
│   ├── repositories/
│   │   ├── mod.rs               # Re-exports all repositories
│   │   ├── workspace.rs         # Workspace repository (Sprint 3)
│   │   ├── account.rs           # Account repository (Sprint 3)
│   │   ├── category.rs          # Category repository (Sprint 3)
│   │   └── transaction.rs       # Transaction repository (Sprint 4)
│   ├── models/
│   │   ├── mod.rs               # Re-exports all domain types
│   │   ├── workspace.rs         # Workspace entity + input types
│   │   ├── account.rs           # Account entity + input types
│   │   ├── category.rs          # Category entity + input types
│   │   └── transaction.rs       # Transaction entity + input types (Sprint 4)
│   ├── error.rs                 # DomainError, CommandError definitions
│   ├── state.rs                 # AppState (holds DB connection)
│   ├── lib.rs                   # Tauri builder + command registration
│   └── main.rs                  # Entry point
├── migrations/
│   ├── 0001_initial_schema.sql  # Migration table, app_settings (Sprint 2)
│   ├── 0002_workspaces.sql      # Workspace table (Sprint 3)
│   ├── 0003_accounts.sql        # Account table (Sprint 3)
│   ├── 0004_categories.sql      # Category table + seed data (Sprint 3)
│   └── 0005_transactions.sql    # Transaction table + indexes (Sprint 4)
├── Cargo.toml
├── tauri.conf.json
└── rustfmt.toml
```

### Frontend (Minimal changes in Milestone 2)

```
src/
├── api/
│   ├── client.ts                # Generic invoke helper
│   ├── workspaces.ts            # Workspace command wrappers (Sprint 3)
│   ├── accounts.ts              # Account command wrappers (Sprint 3)
│   ├── categories.ts            # Category command wrappers (Sprint 3)
│   └── transactions.ts          # Transaction command wrappers (Sprint 4)
├── components/
│   ├── layout/                  # Unchanged
│   └── ui/                      # Unchanged
├── hooks/                       # Unchanged
├── lib/
│   ├── errors.ts                # Error types and helper (Sprint 3)
│   └── format.ts                # Amount/date formatting utilities (Sprint 3)
├── pages/                       # Unchanged (no new UI pages in Milestone 2)
├── test/
│   └── setup.ts
├── types/
│   └── domain.ts                # Shared TypeScript interfaces (Sprint 3)
├── App.tsx
├── main.tsx
├── index.css
└── vite-env.d.ts
```

---

## Naming Conventions

### Rust

| Item | Convention | Example |
|------|-----------|---------|
| Files | `snake_case.rs` | `account.rs` |
| Modules | `snake_case` | `mod repositories` |
| Structs | `PascalCase` | `Account`, `CreateAccountInput` |
| Functions | `snake_case` | `create_account`, `list_by_workspace` |
| Enums | `PascalCase` | `AccountType` |
| Enum variants | `PascalCase` | `AccountType::CreditCard` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_NAME_LENGTH` |
| Tauri commands | `snake_case` | `#[tauri::command] fn create_account` |

### TypeScript / React

| Item | Convention | Example |
|------|-----------|---------|
| Files (components) | `PascalCase.tsx` | `AccountList.tsx` |
| Files (utilities) | `camelCase.ts` | `formatAmount.ts` |
| Files (api) | `camelCase.ts` | `accounts.ts` |
| Components | `PascalCase` | `AccountList` |
| Functions | `camelCase` | `createAccount` |
| Interfaces/Types | `PascalCase` | `Account`, `CreateAccountInput` |
| Constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_CURRENCY` |
| Hooks | `camelCase` with `use` prefix | `useAccounts` |

### Migration Files

`NNNN_description.sql` — four-digit version number, underscore, lowercase description with underscores.

---

## Module Responsibilities

### `src-tauri/src/db/`

Owns database connection setup, pragma initialization, and migration execution. Does not contain domain logic or entity definitions. Sprint 2 creates this module.

### `src-tauri/src/models/`

Owns domain entity definitions (structs, enums, input types). These are plain data types with `Serialize`/`Deserialize` derives. They do not contain database logic. Sprint 3 creates this module.

### `src-tauri/src/repositories/`

Owns data access logic — queries, validation, error mapping. Each file corresponds to one domain entity. Sprint 3 creates this module.

### `src-tauri/src/commands/`

Owns Tauri command functions. Each file corresponds to one domain entity. Commands are thin adapters that call repositories. Already exists from Sprint 1 with the `greet` proof of concept.

### `src-tauri/src/error.rs`

Owns error type definitions shared across the backend. Sprint 2 creates this file.

### `src-tauri/src/state.rs`

Owns the `AppState` struct that holds the database connection (via `Mutex<Connection>`). Sprint 2 creates this file.

---

## Testing Organization

### Rust Tests

```
src-tauri/src/
├── db/
│   ├── connection.rs            # #[cfg(test)] mod tests { ... }
│   └── migration.rs             # #[cfg(test)] mod tests { ... }
├── repositories/
│   ├── workspace.rs             # #[cfg(test)] mod tests { ... }
│   ├── account.rs               # #[cfg(test)] mod tests { ... }
│   └── ...
```

Rust tests live inline with the module they test, using `#[cfg(test)]` blocks. This is the standard Rust convention.

Integration tests that span multiple modules go in `src-tauri/tests/` if needed, but prefer unit tests within modules for Milestone 2.

### Frontend Tests

```
src/
├── pages/
│   ├── Dashboard.test.tsx       # Co-located with component
│   └── ...
├── lib/
│   ├── format.test.ts           # Co-located with utility
│   └── ...
```

Frontend tests are co-located with the file they test. Use `*.test.ts` or `*.test.tsx` suffix.

---

## What Should Not Be Added Yet

During Milestone 2, do not create:

| Directory/File | Reason |
|---------------|--------|
| `src-tauri/src/crypto/` | Encryption is deferred (Security Model) |
| `src-tauri/src/plaid/` | Plaid is Milestone 5 (Sprint 10) |
| `src-tauri/src/licensing/` | Licensing is Sprint 8 |
| `src/pages/Budget*.tsx` | Budgets are Sprint 5 |
| `src/pages/Invoice*.tsx` | Invoicing is Sprint 7 |
| `src/pages/Onboarding*.tsx` | Onboarding is Sprint 6 |
| `src/stores/` | No state library during Milestone 2 |
| `relay/` | Cloud relay is Sprint 10 |
| `landing/` | Landing page is Sprint 12 |
| `src-tauri/src/services/` | Premature abstraction — revisit if cross-repository logic emerges |

---

## Documentation Ownership

| Document | Location | Responsibility |
|----------|----------|---------------|
| Architecture docs | `docs/architecture/` | How the system is built |
| ADRs | `docs/adr/` | Why decisions were made |
| Specifications | `docs/specifications/` | What the product does |
| Sprint notes | `docs/sprint-notes/` | What was done and learned |
| Business docs | `docs/business/` | Product and business direction |
| API docs (future) | Inline Rust doc comments | Per-function documentation |

---

## Related Documents

- [Database Architecture](database.md)
- [Repository Architecture](repositories.md)
- [Tauri Command Architecture](tauri-commands.md)
- [Error Handling Architecture](error-handling.md)
