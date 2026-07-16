# Sprint 4: Transaction Engine — Implementation Plan

**Status:** Planned
**Date:** 2026-07-16
**Revised:** 2026-07-16

---

## Objective

Build the transaction engine and complete Milestone 2: Local Data Platform. After Sprint 4, transactions can be created, read, updated, deleted, searched, and filtered through Tauri commands backed by a repository with validation and atomic balance maintenance. A programmatic import path exists via a validated batch-create operation. Performance is validated against representative dataset sizes.

Sprint 4 completes the persistence layer that all future finance features (budgets, reports, goals, dashboards) depend on.

---

## User and Architectural Value

**User value:** A reliable, offline, local transaction store that accurately tracks every financial event across accounts, maintains correct balances, and responds quickly to queries — even with years of transaction history.

**Architectural value:** Completes Milestone 2's data platform. Every future finance feature (budgets, reports, goals, CSV import UI, Plaid sync) consumes the transaction repository. Sprint 4 establishes the contract those features depend on.

---

## Dependencies

- Sprint 2 (Complete): Database foundation, migration runner, error types, AppState
- Sprint 3 (Complete): Workspace, account, category repositories; DomainError with NotFound/Validation/Conflict; Tauri command pattern; TypeScript API pattern
- ADR 0008 (Accepted): Integer minor units for monetary amounts

---

## Domain Decisions

### 1. Transaction Identity

- **Primary key:** `INTEGER PRIMARY KEY` (SQLite ROWID alias, auto-increment)
- **Workspace ownership:** Transactions belong to an account, which belongs to a workspace. Workspace is stored denormalized on the transaction row for efficient filtering without joins.
- **Account relationship:** `account_id INTEGER NOT NULL REFERENCES accounts(id)` — every transaction belongs to exactly one account
- **Category relationship:** `category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL` — category is optional (nullable). Deleting a category nullifies rather than cascading.
- **Stable identifier for deduplication:** The combination of `(account_id, date, amount_minor, description)` provides a heuristic fingerprint for future import deduplication. No separate UUID column is needed at this stage. This matches the Data Model Overview's recommendation: "Import duplicate detection should use date + amount + description heuristics."

### 2. Transaction Amount Semantics

**Selected approach: Signed integer, no persisted type column.**

- All monetary values stored as `amount_minor INTEGER NOT NULL` (cents per ADR 0008)
- **Sign convention:** Positive values represent inflows (income, deposits, refunds). Negative values represent outflows (expenses, withdrawals, payments).
- **Zero is invalid:** A zero-amount transaction is rejected at validation. Every transaction must have a non-zero financial effect.
- **No persisted transaction_type column:** Income vs. expense direction is fully determined by the sign of `amount_minor`. A redundant type column would require consistency enforcement between two sources of truth with no additional expressive power.
- **Derived classification:** When the UI or reporting needs to label a transaction as "income" or "expense," it derives this from `amount_minor > 0` (income) or `amount_minor < 0` (expense).
- **Category context:** Categories already carry a `type` field (income/expense) from Sprint 3. A transaction's category provides semantic classification; the amount sign provides the financial direction.

**Why this approach (controlling documentation):**

The Data Model Overview (`docs/specifications/data-model-overview.md`) states: "Amount (positive for income, negative for expense, **or** use type flag)" — presenting both as valid alternatives, not mandating a type column. The v3 reference architecture has a `type` column, but per ADR 0007 ("Existing Ledger app as reference only"), v3 informs but does not dictate the new architecture. The signed-integer approach is simpler, avoids redundant state, and matches `SUM(amount_minor)` semantics for balance computation.

**Account balances:** See Balance Strategy below.

### 3. Dates and Timestamps

- **Transaction date (`date`):** `TEXT NOT NULL` — ISO 8601 date only (`2026-07-15`). This is the user-selected date representing when the financial event occurred. No time component — personal finance transactions are date-granular.
- **Created/updated timestamps:** `TEXT NOT NULL DEFAULT (datetime('now'))` — ISO 8601 datetime in UTC. These are system metadata, not user-editable.
- **Time-zone expectation:** Transaction dates are stored as naive dates (no timezone). The user enters "July 15" and it stays "July 15" regardless of timezone. System timestamps use UTC via SQLite's `datetime('now')`.
- **Distinction:** `date` is semantic (when did this financial event happen?). `created_at`/`updated_at` are mechanical (when did the database record change?).

### 4. Account Balance Strategy

**Selected approach: Cached balance with transactional updates.**

The `accounts.balance` column (already exists from Sprint 3, defaults to 0) is maintained as a running total. When a transaction is created, updated, or deleted, the account balance is adjusted atomically in the same database transaction.

**Why this is appropriate now:**

- Simple, fast reads: account balance is a single column lookup, not a `SUM()` over potentially 100k+ transactions
- Correct by construction: every mutation that changes an account's transactions also updates the balance in the same atomic transaction
- Matches the existing schema: `accounts.balance INTEGER NOT NULL DEFAULT 0` already exists
- Predictable performance: balance queries are O(1) regardless of transaction count

**How edits and deletions affect balances:**

- **Create:** `balance += amount_minor`
- **Update (amount changed):** `balance += (new_amount - old_amount)`
- **Update (account changed):** old account `balance -= amount_minor`, new account `balance += amount_minor`
- **Delete:** `balance -= amount_minor`

**Atomicity requirements:**

- Account balance changes occur in the same SQLite transaction as transaction mutations
- Updating account, amount, or direction reverses the old balance effect and applies the new effect atomically
- Deletion reverses the transaction's effect
- Batch creation updates balances atomically
- Failed writes leave both transactions and balances unchanged (full rollback)

**How consistency is tested:**

- After every test that modifies transactions, assert that `accounts.balance` equals `SELECT COALESCE(SUM(amount_minor), 0) FROM transactions WHERE account_id = ?`
- A dedicated `verify_balance(account_id)` repository method computes the sum and compares against the cached value
- Performance tests verify that balance remains correct after bulk operations

**How balances can be rebuilt:**

- A `rebuild_balance(account_id)` method sets `accounts.balance = SELECT COALESCE(SUM(amount_minor), 0) FROM transactions WHERE account_id = ?`
- This is a recovery operation, not a normal-path operation

**ADR requirement:** ADR 0009 must be created during implementation, before repository code is written. It records the cached-balance-with-transactional-update strategy, alternatives considered, atomicity guarantees, and the rebuild path.

### 5. Transfers

**Decision: Transfers are fully deferred.**

Sprint 4 supports only ordinary income and expense transactions. Account-to-account transfers are not stored, not represented, and not partially reserved.

**What is deferred:** A transfer representation ADR must define:
- Paired-record or alternate representation
- Source and destination accounts
- Atomic creation
- Balance effects on both accounts
- Editing semantics
- Deletion semantics
- Linking integrity
- Category behavior for transfers

**No partial implementation:** The `transaction` table has no `type` column, no `transfer` enum value, no `transfer_pair_id`, and no `transfer_account_id`. Transfer support will be added as a schema migration when the transfer ADR is accepted.

### 6. Cleared/Reconciled Status

The Data Model Overview lists "Cleared/reconciled status" as a transaction attribute. This is a simple status field:

- `status TEXT NOT NULL DEFAULT 'uncleared' CHECK(status IN ('uncleared', 'cleared', 'reconciled'))`
- No reconciliation workflow is built in Sprint 4 — the field exists for future use
- All transactions default to 'uncleared'

### 7. Source Tracking

The Data Model Overview lists "Source (manual, CSV import, Plaid sync)":

- `source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'import', 'plaid'))`
- This field tracks how the transaction entered the system
- No import session reference column is included — import session metadata will be designed when the CSV import workflow is planned

### 8. Import Foundation

Sprint 4's import foundation does **not** include import-session schema or deduplication metadata. It consists of:

- A reusable, validated transaction creation pathway (the same validation as single-create)
- An atomic `create_batch` repository operation (all-or-nothing within a single SQLite transaction)
- Stable transaction identifiers (INTEGER PRIMARY KEY, persisted via ROWID)
- Tests proving all-or-nothing batch behavior (any validation failure rolls back all inserts and balance updates)

Import-session tracking, deduplication columns, and CSV-specific metadata will be designed in a future sprint when the CSV import workflow is planned.

### 9. Deletion Strategy

**Hard deletion.** No existing documentation requires soft delete, audit trails, or deletion history for transactions. The Data Model Overview says "Deleting a category should allow reassignment of transactions" (implying transactions persist when categories change) but does not require transaction-level soft delete.

Hard deletion is simpler and avoids ghost data. If audit history is needed later, it should be proposed as an ADR.

---

## Schema Plan

### Transaction Table (`0005_transactions.sql`)

```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    amount_minor INTEGER NOT NULL CHECK(amount_minor != 0),
    description TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'uncleared' CHECK(status IN ('uncleared', 'cleared', 'reconciled')),
    source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'import', 'plaid')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_workspace_id ON transactions(workspace_id);
```

### Design Notes

- **No `transaction_type` column:** Direction is determined by the sign of `amount_minor`. See Domain Decision #2.
- **No `import_session_id` column:** Import session schema is deferred. See Domain Decision #8.
- **No `transfer` support:** Transfers are fully deferred. See Domain Decision #5.
- **`CHECK(amount_minor != 0)`:** Zero-amount transactions are rejected at the database level.
- `ON DELETE CASCADE` on `account_id`: deleting an account deletes its transactions. The Data Model Overview says "Deleting an account should warn about associated transactions" — the warning belongs in the UI layer (Sprint 5+), not the database constraint.
- `ON DELETE SET NULL` on `category_id`: consistent with Sprint 3 category deletion behavior and the Data Model Overview: "Deleting a category should allow reassignment of transactions."
- `workspace_id` is denormalized for query performance. Validated at insert time to match the account's workspace.
- `description` defaults to empty string (not NULL) — every transaction can have a payee/description, but it need not be required for programmatic imports that may lack one.
- `date` stores only the date portion (YYYY-MM-DD) as TEXT, enabling simple string comparison for range queries.
- **4 indexes** cover the documented filter patterns: account, category, date, and workspace. No type index is needed (no type column).

---

## Repository Operations

### TransactionRepository

**CRUD:**
- `create(input: CreateTransactionInput) -> Result<Transaction, DomainError>`
- `get_by_id(id: i64) -> Result<Transaction, DomainError>`
- `update(id: i64, input: UpdateTransactionInput) -> Result<Transaction, DomainError>`
- `delete(id: i64) -> Result<(), DomainError>`

**Search and Filter:**
- `list(query: TransactionQuery) -> Result<TransactionListResult, DomainError>`
  - Accepts a query struct with optional filters
  - Returns bounded results with deterministic ordering

**Bulk Operations (Import Foundation):**
- `create_batch(inputs: Vec<CreateTransactionInput>) -> Result<Vec<Transaction>, DomainError>`
  - Inserts multiple transactions in a single database transaction
  - All-or-nothing: if any validation fails, the entire batch is rolled back
  - Updates account balances atomically
  - Uses the same validation pathway as single-create
  - This is the "import data path" required by Milestone 2

**Balance Verification:**
- `verify_balance(account_id: i64) -> Result<bool, DomainError>`
  - Computes `SUM(amount_minor)` and compares against `accounts.balance`
  - Returns true if consistent, false if drift detected
- `rebuild_balance(account_id: i64) -> Result<i64, DomainError>`
  - Recomputes and sets the correct balance
  - Returns the new balance value

### TransactionQuery

```rust
pub struct TransactionQuery {
    pub workspace_id: i64,              // required — scopes all queries to a workspace
    pub account_id: Option<i64>,        // filter to specific account
    pub category_id: Option<i64>,       // filter to specific category
    pub date_from: Option<String>,      // inclusive start date (YYYY-MM-DD)
    pub date_to: Option<String>,        // inclusive end date (YYYY-MM-DD)
    pub search: Option<String>,         // text search on description
    pub amount_min: Option<i64>,        // minimum absolute amount in cents
    pub amount_max: Option<i64>,        // maximum absolute amount in cents
    pub direction: Option<Direction>,   // income (positive) or expense (negative)
    pub limit: Option<i64>,             // max results (default 50, max 500)
    pub offset: Option<i64>,            // pagination offset
}

pub enum Direction {
    Income,   // amount_minor > 0
    Expense,  // amount_minor < 0
}
```

**Default ordering:** `date DESC, id DESC` (newest first, stable secondary sort by ID)

**Empty-filter behavior:** When only `workspace_id` is provided, returns the most recent transactions up to the limit.

**Maximum limit:** 500 rows per query. This prevents accidental unbounded result sets. Pagination via offset handles larger datasets.

**Direction filter:** When `direction` is `Income`, filter to `amount_minor > 0`. When `Expense`, filter to `amount_minor < 0`. This replaces a type-column filter.

---

## Validation

The repository validates before any database write:

| Rule | Error |
|------|-------|
| `account_id` must reference an existing account | `DomainError::Validation` |
| `workspace_id` must reference an existing workspace | `DomainError::Validation` |
| Account's workspace must match `workspace_id` | `DomainError::Validation("Cross-workspace...")` |
| `category_id` (if provided) must exist | `DomainError::Validation` |
| Category's workspace must match `workspace_id` (if provided) | `DomainError::Validation` |
| `amount_minor` must not be zero | `DomainError::Validation` |
| `date` must be valid ISO date (YYYY-MM-DD) | `DomainError::Validation` |
| `description` must be ≤ 500 characters | `DomainError::Validation` |
| `notes` (if provided) must be ≤ 2000 characters | `DomainError::Validation` |

**Note on inactive accounts:** The existing documentation does not mandate blocking transactions on archived/inactive accounts. Inactive status is informational for the user. The repository does not enforce it.

---

## Tauri Command Plan

### Commands (`src-tauri/src/commands/transaction.rs`)

| Command | Parameters | Returns |
|---------|-----------|---------|
| `create_transaction` | workspace_id, account_id, category_id?, amount_minor, description, date, notes?, status? | `Result<Transaction, String>` |
| `get_transaction` | id | `Result<Transaction, String>` |
| `update_transaction` | id, account_id?, category_id?, amount_minor?, description?, date?, notes?, status? | `Result<Transaction, String>` |
| `delete_transaction` | id | `Result<(), String>` |
| `list_transactions` | workspace_id, account_id?, category_id?, date_from?, date_to?, search?, amount_min?, amount_max?, direction?, limit?, offset? | `Result<TransactionListResult, String>` |
| `create_transaction_batch` | workspace_id, transactions: Vec<...> | `Result<Vec<Transaction>, String>` |
| `get_account_balance` | account_id | `Result<i64, String>` |
| `verify_account_balance` | account_id | `Result<bool, String>` |
| `rebuild_account_balance` | account_id | `Result<i64, String>` |

### TransactionListResult

```rust
pub struct TransactionListResult {
    pub transactions: Vec<Transaction>,
    pub total_count: i64,  // total matching rows (before limit/offset)
}
```

This enables pagination UI to know how many pages exist without fetching all rows.

---

## TypeScript API Plan

### Files

- `src/api/transactions.ts` — typed invoke wrappers for all transaction commands
- `src/types/domain.ts` — add Transaction, TransactionStatus, TransactionSource, Direction, CreateTransactionInput, UpdateTransactionInput, TransactionQuery, TransactionListResult interfaces

### TypeScript Types

```typescript
export type TransactionStatus = "uncleared" | "cleared" | "reconciled";
export type TransactionSource = "manual" | "import" | "plaid";
export type Direction = "income" | "expense";

export interface Transaction {
  id: number;
  workspace_id: number;
  account_id: number;
  category_id: number | null;
  amount_minor: number;
  description: string;
  date: string;
  notes: string | null;
  status: TransactionStatus;
  source: TransactionSource;
  created_at: string;
  updated_at: string;
}

export interface TransactionListResult {
  transactions: Transaction[];
  total_count: number;
}
```

---

## Error Handling

Uses the existing error architecture (DomainError → CommandError → String):

| Scenario | DomainError | CommandError code |
|----------|-------------|-------------------|
| Transaction not found | `NotFound` | `not_found` |
| Invalid input (zero amount, bad date, etc.) | `Validation(msg)` | `validation_error` |
| Cross-workspace relationship | `Validation(msg)` | `validation_error` |
| FK constraint violation at DB level | `Database(msg)` | `database_error` |
| Balance inconsistency detected | `Validation(msg)` | `validation_error` |
| Invalid query parameters (negative limit) | `Validation(msg)` | `validation_error` |

Internal SQL details are never exposed to the frontend.

---

## Scope

### In Scope

- Transaction domain model types (entity, input structs, Direction enum)
- Transaction database migration (`0005_transactions.sql`)
- TransactionRepository (CRUD, list/filter/search, batch create, balance operations)
- Transaction validation (all rules listed above)
- Atomic balance maintenance within database transactions
- Transaction Tauri commands (9 commands)
- TypeScript domain types and API wrappers
- Transaction query with filtering, sorting, pagination
- Import foundation (atomic batch create with shared validation)
- Performance validation (10k, 50k, 100k transaction targets)
- Balance verification and rebuild utilities
- ADR 0009 (cached balance strategy)
- Unit tests, integration tests, migration tests
- Documentation updates (TASKS, CHANGELOG, ARCHITECTURE, README, sprint notes)
- Milestone 2 exit criteria verification

### Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Transfer pairing or transfer transactions | Fully deferred — needs design ADR |
| Import sessions table or `import_session_id` column | Deferred to CSV import sprint |
| CSV parser, column mapper, file picker | Future sprint |
| Deduplication metadata columns | Designed with CSV import workflow |
| Persisted `transaction_type` column | Direction derived from amount sign |
| Dashboard or transaction list UI | Milestone 3 |
| Budgets, goals, reports | Sprint 5 |
| Reconciliation workflow | Sprint 5+ |
| Bank reconciliation | Sprint 10 (Plaid) |
| Plaid, Stripe, Licensing | Later milestones |
| Cloud services | Later milestones |
| Multi-currency conversion | Future ADR |
| Soft delete / audit trail | Not documented as required |
| Recurring transaction templates | Future Consideration per Data Model |
| Transaction rules / auto-categorization | Future Consideration per Data Model |
| Tags or labels | Future Consideration per Data Model |
| Receipt attachments | Sprint 7 |
| Sprint 5+ functionality | Future sprints |

---

## Implementation Phases

### Phase A: Transaction Architecture and Domain Types

**Goal:** Define all Rust types and create ADR 0009.

1. Create ADR 0009: Cached Account Balance Strategy
   - Document the strategy, alternatives considered, atomicity guarantees, rebuild path
2. Create `src-tauri/src/models/transaction.rs`
   - `TransactionStatus` enum: Uncleared, Cleared, Reconciled
   - `TransactionSource` enum: Manual, Import, Plaid
   - `Direction` enum: Income, Expense (for query filtering, not persisted)
   - `Transaction` entity struct (all fields)
   - `CreateTransactionInput` struct
   - `UpdateTransactionInput` struct
   - `TransactionQuery` struct
   - `TransactionListResult` struct
3. Update `models/mod.rs` to export transaction module
4. Verify compilation with `cargo check`

**Verification:** `cargo check` succeeds. ADR 0009 exists.

---

### Phase B: Database Migration

**Goal:** Create the transaction table with all constraints and indexes.

5. Create `src-tauri/migrations/0005_transactions.sql`
   - Transaction table with all columns, FKs, CHECK constraints
   - CHECK constraint enforces `amount_minor != 0`
   - 4 indexes: account_id, category_id, date, workspace_id
6. Register migration in `db/migration.rs` embedded_migrations vec
7. Verify migration applies on fresh database and on existing Sprint 3 database

**Verification:** `cargo test` — migration tests pass, schema version = 5.

---

### Phase C: Repository and Validation

**Goal:** Implement the transaction repository with CRUD, search, filtering, and balance maintenance.

8. Create `src-tauri/src/repositories/transaction.rs`
9. Implement `create` with:
   - Full validation (account exists, workspace match, category match, amount non-zero, date format, string lengths)
   - Insert transaction row
   - Update `accounts.balance` atomically (within same SQLite transaction)
   - Return created entity
10. Implement `get_by_id`
11. Implement `update` with:
    - Validation of changed fields
    - If amount changes: reverse old effect, apply new effect (`balance += new - old`)
    - If account changes: reverse on old account, apply on new account
    - Update `updated_at` timestamp
    - All within a single database transaction
12. Implement `delete` with:
    - Reverse the transaction's balance effect (`balance -= amount_minor`)
    - Delete the transaction row
    - Within a single database transaction
13. Implement `list` with:
    - Dynamic WHERE clause built from TransactionQuery
    - Parameterized query (no string concatenation)
    - COUNT query for total_count
    - Default limit 50, max 500
    - ORDER BY date DESC, id DESC
    - Text search uses `LIKE '%term%'` on description (case-insensitive via `LOWER()`)
    - Amount range filter uses absolute value comparison
    - Direction filter: `amount_minor > 0` for income, `amount_minor < 0` for expense
14. Implement `create_batch` with:
    - Same validation as single-create per item
    - Single database transaction wrapping all inserts + balance updates
    - Rollback on any failure (all-or-nothing)
15. Implement `verify_balance` and `rebuild_balance`
16. Update `repositories/mod.rs`

**Verification:** Repository unit tests pass.

---

### Phase D: Tauri Commands and TypeScript

**Goal:** Expose all transaction operations through Tauri IPC and create TypeScript wrappers.

17. Create `src-tauri/src/commands/transaction.rs`
    - 9 thin commands that lock AppState, create repository, call method, convert error
18. Update `commands/mod.rs`
19. Register all transaction commands in `lib.rs` generate_handler
20. Add transaction types to `src/types/domain.ts`
21. Create `src/api/transactions.ts` with typed invoke wrappers
22. Verify `cargo check` and `npm run build` succeed

**Verification:** All commands registered. TypeScript compiles.

---

### Phase E: Testing and Performance

**Goal:** Comprehensive tests and performance validation.

23. **Transaction repository unit tests:**
    - Create with valid positive amount (income) succeeds
    - Create with valid negative amount (expense) succeeds
    - Create with zero amount fails validation
    - Create with invalid account fails
    - Create with cross-workspace account fails
    - Create with invalid category fails
    - Create with cross-workspace category fails
    - Create with invalid date fails
    - Create with description > 500 chars fails
    - Get by ID succeeds
    - Get non-existent returns NotFound
    - Update amount adjusts balance correctly (reverses old, applies new)
    - Update account moves balance between accounts atomically
    - Update with zero amount fails
    - Delete reverses balance effect
    - Delete non-existent returns NotFound
    - List with no filters returns recent transactions
    - List with account filter
    - List with category filter
    - List with date range filter
    - List with direction filter (income only, expense only)
    - List with text search
    - List with amount range filter
    - List respects limit and offset
    - List with limit > 500 is clamped
    - List returns correct total_count
    - Default ordering is date DESC, id DESC

24. **Batch and balance tests:**
    - create_batch inserts all and updates balances atomically
    - create_batch rolls back entirely on validation failure (all-or-nothing)
    - create_batch with mixed positive/negative amounts updates balance correctly
    - verify_balance returns true when correct
    - verify_balance returns false after manual tampering
    - rebuild_balance corrects a drifted balance

25. **Foreign key and cascade tests:**
    - Delete account cascades to transactions and adjusts nothing (account is gone)
    - Delete category nullifies transaction category_id
    - Delete workspace cascades through accounts to transactions
    - Insert transaction with non-existent account fails at DB level

26. **Migration tests:**
    - Migration 0005 creates transactions table with correct columns
    - All indexes exist
    - CHECK constraint rejects amount_minor = 0
    - No `transaction_type` column exists
    - No `import_session_id` column exists

27. **Performance tests:**
    - Seed 10,000 transactions across multiple accounts
    - Measure list query time (target < 50ms)
    - Seed 50,000 transactions
    - Measure filtered query time (account + date range, target < 100ms)
    - Seed 100,000 transactions
    - Measure filtered query time (category + direction, target < 200ms)
    - Record actual measured timings in test output
    - Confirm query plan uses indexes (EXPLAIN QUERY PLAN)
    - Verify balance remains correct after bulk operations
    - Document any material regression or unexpectedly slow result

    **Performance test output requirements:**
    - Dataset size stated
    - Measured query timings printed
    - Tested filters identified
    - Index usage confirmed via EXPLAIN QUERY PLAN
    - Any result exceeding target is documented with the measured value

    **Gating:** Timing observations are non-gating for Sprint 4 (tests pass unconditionally) but must print results and document gaps.

28. **Frontend tests:**
    - Existing format tests continue to pass
    - No new frontend tests required (TypeScript types are checked by `tsc`)

**Verification:** All Rust tests pass. Frontend tests pass. Performance documented.

---

### Phase F: Documentation and Milestone Verification

**Goal:** Update all documentation and verify Milestone 2 exit criteria.

29. Update TASKS.md — mark Sprint 4 complete
30. Update CHANGELOG.md — Sprint 4 entry
31. Update ARCHITECTURE.md — v1.4, "Sprint 4 Complete — Transaction Engine"
32. Update README.md — update status, add transaction to structure
33. Finalize sprint-4 notes — status → Complete
34. **Verify Milestone 2 exit criteria:**
    - Ledger can create and open a local SQLite database ✓ (Sprint 2)
    - Migrations run reliably ✓ (Sprint 2+)
    - Database service abstraction isolates SQLite ✓ (Sprint 2)
    - Workspaces, accounts, categories CRUD via Tauri ✓ (Sprint 3)
    - Transactions CRUD via Tauri ✓ (Sprint 4)
    - Transactions searched and filtered ✓ (Sprint 4)
    - Repository pattern provides clean boundary ✓ (Sprint 3+)
    - Domain entity validation ✓ (Sprint 3+)
    - Import data path exists ✓ (Sprint 4: create_batch)
    - Data persists after restart ✓ (Sprint 2)
    - FK constraints enforced and tested ✓ (Sprint 3+)
    - Performance validated ✓ (Sprint 4)
    - Database file location documented ✓ (Sprint 2)
    - Backup/export design documented ✓ (Sprint 2)
    - No dashboard/report/budget/goal UI ✓
    - No Plaid/Stripe/licensing/cloud code ✓
35. Run full verification checklist

**Verification:** All Milestone 2 exit criteria satisfied. All tests pass. All builds succeed.

---

## Deliverables

| # | Deliverable | Verification |
|---|-------------|-------------|
| 1 | ADR 0009 (cached balance strategy) | Document exists before repo code |
| 2 | Transaction domain types in `models/transaction.rs` | Types compile, no `TransactionType` enum |
| 3 | Migration `0005_transactions.sql` with table, FKs, indexes | Table created, CHECK constraints enforced, no type/import_session columns |
| 4 | `TransactionRepository` with CRUD, list, batch | All unit tests pass |
| 5 | Atomic balance maintenance on create/update/delete | Balance equals SUM(amount_minor) after every operation |
| 6 | Transaction validation (amounts, relationships, dates) | Invalid inputs rejected with correct errors |
| 7 | Search and filter with pagination | Queries return expected subsets including direction filter |
| 8 | `create_batch` import foundation | Bulk insert atomic, validates all items, all-or-nothing |
| 9 | `verify_balance` and `rebuild_balance` utilities | Detect and correct drift |
| 10 | 9 Tauri commands registered and callable | Commands compile and are registered |
| 11 | TypeScript types and API wrappers | `npm run build` succeeds |
| 12 | Performance validation (10k/50k/100k) | Timings documented, index usage confirmed |
| 13 | 40+ Rust tests for transaction operations | `cargo test` passes |
| 14 | Documentation updated | All docs reflect Sprint 4 completion |
| 15 | Milestone 2 exit criteria verified | All items checked |

---

## Acceptance Criteria

Sprint 4 is complete when all of the following are true:

1. ADR 0009 exists and documents the cached balance strategy
2. Transaction migration applies successfully (schema version = 5)
3. Transaction table has columns: id, workspace_id, account_id, category_id, amount_minor, description, date, notes, status, source, created_at, updated_at
4. Transaction table does NOT have: transaction_type, import_session_id, transfer_pair_id, or any transfer-related column
5. CHECK constraint enforces `amount_minor != 0`
6. CHECK constraints enforce valid status and source values
7. All monetary values are INTEGER (cents per ADR 0008)
8. Transaction creation succeeds with valid data and updates account balance atomically
9. Zero-amount transactions are rejected
10. Invalid account_id, category_id, or workspace_id relationships are rejected
11. Cross-workspace relationships (account in different workspace) are rejected
12. Transaction read returns correct domain values with proper deserialization
13. Transaction update preserves integrity and adjusts balances correctly (reverses old effect, applies new)
14. Transaction deletion removes the row and reverses the balance effect
15. Account balance equals `SUM(amount_minor)` of its transactions at all times
16. Balance verification detects inconsistency when manually introduced
17. Balance rebuild corrects a drifted value
18. Failed writes leave both transactions and balances unchanged
19. Text search on description returns expected matches
20. Filters by account, category, date range, direction, and amount range return correct subsets
21. Results use deterministic ordering (date DESC, id DESC)
22. Query limit is enforced (default 50, max 500)
23. `total_count` reflects the full matching set regardless of limit/offset
24. `create_batch` inserts all transactions atomically or rolls back entirely
25. `create_batch` updates all affected account balances
26. `create_batch` uses the same validation as single-create
27. Deleting an account cascades to its transactions
28. Deleting a category sets transaction category_id to NULL
29. Migration tests pass from a clean database
30. All Sprint 2 and Sprint 3 tests continue to pass (no regressions)
31. Performance: 10k list, 50k filter, 100k filter — timings measured and documented
32. Performance: index usage confirmed via EXPLAIN QUERY PLAN
33. Performance: any result exceeding target is documented
34. `cargo check` succeeds
35. `cargo test` passes (all Sprint 2 + 3 + 4 tests)
36. `npm run test` passes
37. `npm run lint` passes
38. `npm run format:check` passes
39. `npm run build` succeeds
40. `npm run dev` launches and migrates to schema version 5
41. No transfer-type transactions, pairing, or linked records exist
42. No import_session_id or import sessions table exists
43. No budget, goal, report, dashboard, or production finance UI exists
44. No CSV parser, column mapper, or import workflow UI exists
45. No Plaid, Stripe, licensing, or cloud code exists
46. Milestone 2 exit criteria are fully satisfied
47. TASKS.md, CHANGELOG.md, ARCHITECTURE.md, README.md, and sprint notes updated

---

## Testing Requirements

### Rust Unit Tests (in `repositories/transaction.rs`)

| Category | Tests | Count |
|----------|-------|-------|
| CRUD operations | create income, create expense, get, update, delete | 5 |
| Validation failures | zero amount, invalid account, cross-workspace, bad category, bad date, long strings | 7 |
| Balance maintenance | create adjusts, update amount adjusts, update account moves, delete reverses | 4 |
| Search and filter | account, category, date range, direction, text, amount range, combined | 7 |
| Pagination | limit, offset, max limit clamping, total_count | 4 |
| Ordering | date DESC, id DESC stability | 1 |
| Batch operations | batch succeeds, batch rollback on failure, batch mixed amounts | 3 |
| Balance utilities | verify true, verify false, rebuild | 3 |
| **Subtotal** | | **34** |

### Foreign Key and Cascade Tests

| Test | Count |
|------|-------|
| Delete account cascades to transactions | 1 |
| Delete category nullifies transaction.category_id | 1 |
| Delete workspace cascades to transactions via accounts | 1 |
| FK violation on insert with invalid account_id | 1 |
| **Subtotal** | **4** |

### Migration Tests

| Test | Count |
|------|-------|
| Migration 0005 creates table with correct columns | 1 |
| Indexes exist (4 indexes) | 1 |
| CHECK constraint rejects zero amount | 1 |
| No transaction_type or import_session_id column | 1 |
| **Subtotal** | **4** |

### Performance Tests

| Test | Count |
|------|-------|
| 10k transactions list query timing + index verification | 1 |
| 50k transactions filter query timing + index verification | 1 |
| 100k transactions filter query timing + index verification | 1 |
| Balance correct after bulk seed | 1 |
| **Subtotal** | **4** |

### Total New Tests: ~46

---

## Performance Expectations

| Dataset Size | Query Type | Target | Index Requirement |
|-------------|-----------|--------|-------------------|
| 10,000 transactions | List (no filter, limit 50) | < 50ms | idx_transactions_date |
| 50,000 transactions | Filter by account + date range | < 100ms | idx_transactions_account_id, idx_transactions_date |
| 100,000 transactions | Filter by category + direction | < 200ms | idx_transactions_category_id (direction uses amount_minor sign, covered by table scan within indexed subset) |

**Performance test requirements:**
- State the dataset size
- Record measured query timings (printed in test output)
- Identify the tested filters
- Confirm the intended query plan uses appropriate indexes (EXPLAIN QUERY PLAN)
- Document any material regression or unexpectedly slow result
- Non-gating for Sprint 4 (tests pass unconditionally but results must be printed)

**Required indexes:** 4 indexes are created by the migration (account_id, category_id, date, workspace_id). These cover all documented filter patterns.

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Atomic balance updates add complexity to create/update/delete | Bugs in balance maintenance | Medium | Every test verifies `balance == SUM(amount_minor)`. verify_balance utility catches drift. ADR 0009 documents invariants. |
| Account-change on update requires adjusting two accounts | Partial state if one update fails | Low | Both adjustments in same SQLite transaction. Rollback on failure. |
| 100k performance target may not be met with basic LIKE search | Text search degrades at scale | Medium | Accept degradation for LIKE queries. Document gap. FTS5 can be added later if needed. |
| `create_batch` with thousands of items may be slow | Import performance concern | Low | SQLite handles bulk inserts well within a single transaction. 10k inserts typically < 1s. |
| Date validation as TEXT | Invalid dates could be stored | Low | Validate format (YYYY-MM-DD) and basic range in repository. SQLite does not validate dates natively. |

---

## Deferred Work

| Item | Target | Notes |
|------|--------|-------|
| Transfer representation (ADR required) | Sprint 5 or dedicated design phase | Needs paired-record design, dual-account balance, linking integrity |
| Import sessions table | CSV import sprint | Schema designed with import workflow |
| Import deduplication metadata | CSV import sprint | Designed with import workflow |
| Recurring transaction templates | Future sprint | Listed in Data Model "Future Considerations" |
| Auto-categorization rules | Future sprint | Listed in Data Model "Future Considerations" |
| Tags/labels on transactions | Future sprint | Listed in Data Model "Future Considerations" |
| Soft delete / audit trail | Not currently required | Hard delete is the documented strategy |
| Full-text search (FTS5) | If LIKE performance is insufficient | SQLite FTS5 extension can be added later |
| Transaction CSV export | Sprint 5+ (Reports) | Milestone 3 scope |
| Multi-currency conversion | Future ADR required | ADR 0008 addresses storage but not conversion |
| Reconciliation workflow | Sprint 5+ | Status field exists; workflow is UI-level |

---

## ADRs

### Created During Implementation (Required)

| ADR | Topic | Timing |
|-----|-------|--------|
| ADR 0009 | Cached account balance with transactional updates | Before repository code is written (Phase A) |

ADR 0009 must document: the strategy, alternatives considered (computed on read, event sourcing), atomicity guarantees, how edits and deletes reverse effects, rebuild path, and testing requirements.

### Future ADRs (Not Created in Sprint 4)

| ADR | Topic | Trigger |
|-----|-------|---------|
| ADR 0010+ | Transfer transaction representation | When transfers are designed |

---

## Milestone 2 Exit Criteria

Sprint 4 is the final sprint of Milestone 2. Upon completion, all exit criteria from `docs/milestones.md` must be verified:

| Criterion | Sprint |
|-----------|--------|
| Ledger can create and open a local SQLite database | 2 ✓ |
| Migrations run reliably on first launch and on schema changes | 2 ✓ |
| Database service abstraction isolates SQLite | 2 ✓ |
| Workspaces, accounts, categories CRUD via Tauri commands | 3 ✓ |
| Transactions CRUD via Tauri commands | **4** |
| Transactions searched and filtered by date, category, amount, account | **4** |
| Repository pattern provides clean boundary | 3 ✓ |
| Domain entity validation prevents invalid data | 3 ✓ |
| Import data path exists for programmatic transaction creation | **4** |
| Data persists after app restart | 2 ✓ |
| Foreign key constraints enforced and tested | 3 ✓ |
| Performance validated against representative dataset sizes | **4** |
| Database file location documented | 2 ✓ |
| Backup/export design documented | 2 ✓ |
| No dashboard, report, budget, goal, or UI feature code | All ✓ |
| No Plaid, Stripe, licensing, or cloud code | All ✓ |

---

## Review Checklist

After implementation, verify each item before committing:

- [ ] ADR 0009 created before repository code
- [ ] `src-tauri/src/models/transaction.rs` exists with all types (no TransactionType enum)
- [ ] `models/mod.rs` exports transaction module
- [ ] `src-tauri/migrations/0005_transactions.sql` exists
- [ ] Schema has NO `transaction_type` column
- [ ] Schema has NO `import_session_id` column
- [ ] Schema has CHECK(amount_minor != 0)
- [ ] Migration registered in `db/migration.rs`
- [ ] `src-tauri/src/repositories/transaction.rs` exists with CRUD + list + batch
- [ ] `repositories/mod.rs` exports transaction module
- [ ] Balance updates are atomic (within SQLite transactions)
- [ ] `src-tauri/src/commands/transaction.rs` exists with 9 commands
- [ ] `commands/mod.rs` exports transaction module
- [ ] All 9 commands registered in `lib.rs` generate_handler
- [ ] `src/types/domain.ts` has Transaction types
- [ ] `src/api/transactions.ts` has typed invoke wrappers
- [ ] `cargo check` succeeds
- [ ] `cargo test` passes (all sprints)
- [ ] `npm run build` succeeds
- [ ] `npm run lint` exits 0
- [ ] `npm run format:check` exits 0
- [ ] `npm run test` exits 0
- [ ] `npm run dev` launches and migrates to version 5
- [ ] `workspaces`, `accounts`, `categories`, `transactions` tables exist
- [ ] No budget, goal, report tables exist
- [ ] FK constraints enforced on transactions
- [ ] Indexes verified (4 transaction indexes)
- [ ] Performance test results documented with timings
- [ ] EXPLAIN QUERY PLAN confirms index usage
- [ ] Account balance == SUM(amount_minor) verified in tests
- [ ] Milestone 2 exit criteria verified
- [ ] TASKS.md updated
- [ ] CHANGELOG.md updated
- [ ] ARCHITECTURE.md updated
- [ ] README.md updated
- [ ] Sprint 4 notes finalized

---

## Documentation Updates Required After Implementation

| Document | Update |
|----------|--------|
| TASKS.md | Mark Sprint 4 tasks as complete |
| CHANGELOG.md | Add Sprint 4 entry |
| ARCHITECTURE.md | v1.4, "Sprint 4 Complete — Transaction Engine", "Milestone 2 Complete" |
| README.md | Update project status to "Milestone 2 Complete", update repository structure |
| docs/sprint-notes/sprint-4.md | Status → Complete |
| docs/milestones.md | Mark Milestone 2 exit criteria as checked |
| docs/adr/0009-cached-balance-strategy.md | Create during Phase A |

---

## What Sprint 5 Will Build On

Sprint 4 delivers the complete data platform. Sprint 5 (Budgets, Goals, and Reports) will:

- Query transactions by category and date range for budget tracking
- Aggregate amounts for spending-by-category reports (using sign to distinguish income/expense)
- Use account balances for goal progress
- Build dashboard widgets that consume transaction summaries
- Potentially design the transfer linking mechanism (ADR required first)

Sprint 4 must not implement any of this. But the transaction query system, balance integrity, and data model must be solid enough to support these features without schema changes.
