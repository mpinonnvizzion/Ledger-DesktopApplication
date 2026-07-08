# Sprint 3: Core Domain Entities — Implementation Plan

**Status:** Planned
**Date:** 2026-07-07

---

## Objective

Define and implement the core domain model and repository layer for Ledger Desktop. After Sprint 3, workspaces, accounts, and categories can be created, read, updated, and deleted through Tauri commands backed by a repository abstraction over SQLite. Domain types enforce validation rules, foreign key relationships are tested, and the foundation exists for Sprint 4's transaction engine.

Sprint 3 builds on the database platform from Sprint 2. It does not implement transactions, budgets, reports, goals, or any user-facing finance UI.

---

## Scope

### In Scope

- Domain entity migrations: `workspaces`, `accounts`, `categories` tables
- Database indexes on foreign key columns
- Domain model types in `src-tauri/src/models/` (entity structs, input structs, enums)
- Repository layer in `src-tauri/src/repositories/` (workspace, account, category)
- Input validation in repositories (required fields, string length, enum values, referential integrity)
- Tauri CRUD commands for workspaces, accounts, and categories
- Extended `DomainError` with `NotFound`, `Validation`, `Conflict` variants
- Updated `CommandError` conversion for new error variants
- Category seed data (default income and expense categories)
- TypeScript API wrappers in `src/api/` (workspaces, accounts, categories)
- TypeScript domain types in `src/types/domain.ts`
- Frontend error type helper in `src/lib/errors.ts`
- Amount formatting utility in `src/lib/format.ts`
- Unit tests for all repository CRUD and validation
- Integration tests for foreign key behavior and cascading
- Sprint 3 documentation updates

### Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Transaction table or CRUD | Sprint 4 |
| Transaction search or filtering | Sprint 4 |
| CSV import or export | Sprint 4 foundation |
| Budgets, goals, reports | Sprint 5 |
| Dashboard widgets or summary UI | Sprint 5 |
| Onboarding, app lock, security | Sprint 6 |
| Invoicing, clients, vendors | Sprint 7 |
| Licensing, Stripe | Sprint 8 |
| Plaid bank sync | Sprint 10 |
| Database encryption | Deferred per security model |
| Production finance UI (account list pages, category management pages) | Milestone 3+ |
| Frontend state management library | Not needed in Milestone 2 |
| Services layer | Premature abstraction — revisit only if cross-repository logic emerges |

---

## Architecture References

Sprint 3 implements the decisions documented in:

- [Repository Architecture](../architecture/repositories.md) — Repository pattern, domain types, validation, transaction boundaries
- [Tauri Command Architecture](../architecture/tauri-commands.md) — IPC conventions, naming, request/response shape, TypeScript wrappers
- [Error Handling Architecture](../architecture/error-handling.md) — Extended error types, validation errors, error display
- [Folder Structure](../architecture/folder-structure.md) — `models/`, `repositories/`, command module layout
- [Database Architecture](../architecture/database.md) — Data type conventions, foreign keys, indexes
- [ADR 0008](../adr/0008-monetary-amounts-as-integer-minor-units.md) — Integer minor units for monetary amounts
- [Data Model Overview](../specifications/data-model-overview.md) — Entity definitions and relationships

---

## Implementation Sequence

### Phase A: Domain Model Types

**Goal:** Define the Rust domain types that all repositories and commands use.

1. **Create the `models` module**
   ```
   src-tauri/src/models/
     mod.rs           # Re-exports all model modules
     workspace.rs     # Workspace entity, input types, WorkspaceType enum
     account.rs       # Account entity, input types, AccountType enum
     category.rs      # Category entity, input types, CategoryType enum
   ```

2. **Define workspace types in `models/workspace.rs`**
   - `WorkspaceType` enum: `Personal`, `Business`
     - Serialize/deserialize to/from lowercase TEXT (`"personal"`, `"business"`)
   - `Workspace` entity struct:
     - `id: i64`
     - `name: String`
     - `workspace_type: WorkspaceType`
     - `currency: String` (default `"USD"`)
     - `created_at: String` (ISO 8601)
     - `updated_at: String` (ISO 8601)
   - `CreateWorkspaceInput`: `name: String`, `workspace_type: WorkspaceType`, `currency: Option<String>`
   - `UpdateWorkspaceInput`: `name: Option<String>`, `currency: Option<String>`
   - Derive `Serialize` on entity types, `Deserialize` on input types and enums

3. **Define account types in `models/account.rs`**
   - `AccountType` enum: `Checking`, `Savings`, `CreditCard`, `Cash`, `Investment`, `Loan`, `Other`
     - Serialize/deserialize to/from lowercase TEXT
   - `Account` entity struct:
     - `id: i64`
     - `workspace_id: i64`
     - `name: String`
     - `account_type: AccountType`
     - `currency: String`
     - `balance: i64` (cents, per ADR 0008)
     - `institution_name: Option<String>`
     - `is_active: bool`
     - `created_at: String`
     - `updated_at: String`
   - `CreateAccountInput`: `workspace_id: i64`, `name: String`, `account_type: AccountType`, `currency: Option<String>`, `institution_name: Option<String>`
   - `UpdateAccountInput`: `name: Option<String>`, `institution_name: Option<String>`, `is_active: Option<bool>`

4. **Define category types in `models/category.rs`**
   - `CategoryType` enum: `Income`, `Expense`
     - Serialize/deserialize to/from lowercase TEXT
   - `Category` entity struct:
     - `id: i64`
     - `workspace_id: i64`
     - `name: String`
     - `category_type: CategoryType`
     - `parent_id: Option<i64>`
     - `is_system: bool`
     - `created_at: String`
     - `updated_at: String`
   - `CreateCategoryInput`: `workspace_id: i64`, `name: String`, `category_type: CategoryType`, `parent_id: Option<i64>`
   - `UpdateCategoryInput`: `name: Option<String>`, `parent_id: Option<i64>`

5. **Update `lib.rs`** to declare `pub mod models`

**Verification:** `cargo check` succeeds. No runtime behavior changes.

---

### Phase B: Database Migrations

**Goal:** Create the domain entity tables with foreign keys and indexes.

6. **Create `0002_workspaces.sql`**
   ```sql
   CREATE TABLE workspaces (
       id INTEGER PRIMARY KEY,
       name TEXT NOT NULL,
       workspace_type TEXT NOT NULL CHECK(workspace_type IN ('personal', 'business')),
       currency TEXT NOT NULL DEFAULT 'USD',
       created_at TEXT NOT NULL DEFAULT (datetime('now')),
       updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```

7. **Create `0003_accounts.sql`**
   ```sql
   CREATE TABLE accounts (
       id INTEGER PRIMARY KEY,
       workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
       name TEXT NOT NULL,
       account_type TEXT NOT NULL CHECK(account_type IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'loan', 'other')),
       currency TEXT NOT NULL DEFAULT 'USD',
       balance INTEGER NOT NULL DEFAULT 0,
       institution_name TEXT,
       is_active INTEGER NOT NULL DEFAULT 1,
       created_at TEXT NOT NULL DEFAULT (datetime('now')),
       updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );

   CREATE INDEX idx_accounts_workspace_id ON accounts(workspace_id);
   ```

8. **Create `0004_categories.sql`**
   ```sql
   CREATE TABLE categories (
       id INTEGER PRIMARY KEY,
       workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
       name TEXT NOT NULL,
       category_type TEXT NOT NULL CHECK(category_type IN ('income', 'expense')),
       parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
       is_system INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL DEFAULT (datetime('now')),
       updated_at TEXT NOT NULL DEFAULT (datetime('now')),
       UNIQUE(workspace_id, name, category_type)
   );

   CREATE INDEX idx_categories_workspace_id ON categories(workspace_id);
   CREATE INDEX idx_categories_parent_id ON categories(parent_id);
   ```

9. **Register migrations in `migration.rs`**
   - Add migrations 2, 3, 4 to the `embedded_migrations()` vec using `include_str!()`
   - Each migration keeps its version number and descriptive name

**Verification:** `cargo test` — existing migration tests pass. New migrations apply on a fresh database. Tables exist with correct columns and constraints.

---

### Phase C: Extended Error Types

**Goal:** Add the domain error variants that repositories need.

10. **Extend `DomainError` in `error.rs`**
    - Add `NotFound` variant (no payload — the entity type and ID are contextual)
    - Add `Validation(String)` variant (message describes what failed)
    - Add `Conflict(String)` variant (message describes the uniqueness violation)

11. **Update `From<rusqlite::Error> for DomainError`**
    - Map `rusqlite::Error::QueryReturnedNoRows` to `DomainError::NotFound`
    - Map constraint violation errors to `DomainError::Conflict` where identifiable
    - Keep all other rusqlite errors as `DomainError::Database`

12. **Update `From<DomainError> for CommandError`**
    - `NotFound` → `{ code: "not_found", message: "The requested resource was not found." }`
    - `Validation(msg)` → `{ code: "validation_error", message: msg }` (validation messages are user-safe)
    - `Conflict(msg)` → `{ code: "conflict", message: msg }`
    - Existing `Database`, `Io`, `Migration` mappings unchanged

**Verification:** `cargo check` succeeds. Existing tests still pass.

---

### Phase D: Repository Layer

**Goal:** Implement CRUD repositories for workspaces, accounts, and categories.

13. **Create the `repositories` module**
    ```
    src-tauri/src/repositories/
      mod.rs           # Re-exports all repositories
      workspace.rs     # WorkspaceRepository
      account.rs       # AccountRepository
      category.rs      # CategoryRepository
    ```

14. **Implement `WorkspaceRepository`**
    - `new(conn: &Connection) -> Self`
    - `create(input: CreateWorkspaceInput) -> Result<Workspace, DomainError>`
      - Validate: name is non-empty, name length ≤ 100
      - Insert row with current timestamp
      - Return the created workspace (query back by `last_insert_rowid()`)
    - `get_by_id(id: i64) -> Result<Workspace, DomainError>`
      - Return `DomainError::NotFound` if no row
    - `list() -> Result<Vec<Workspace>, DomainError>`
    - `update(id: i64, input: UpdateWorkspaceInput) -> Result<Workspace, DomainError>`
      - Validate: if name provided, non-empty and ≤ 100 chars
      - Update `updated_at` timestamp
      - Return `DomainError::NotFound` if no row affected
    - `delete(id: i64) -> Result<(), DomainError>`
      - Return `DomainError::NotFound` if no row affected
      - `ON DELETE CASCADE` handles child accounts and categories

15. **Implement `AccountRepository`**
    - `new(conn: &Connection) -> Self`
    - `create(input: CreateAccountInput) -> Result<Account, DomainError>`
      - Validate: name non-empty, name length ≤ 100
      - Validate: workspace_id references an existing workspace (query before insert)
      - Validate: account_type is a valid enum value
      - Default currency to workspace currency if not provided
      - Balance starts at 0
      - Insert and return created account
    - `get_by_id(id: i64) -> Result<Account, DomainError>`
    - `list_by_workspace(workspace_id: i64) -> Result<Vec<Account>, DomainError>`
    - `update(id: i64, input: UpdateAccountInput) -> Result<Account, DomainError>`
      - Validate: if name provided, non-empty and ≤ 100 chars
      - Update `updated_at` timestamp
    - `delete(id: i64) -> Result<(), DomainError>`
      - Return `DomainError::NotFound` if no row affected
      - Note: account deletion will cascade to transactions in Sprint 4. For Sprint 3, accounts have no children beyond what CASCADE handles.

16. **Implement `CategoryRepository`**
    - `new(conn: &Connection) -> Self`
    - `create(input: CreateCategoryInput) -> Result<Category, DomainError>`
      - Validate: name non-empty, name length ≤ 100
      - Validate: workspace_id references an existing workspace
      - Validate: if parent_id provided, it references an existing category in the same workspace
      - Validate: category_type is a valid enum value
      - Unique constraint on (workspace_id, name, category_type) — map constraint violation to `DomainError::Conflict`
    - `get_by_id(id: i64) -> Result<Category, DomainError>`
    - `list_by_workspace(workspace_id: i64) -> Result<Vec<Category>, DomainError>`
    - `update(id: i64, input: UpdateCategoryInput) -> Result<Category, DomainError>`
      - Validate: if name provided, non-empty and ≤ 100 chars
      - Validate: if parent_id provided, it references an existing category in the same workspace
      - Prevent updating system categories' name or type
    - `delete(id: i64) -> Result<(), DomainError>`
      - Prevent deleting system categories (return `DomainError::Validation`)
      - `ON DELETE SET NULL` on parent_id handles child categories
    - `seed_defaults(workspace_id: i64) -> Result<(), DomainError>`
      - Insert default income categories: Salary, Freelance, Investments, Other Income
      - Insert default expense categories: Housing, Transportation, Food & Dining, Utilities, Healthcare, Entertainment, Shopping, Education, Personal Care, Insurance, Savings & Investments, Gifts & Donations, Other Expense
      - All seeded categories have `is_system = 1`
      - Idempotent: skip if categories already exist for the workspace (use `INSERT OR IGNORE` or check first)

17. **Update `lib.rs`** to declare `pub mod repositories`

**Verification:** `cargo check` succeeds. Repository unit tests pass (written in Phase F).

---

### Phase E: Tauri Commands and Frontend Types

**Goal:** Expose CRUD operations through Tauri commands and create TypeScript wrappers.

18. **Create workspace commands in `commands/workspace.rs`**
    - `create_workspace(state, name, workspace_type, currency)` → `Result<Workspace, String>`
    - `get_workspace(state, id)` → `Result<Workspace, String>`
    - `list_workspaces(state)` → `Result<Vec<Workspace>, String>`
    - `update_workspace(state, id, name, currency)` → `Result<Workspace, String>`
    - `delete_workspace(state, id)` → `Result<(), String>`
    - Each command: lock `state.db`, create repository, call method, convert error

19. **Create account commands in `commands/account.rs`**
    - `create_account(state, workspace_id, name, account_type, currency, institution_name)` → `Result<Account, String>`
    - `get_account(state, id)` → `Result<Account, String>`
    - `list_accounts_by_workspace(state, workspace_id)` → `Result<Vec<Account>, String>`
    - `update_account(state, id, name, institution_name, is_active)` → `Result<Account, String>`
    - `delete_account(state, id)` → `Result<(), String>`

20. **Create category commands in `commands/category.rs`**
    - `create_category(state, workspace_id, name, category_type, parent_id)` → `Result<Category, String>`
    - `get_category(state, id)` → `Result<Category, String>`
    - `list_categories_by_workspace(state, workspace_id)` → `Result<Vec<Category>, String>`
    - `update_category(state, id, name, parent_id)` → `Result<Category, String>`
    - `delete_category(state, id)` → `Result<(), String>`
    - `seed_default_categories(state, workspace_id)` → `Result<(), String>`

21. **Register all commands in `lib.rs`**
    - Add all workspace, account, and category commands to `generate_handler![]`

22. **Create TypeScript API wrappers**
    - `src/api/workspaces.ts` — typed functions for workspace CRUD
    - `src/api/accounts.ts` — typed functions for account CRUD
    - `src/api/categories.ts` — typed functions for category CRUD

23. **Create TypeScript domain types**
    - `src/types/domain.ts` — TypeScript interfaces mirroring Rust entity and input structs
      - `Workspace`, `CreateWorkspaceInput`, `UpdateWorkspaceInput`
      - `Account`, `CreateAccountInput`, `UpdateAccountInput`
      - `Category`, `CreateCategoryInput`, `UpdateCategoryInput`
      - `WorkspaceType`, `AccountType`, `CategoryType` as string union types

24. **Create frontend utility modules**
    - `src/lib/errors.ts` — `CommandError` interface, error code constants, helper to extract error from invoke rejection
    - `src/lib/format.ts` — `formatAmount(cents: number): string` (converts integer cents to display string, e.g., `4250` → `"42.50"`), `parseAmount(display: string): number` (converts display string to cents)

**Verification:** `cargo check` succeeds. `npm run build` succeeds. `npm run lint` passes. Commands are registered and callable.

---

### Phase F: Testing

**Goal:** Comprehensive tests for repositories, validation, and foreign key behavior.

25. **Create a shared test helper**
    - In `repositories/mod.rs` or a `#[cfg(test)]` helper module:
      ```rust
      fn setup_test_db() -> Connection {
          let conn = Connection::open_in_memory().unwrap();
          conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
          run_migrations(&conn).unwrap();
          conn
      }
      ```
    - This helper is used by all repository tests

26. **Workspace repository tests**
    - Create workspace succeeds with valid input
    - Create workspace fails with empty name (`DomainError::Validation`)
    - Create workspace fails with name exceeding 100 characters
    - Get workspace by ID returns correct workspace
    - Get non-existent workspace returns `DomainError::NotFound`
    - List workspaces returns all workspaces
    - Update workspace name succeeds
    - Update workspace with empty name fails validation
    - Delete workspace succeeds
    - Delete workspace cascades to accounts and categories

27. **Account repository tests**
    - Create account succeeds with valid input
    - Create account fails with empty name
    - Create account fails with non-existent workspace_id (`DomainError::Validation`)
    - Create account defaults balance to 0
    - Get account by ID returns correct account
    - Get non-existent account returns `DomainError::NotFound`
    - List accounts by workspace returns only accounts in that workspace
    - Update account name succeeds
    - Update account is_active toggles correctly
    - Delete account succeeds
    - Delete account returns `DomainError::NotFound` for non-existent ID

28. **Category repository tests**
    - Create category succeeds with valid input
    - Create category fails with empty name
    - Create category fails with non-existent workspace_id
    - Create duplicate category name (same workspace, same type) returns `DomainError::Conflict`
    - Create category with parent_id succeeds (same workspace)
    - Create category with parent_id in different workspace fails
    - Get category by ID returns correct category
    - List categories by workspace returns only categories in that workspace
    - Update category name succeeds
    - Delete non-system category succeeds
    - Delete system category fails (`DomainError::Validation`)
    - Seed defaults creates expected categories
    - Seed defaults is idempotent

29. **Foreign key and cascade tests**
    - Delete workspace cascades to accounts
    - Delete workspace cascades to categories
    - Delete parent category sets child `parent_id` to NULL
    - Insert account with non-existent workspace_id fails at database level (FK constraint)

30. **Migration tests**
    - Migration 0002 creates workspaces table with correct columns
    - Migration 0003 creates accounts table with FK to workspaces
    - Migration 0004 creates categories table with FK to workspaces and self-referential FK

31. **Frontend tests**
    - `format.test.ts` — `formatAmount` and `parseAmount` produce correct results for typical values, zero, negative amounts, and large amounts

**Verification:** `cargo test` passes all Sprint 2 + Sprint 3 tests. `npm run test` passes all frontend tests.

---

### Phase G: Documentation and Finalization

**Goal:** Update documentation and run full verification.

32. **Update TASKS.md** — Mark Sprint 3 items as complete (when implementing)

33. **Update CHANGELOG.md** — Add Sprint 3 entry

34. **Update ARCHITECTURE.md** — Update status from "Sprint 2 Complete" to "Sprint 3 Complete — Core Domain Entities"

35. **Update README.md** — Update repository structure to include `models/` and `repositories/`

36. **Finalize sprint-3 notes** — Update status from Planned to Complete

37. **Run full verification**
    - `cargo check` in `src-tauri/` — compiles without errors
    - `cargo test` in `src-tauri/` — all Rust tests pass (Sprint 2 + Sprint 3)
    - `npm run build` — frontend build succeeds
    - `npm run lint` — no lint errors
    - `npm run format:check` — formatting passes
    - `npm run test` — frontend tests pass (Sprint 1 + Sprint 3)
    - `npm run dev` — application launches, database migrates, existing commands still work
    - Verify `workspaces`, `accounts`, `categories` tables exist
    - Verify foreign key constraints are enforced
    - Verify no transaction, budget, goal, or report tables exist

**Verification:** All commands exit 0. Database schema includes Sprint 3 tables. No regressions.

---

## Deliverables

| # | Deliverable | Verification |
|---|-------------|-------------|
| 1 | `models/` module with workspace, account, category types | Types compile, serialize/deserialize correctly |
| 2 | Migrations 0002, 0003, 0004 (workspaces, accounts, categories) | Tables created with correct columns, constraints, indexes |
| 3 | `DomainError` extended with `NotFound`, `Validation`, `Conflict` | Error variants compile, conversion works |
| 4 | `WorkspaceRepository` with CRUD + validation | Unit tests pass |
| 5 | `AccountRepository` with CRUD + list by workspace + validation | Unit tests pass |
| 6 | `CategoryRepository` with CRUD + seed defaults + validation | Unit tests pass |
| 7 | Workspace Tauri commands (create, get, list, update, delete) | Commands registered and callable |
| 8 | Account Tauri commands (create, get, list_by_workspace, update, delete) | Commands registered and callable |
| 9 | Category Tauri commands (create, get, list_by_workspace, update, delete, seed_defaults) | Commands registered and callable |
| 10 | TypeScript API wrappers (workspaces.ts, accounts.ts, categories.ts) | `npm run build` succeeds |
| 11 | TypeScript domain types (domain.ts) | Types compile |
| 12 | Frontend error helper (errors.ts) | Types compile |
| 13 | Amount formatting utility (format.ts + format.test.ts) | `npm run test` passes |
| 14 | Foreign key cascade behavior tested | Integration tests pass |
| 15 | Category seed data functional | Default categories created per workspace |
| 16 | Documentation updated | TASKS.md, CHANGELOG.md, ARCHITECTURE.md, README.md updated |

---

## Acceptance Criteria

Sprint 3 is complete when all of the following are true:

1. The `workspaces` table exists with columns: id, name, workspace_type, currency, created_at, updated_at
2. The `accounts` table exists with FK to workspaces, balance stored as INTEGER (cents per ADR 0008)
3. The `categories` table exists with FK to workspaces, self-referential FK for parent_id, unique constraint on (workspace_id, name, category_type)
4. Indexes exist on `accounts.workspace_id`, `categories.workspace_id`, `categories.parent_id`
5. A workspace can be created, read, updated, and deleted via Tauri commands
6. An account can be created, read, listed by workspace, updated, and deleted via Tauri commands
7. A category can be created, read, listed by workspace, updated, and deleted via Tauri commands
8. Default categories can be seeded for a workspace via Tauri command
9. Deleting a workspace cascades to its accounts and categories
10. Deleting a parent category sets child `parent_id` to NULL
11. Validation rejects empty names, names exceeding 100 characters, and invalid enum values
12. Validation rejects account creation with a non-existent workspace_id
13. Validation rejects category creation with a parent_id from a different workspace
14. Duplicate category name within the same workspace and type returns a conflict error
15. System categories cannot be deleted
16. `DomainError` has `NotFound`, `Validation`, `Conflict` variants with correct `CommandError` conversion
17. TypeScript API wrappers exist for all workspace, account, and category commands
18. TypeScript domain types mirror Rust entity structs
19. `formatAmount(4250)` returns `"42.50"` and `parseAmount("42.50")` returns `4250`
20. All repository tests pass (CRUD, validation, foreign keys, cascades)
21. All Sprint 2 tests continue to pass (no regressions)
22. `cargo test`, `npm run test`, `npm run lint`, `npm run format:check`, and `npm run build` all pass
23. No transaction, budget, goal, or report tables exist
24. No transaction or finance business logic exists
25. No production finance UI exists
26. TASKS.md, CHANGELOG.md, ARCHITECTURE.md, README.md, and sprint notes are updated

---

## Testing Requirements

### Rust Repository Tests (Unit)

| Test | Module | Validates |
|------|--------|-----------|
| Create workspace with valid input | `workspace.rs` | Row inserted, returned entity has correct fields |
| Create workspace with empty name | `workspace.rs` | Returns `DomainError::Validation` |
| Create workspace with name > 100 chars | `workspace.rs` | Returns `DomainError::Validation` |
| Get workspace by ID | `workspace.rs` | Correct workspace returned |
| Get non-existent workspace | `workspace.rs` | Returns `DomainError::NotFound` |
| List workspaces | `workspace.rs` | Returns all workspaces |
| Update workspace name | `workspace.rs` | Name updated, `updated_at` changed |
| Update workspace with empty name | `workspace.rs` | Returns `DomainError::Validation` |
| Delete workspace | `workspace.rs` | Row removed |
| Delete workspace cascades | `workspace.rs` | Child accounts and categories deleted |
| Create account with valid input | `account.rs` | Row inserted, balance = 0 |
| Create account with empty name | `account.rs` | Returns `DomainError::Validation` |
| Create account with bad workspace_id | `account.rs` | Returns `DomainError::Validation` |
| Get account by ID | `account.rs` | Correct account returned |
| Get non-existent account | `account.rs` | Returns `DomainError::NotFound` |
| List accounts by workspace | `account.rs` | Returns only workspace's accounts |
| Update account name | `account.rs` | Name updated |
| Update account is_active | `account.rs` | Status toggled |
| Delete account | `account.rs` | Row removed |
| Create category with valid input | `category.rs` | Row inserted |
| Create category with empty name | `category.rs` | Returns `DomainError::Validation` |
| Create category with bad workspace_id | `category.rs` | Returns `DomainError::Validation` |
| Create duplicate category | `category.rs` | Returns `DomainError::Conflict` |
| Create category with parent_id (same workspace) | `category.rs` | Row inserted with parent_id |
| Create category with parent_id (different workspace) | `category.rs` | Returns `DomainError::Validation` |
| Get category by ID | `category.rs` | Correct category returned |
| List categories by workspace | `category.rs` | Returns only workspace's categories |
| Update category name | `category.rs` | Name updated |
| Delete non-system category | `category.rs` | Row removed |
| Delete system category | `category.rs` | Returns `DomainError::Validation` |
| Seed defaults creates categories | `category.rs` | Expected categories exist with `is_system = 1` |
| Seed defaults is idempotent | `category.rs` | No error or duplicates on second call |

### Rust Migration Tests (Unit)

| Test | Module | Validates |
|------|--------|-----------|
| Migration 0002 creates workspaces table | `migration.rs` | Table exists, columns correct |
| Migration 0003 creates accounts table | `migration.rs` | Table exists, FK to workspaces |
| Migration 0004 creates categories table | `migration.rs` | Table exists, FK to workspaces, self-referential FK |

### Rust Foreign Key Tests (Integration)

| Test | Validates |
|------|-----------|
| Delete workspace cascades to accounts | `ON DELETE CASCADE` |
| Delete workspace cascades to categories | `ON DELETE CASCADE` |
| Delete parent category nullifies children | `ON DELETE SET NULL` |
| FK violation on account insert | Constraint rejects invalid workspace_id |

### Frontend Tests

| Test | Module | Validates |
|------|--------|-----------|
| `formatAmount(0)` returns `"0.00"` | `format.test.ts` | Zero handling |
| `formatAmount(4250)` returns `"42.50"` | `format.test.ts` | Typical amount |
| `formatAmount(-1500)` returns `"-15.00"` | `format.test.ts` | Negative amounts |
| `formatAmount(999999999)` returns `"9999999.99"` | `format.test.ts` | Large amounts |
| `parseAmount("42.50")` returns `4250` | `format.test.ts` | Reverse conversion |
| `parseAmount("0.00")` returns `0` | `format.test.ts` | Zero |
| `parseAmount("-15.00")` returns `-1500` | `format.test.ts` | Negative |

---

## Documentation Updates

| Document | Update |
|----------|--------|
| TASKS.md | Mark Sprint 3 tasks as complete |
| CHANGELOG.md | Add Sprint 3 entry |
| ARCHITECTURE.md | Update status to "Sprint 3 Complete — Core Domain Entities", version to 1.3 |
| README.md | Update repository structure to include `models/`, `repositories/` |
| `docs/sprint-notes/sprint-3.md` | Update status from Planned to Complete |

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Enum serialization mismatch between Rust and SQLite | Data corruption or query failures | Medium | Use `serde` with `rename_all = "snake_case"` for consistent TEXT values. Test round-trip serialization in unit tests. |
| Foreign key cascade deletes more data than expected | Data loss | Low | Test cascade behavior explicitly. Use `ON DELETE CASCADE` only where architecturally appropriate (workspace → accounts). Use `ON DELETE SET NULL` for parent categories. |
| Category uniqueness constraint too strict or too loose | Duplicate categories or false conflicts | Medium | Constraint on (workspace_id, name, category_type) allows same name across workspaces and across income/expense. Test edge cases. |
| Repository validation logic duplicates DB constraints | Maintenance burden | Low | Accept controlled duplication. Repository validation provides user-friendly error messages; DB constraints are the safety net. Both are needed. |
| Test setup complexity with multi-table dependencies | Brittle tests | Medium | Create a shared `setup_test_db()` helper. Add helper functions to create prerequisite entities (e.g., `create_test_workspace()`). |
| Migration ordering — migration 0003 depends on 0002 | Migration failure if applied out of order | Low | Migration runner applies in version order. Verified by existing Sprint 2 tests. |
| `Mutex<Connection>` poisoning if a repository panics | Application becomes unusable | Low | Repositories use `?` for error propagation, not `unwrap()`. Panics should not occur in production paths. |

---

## Assumptions

- Sprint 2 is complete: `rusqlite`, `db/` module, `error.rs`, `state.rs`, migration runner, and `AppState` are all in place and tested.
- The existing `embedded_migrations()` vec in `migration.rs` can be extended with new migrations without structural changes.
- `serde` with `rename_all` attributes handles Rust enum ↔ SQLite TEXT conversion cleanly.
- Account `balance` starts at 0 and is updated by transactions in Sprint 4. Sprint 3 does not implement balance updates.
- Category seed data (default categories) is a reasonable starting point for most users. Users can delete or add categories later.
- The `greet` and `db_info` commands from Sprint 1 and 2 remain functional.
- TypeScript API wrappers are created but not wired into UI pages — no new UI pages are built in Sprint 3.

---

## Prerequisites

Before starting Sprint 3 implementation, verify:

- Sprint 2 is committed and all tests pass
- `cargo test` in `src-tauri/` passes (14 tests)
- `npm run test`, `npm run lint`, `npm run format:check`, `npm run build` all pass
- `npm run dev` launches the app and creates the database
- Database has `_migrations` (1 row) and `app_settings` tables

---

## Review Checklist

After implementation, verify each item before committing:

- [ ] `src-tauri/src/models/mod.rs` exists and re-exports workspace, account, category
- [ ] `src-tauri/src/models/workspace.rs` — entity, input types, WorkspaceType enum
- [ ] `src-tauri/src/models/account.rs` — entity, input types, AccountType enum
- [ ] `src-tauri/src/models/category.rs` — entity, input types, CategoryType enum
- [ ] `src-tauri/migrations/0002_workspaces.sql` exists
- [ ] `src-tauri/migrations/0003_accounts.sql` exists
- [ ] `src-tauri/migrations/0004_categories.sql` exists
- [ ] `error.rs` has `NotFound`, `Validation(String)`, `Conflict(String)` variants
- [ ] `CommandError` conversion handles new error variants
- [ ] `src-tauri/src/repositories/mod.rs` exists and re-exports all repositories
- [ ] `src-tauri/src/repositories/workspace.rs` — CRUD + validation
- [ ] `src-tauri/src/repositories/account.rs` — CRUD + list_by_workspace + validation
- [ ] `src-tauri/src/repositories/category.rs` — CRUD + list_by_workspace + seed_defaults + validation
- [ ] `src-tauri/src/commands/workspace.rs` — 5 commands registered
- [ ] `src-tauri/src/commands/account.rs` — 5 commands registered
- [ ] `src-tauri/src/commands/category.rs` — 6 commands registered
- [ ] `lib.rs` declares `pub mod models`, `pub mod repositories`
- [ ] `lib.rs` registers all new commands in `generate_handler![]`
- [ ] `src/api/workspaces.ts` — typed invoke wrappers
- [ ] `src/api/accounts.ts` — typed invoke wrappers
- [ ] `src/api/categories.ts` — typed invoke wrappers
- [ ] `src/types/domain.ts` — TypeScript interfaces
- [ ] `src/lib/errors.ts` — CommandError type and helpers
- [ ] `src/lib/format.ts` — formatAmount and parseAmount
- [ ] `src/lib/format.test.ts` — formatting tests pass
- [ ] `cargo check` succeeds
- [ ] `cargo test` passes — all Sprint 2 + Sprint 3 tests pass
- [ ] `npm run build` succeeds
- [ ] `npm run lint` exits 0
- [ ] `npm run format:check` exits 0
- [ ] `npm run test` exits 0
- [ ] `npm run dev` launches the app
- [ ] `workspaces`, `accounts`, `categories` tables exist in database
- [ ] Foreign key constraints enforced (test with invalid inserts)
- [ ] Indexes exist on workspace_id and parent_id columns
- [ ] No transaction table exists
- [ ] No budget, goal, or report tables exist
- [ ] No production finance UI pages exist
- [ ] TASKS.md updated
- [ ] CHANGELOG.md updated
- [ ] ARCHITECTURE.md updated
- [ ] README.md updated
- [ ] Sprint 3 notes finalized

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repository pattern | Struct with `&Connection` reference | Matches architecture doc. Testable with in-memory database. No trait abstraction needed yet. |
| Enum serialization | `serde` with `rename_all = "snake_case"` | Clean Rust enums map to lowercase TEXT in SQLite. Deserialization from DB uses manual mapping or `serde`. |
| Validation location | Repository layer | Architecture doc is explicit: repositories validate, commands are thin adapters. |
| Category uniqueness | `UNIQUE(workspace_id, name, category_type)` | Allows "Salary" as both income and expense if needed. Prevents true duplicates within a workspace+type. |
| Cascade delete strategy | `ON DELETE CASCADE` for workspace → accounts/categories; `ON DELETE SET NULL` for category parent_id | Workspace deletion should clean up everything. Parent category deletion should preserve children. |
| Default categories | Hardcoded seed list with `is_system = 1` | Provides a useful starting point. System flag prevents accidental deletion. |
| Account balance initialization | Start at 0 | Balance is a derived value. Sprint 4 transactions will update it. Sprint 3 just stores it. |

---

## What Sprint 4 Will Build On

Sprint 3 delivers the domain model that Sprint 4 extends. Sprint 4 will:

- Add the `transactions` table via a new migration (`0005_transactions.sql`)
- Create `TransactionRepository` with CRUD, search, and filtering
- Implement transaction Tauri commands
- Add import foundation (bulk insert path for future CSV import)
- Update account balance based on transaction operations
- Validate performance against representative datasets (10k, 50k, 100k transactions)
- Create TypeScript transaction API wrappers

Sprint 3 must not implement any of this. But every decision in Sprint 3 should make Sprint 4's work straightforward — particularly the foreign key relationships from transactions to accounts and categories.
