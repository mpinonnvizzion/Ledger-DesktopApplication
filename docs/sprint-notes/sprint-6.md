# Sprint 6: Transactions UI — Implementation Plan

**Status:** In Progress — Phase A (Transaction UI Foundation), Phase B1 (Read-Only Transaction List), Phase B2 (Create Transaction), and Phase B3 (Edit Transaction) complete; Phase B4 (Delete Transaction) not started
**Date:** 2026-07-18 (ratified 2026-07-19, Phase A completed 2026-07-19, Phase B1 completed 2026-07-19, Phase B2 completed 2026-07-19, Phase B3 completed 2026-07-19)

---

> ## Naming Conflict — Resolved 2026-07-19
>
> `docs/milestones.md` (v2.1) and `TASKS.md` previously defined "Sprint 6" as "Budgets, Goals, and Reports," with Transactions UI described as part of "Sprint 5: Personal Finance UI." This document was created per explicit direction to plan "Sprint 6" as Transactions UI, which conflicted with that existing numbering.
>
> The Product Owner resolved this conflict on 2026-07-19: **this document is now the ratified Sprint 6 plan.** Sprint 5 is confirmed as Accounts UI (complete); Sprint 7 is Categories UI; Sprint 8 is Dashboard; Budgets, Goals, and Reports move out of Milestone 3 to be replanned later as separate product domains. See `docs/milestones.md`'s "Future Milestones (Unscheduled)" section and `docs/sprint-notes/sprint-5.md`'s "Scope Change and Documentation Conflict" section for the full history.

---

## Objective

A user can view, create, edit, and safely manage locally stored financial transactions across their accounts. After this phase, a user can record income and expenses against any account, see accurate running balances update automatically, browse their transaction history in chronological order, and delete a transaction with a clear, safe confirmation — all through the desktop UI, backed by local SQLite persistence, with no network dependency.

This wording is deliberately narrower than the original `sprint-5.md` Phase D objective ("full CRUD, search, filter, sort, and pagination"). It matches the phase structure below: full search, multi-field filtering, and keyboard shortcuts are evaluated for inclusion but are not guaranteed core scope — see "Scope" and Phase B1 below.

---

## Backend Contract Reference

This section is the authoritative technical reference for this plan. It was produced by directly inspecting the Sprint 4 implementation (migration, models, repositories, commands, TypeScript wrappers, and tests) — not by assumption or by re-reading the original `data-model-overview.md` draft spec, which predates the actual implementation and differs from it in places (noted below).

### Transaction entity fields

Source: `src-tauri/migrations/0005_transactions.sql`, `src-tauri/src/models/transaction.rs`, confirmed by the test `no_transaction_type_or_import_session_columns` and `migration_creates_correct_columns`.

| Field | Type | Required | Mutable | Stored as | Validation | Default |
|---|---|---|---|---|---|---|
| `id` | integer | n/a (server-assigned) | no | `INTEGER PRIMARY KEY` | — | autoincrement |
| `workspace_id` | integer | yes | no (not in `UpdateTransactionInput` at all) | `INTEGER NOT NULL REFERENCES workspaces(id)` | must reference an existing workspace | — |
| `account_id` | integer | yes | yes | `INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE` | must reference an account in the same workspace | — |
| `category_id` | integer, nullable | no | yes (patch-style, see below) | `INTEGER REFERENCES categories(id) ON DELETE SET NULL` | if provided, must reference a category in the same workspace | `NULL` (uncategorized) |
| `amount_minor` | integer (i64) | yes | yes | `INTEGER NOT NULL CHECK(amount_minor != 0)` | **cannot be zero** — enforced by both a DB `CHECK` constraint and application validation | — |
| `description` | string | yes | yes | `TEXT NOT NULL DEFAULT ''` | max 500 characters (app-layer) | `''` if omitted at the SQL layer, but the Tauri command requires it as a non-optional `String` argument — in practice always supplied by the UI |
| `date` | string `YYYY-MM-DD` | yes | yes | `TEXT NOT NULL` | must be `YYYY-MM-DD`; year 1900–2999, month 1–12, day 1–31 — **not a real calendar check** (e.g., `2026-02-30` passes; see Risks) | — |
| `notes` | string, nullable | no | yes (patch-style, see below) | `TEXT` | max 2000 characters (app-layer) | `NULL` |
| `status` | enum | no | yes | `TEXT NOT NULL DEFAULT 'uncleared' CHECK(status IN (...))` | `uncleared` \| `cleared` \| `reconciled` | `uncleared` |
| `source` | enum | no (create only; not updatable) | no | `TEXT NOT NULL DEFAULT 'manual' CHECK(source IN (...))` | `manual` \| `import` \| `plaid` | `manual` |
| `created_at` | string | n/a | no | `TEXT NOT NULL DEFAULT (datetime('now'))` | — | now |
| `updated_at` | string | n/a | no (server-managed) | `TEXT NOT NULL DEFAULT (datetime('now'))` | — | now, bumped on every update |

**Fields the model does NOT include** (confirmed absent, not assumed): a posted/cleared date separate from `date`; a `payee` field distinct from `description`; a transfer/linked-transaction reference; an import-session reference (`data-model-overview.md`'s draft "Import Session reference" field was never implemented — the actual `source` enum is the only import-related field, and there is no `import_sessions` table). There is no `transaction_type` column — direction is derived entirely from the sign of `amount_minor`. `Direction` (`income` | `expense`) exists in the Rust model only as a **query filter parameter**, never as a stored column.

### Transaction types

There is no transaction-type enum on the entity itself. The domain distinguishes exactly two directions, both derived from the sign of `amount_minor`:

- **Income** — `amount_minor > 0`
- **Expense** — `amount_minor < 0`

The domain does **not** distinguish transfer, credit-card payment, refund, or adjustment as separate types — these would all just be an income or expense transaction with no special marking. `TransactionSource` (`manual` | `import` | `plaid`) exists but describes provenance, not economic type, and only `manual` is currently produced by any command (import and Plaid are unbuilt features from later milestones).

### Amounts

Confirmed by `create_income_transaction`, `create_expense_transaction`, `create_zero_amount_fails`, `check_constraint_rejects_zero_amount`, and the `Direction` filter logic in `TransactionRepository::list`:

- **Sign convention:** positive `amount_minor` = income (money in); negative `amount_minor` = expense (money out).
- **Integer minor units:** exact, per [ADR 0008](../adr/0008-monetary-amounts-as-integer-minor-units.md) — `$42.50` is stored as `4250`. This is already fully supported by the existing `formatAmount`/`parseAmount` helpers in `src/lib/format.ts`, which already handle negative values correctly (used today by the Accounts page and tested).
- **Zero amounts are rejected**, both by a SQLite `CHECK` constraint and by application-layer validation (`amount_minor cannot be zero` in both `create` and `update`). A raw `CHECK` violation (bypassing app validation) would surface as a generic `database_error`, not a friendly message — in practice this can only happen if a bug lets an invalid value reach raw SQL, which the UI must not do.
- **Credit-card balances:** no special handling exists or is needed — a credit card account's `balance` is just the signed sum of its transactions like any other account. A purchase is a negative transaction (balance becomes more negative / more owed); a payment is a positive transaction (balance moves toward zero). The UI must not add credit-card-specific sign inversion.
- **Decimal parsing:** the existing `parseAmount("42.50") → 4250` / `formatAmount(4250) → "42.50"` pair already does this correctly, including negative values, and needs no changes.

### CRUD contract

Source: `src-tauri/src/commands/transaction.rs`, `src-tauri/src/commands/transaction_summary.rs`, `src/api/transactions.ts` (already implemented and verified to match the Rust commands exactly — **no changes to this file are anticipated**).

| Operation | TS wrapper signature | Notes |
|---|---|---|
| List | `listTransactions({ workspaceId, accountId?, categoryId?, dateFrom?, dateTo?, search?, amountMin?, amountMax?, direction?, limit?, offset? }): Promise<TransactionListResult>` | Returns `{ transactions: Transaction[], total_count: number }`. `total_count` reflects the full filtered match count, ignoring `limit`/`offset`. |
| Read | `getTransaction(id): Promise<Transaction>` | Not currently needed by any planned phase (list already returns full rows; edit reads from the already-fetched row). |
| Create | `createTransaction(workspaceId, accountId, amountMinor, description, date, categoryId?, notes?, status?, source?): Promise<Transaction>` | Positional. `source` should never be passed by the UI (always defaults server-side to `manual`). |
| Update | `updateTransaction(id, accountId?, categoryId?, amountMinor?, description?, date?, notes?, status?): Promise<Transaction>` | Positional. **`categoryId` and `notes` are patch-style**: omit (`undefined`) to leave unchanged, pass `null` to explicitly clear, pass a value to set. All other fields are single-`Option` (omit to leave unchanged; cannot be explicitly nulled since they're non-nullable). |
| Delete | `deleteTransaction(id): Promise<void>` | Hard delete — see "Deletion" below. |
| Batch create | `createTransactionBatch(transactions): Promise<Transaction[]>` | All-or-nothing (validates every row before inserting any); exists for a future import feature — **not used by any Sprint 6 phase**. |
| Summary/aggregation | `getTransactionSummary(workspaceId, dateFrom, dateTo): Promise<TransactionSummary>` | Returns `{ income_minor, expense_minor, net_minor, transaction_count }`. `expense_minor` is **negative**, not an absolute value. Workspace-wide only — no account or category filter. **Not used by any Sprint 6 phase** (it exists for a future Dashboard, which is out of scope here). |
| Balance utilities | `getAccountBalance(accountId)`, `verifyAccountBalance(accountId)`, `rebuildAccountBalance(accountId)` | Diagnostic/recovery tools per [ADR 0009](../adr/0009-cached-account-balance-strategy.md) — not part of the normal create/edit/delete path (balance updates happen automatically inside those commands) and not needed by any planned UI phase. |

**Error behavior:** identical, already-established pattern — `DomainError` → `CommandError { code, message }` → `parseCommandError` on the frontend. No new error codes; reuse the existing `src/lib/errors.ts` as-is.

**Ordering:** list queries are **not** client-orderable — the repository always returns `ORDER BY date DESC, id DESC` (newest date first; for same-day transactions, most-recently-created first). This is deterministic and must not be overridden client-side, or pagination (`limit`/`offset`) will produce incorrect/inconsistent pages.

### Transfers

**Not implemented, and not partially supported.** There is no transfer/linked-transaction column anywhere in the schema, model, or repository. A "transfer" today can only be represented as two independent, unlinked transactions (an expense on one account, an income on another) with no system-level relationship between them — editing or deleting one would never affect the other, and there is no way to query "the other half" of a transfer. This matches `sprint-5.md`'s own Out-of-Scope table ("Transfers | No transfer ADR exists").

**Decision: Sprint 6 explicitly defers transfer UI.** It will not fake transfers via two client-created linked-looking transactions, since there is no backend support to keep such a pair consistent (see Risks and ADR Recommendations below).

### Categories

Source: `src-tauri/src/models/category.rs`, `src-tauri/src/repositories/category.rs`, `src-tauri/src/repositories/transaction.rs` validation.

- **Category is optional** — `category_id` is nullable at every layer (schema, model, create/update input, query filter). Uncategorized transactions are a fully supported, first-class state, not an edge case.
- **Categories are workspace-scoped** — both `create` and `update` on transactions reject a category from a different workspace (`"Cross-workspace category assignment is not allowed."`).
- **There is no archived/inactive concept for categories at all** — `Category` has no `is_active` field. Every category returned by `listCategoriesByWorkspace` is always selectable; "whether archived categories may be selected" does not apply.
- **System categories** (`is_system = true`, from `seed_default_categories`) behave identically to user categories for transaction assignment — the `is_system` flag only affects category *rename/delete* restrictions (enforced in the category repository, irrelevant to transactions).
- **Category type is not enforced against transaction direction.** The backend does not reject assigning an `expense`-type category to a positive-amount transaction, or vice versa. This is a genuine, confirmed backend gap, not an oversight in this plan — see Product Decision 4 below for how the UI handles it without inventing backend behavior.

### Accounts

- **Archived accounts CAN receive new transactions.** `TransactionRepository::validate_create_input` checks that the account exists and belongs to the correct workspace — it does **not** check `is_active`. This is a genuine, confirmed finding, not an assumption. See Product Decision 5 below for how the UI handles this without changing backend behavior.
- **Transaction creation, update, and deletion update account balance automatically**, atomically, in the same SQLite transaction as the row mutation — per [ADR 0009](../adr/0009-cached-account-balance-strategy.md) and confirmed directly in `TransactionRepository::create`/`update`/`delete`. The UI never computes or writes balances itself.
- **Balance is stored (cached), not derived at read time.** `accounts.balance` is a running total; reads are O(1). `verify_balance`/`rebuild_balance` exist only for drift detection/recovery, not normal-path use.
- **Account deletion is constrained by transactions only in the sense that it cascades to them** (`ON DELETE CASCADE`, confirmed by `delete_account_cascades_to_transactions`) — this is Accounts-feature scope (deletion isn't implemented in the UI yet at all; see `sprint-5.md`), not something Sprint 6 needs to handle, but it's relevant background: once account deletion UI exists, deleting an account will silently destroy all its transactions, which is exactly why `sprint-5.md`'s deferred account-deletion plan requires a cascade warning.

### Deletion

- **Hard delete.** `DELETE FROM transactions WHERE id = ?` — the row is gone. There is no soft-delete, archive, or trash concept for transactions (unlike accounts, which have `is_active`).
- **No linked records constrain transaction deletion** — nothing else references a transaction as a foreign key.
- **Account balance is recalculated (adjusted) atomically** on delete: `balance -= amount_minor`, in the same DB transaction as the row delete.

### Ordering and pagination

- **Default and only ordering:** `date DESC, id DESC` (confirmed by `list_default_ordering`). Not client-configurable.
- **Filters available today:** `account_id`, `category_id`, `date_from`/`date_to` (inclusive range, each independently optional), `search` (case-insensitive substring match on `description` only — not `notes`), `amount_min`/`amount_max` (compared against `ABS(amount_minor)`, so these bound magnitude regardless of direction), `direction` (`income` → `amount_minor > 0`, `expense` → `amount_minor < 0`). There is **no** `status` filter exposed today, even though `status` exists on the model.
- **Pagination:** `limit` (default 50, clamped to a max of 500) and `offset` (default 0, floored at 0), confirmed by `list_respects_limit_and_offset`, `list_clamps_limit_to_max`. `total_count` in the response reflects the full filtered match count independent of `limit`/`offset` (confirmed by `list_total_count_ignores_limit`) — this is exactly what a "Page X of Y" control needs.
- **Search:** substring match only, no full-text search, no ranking.

### Performance

Indexes confirmed present (via `migration_creates_indexes`, four single-column indexes): `idx_transactions_account_id`, `idx_transactions_category_id`, `idx_transactions_date`, `idx_transactions_workspace_id`. **No composite index exists** for the most common query shape (`WHERE workspace_id = ? ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`) — SQLite can use at most one of `idx_transactions_workspace_id` or `idx_transactions_date` to help this query, not both together.

**This is flagged, not treated as blocking.** The existing Rust performance tests (`performance_10k_list`, `performance_50k_filter`, `performance_100k_filter`) exercise exactly this query shape at up to 100,000 rows and print `EXPLAIN QUERY PLAN` output and elapsed time for manual inspection, though they assert only correctness, not a time bound. `README.md`'s prior status line claimed "29ms filtered queries" at 100k rows, which is fast enough that a composite index is not needed to ship a usable first Transactions page — 100k transactions is already a large multi-year history for a personal-finance user. **Recommendation:** do not add a composite index speculatively now; if real-world usage or a future performance test regresses this, add `CREATE INDEX idx_transactions_workspace_date ON transactions(workspace_id, date DESC)` at that time (a one-line migration, not a redesign).

---

## Product Decisions

### 1. Transaction terminology

**Decision: use "Description" and "Notes,"** matching the schema field names exactly (`description`, `notes`). There is no `payee` field in the model — introducing "Payee" or "Merchant" in the UI would describe a field that does not exist and would be inconsistent with every other page in this app, which already labels fields after their backend names (e.g., Accounts' "Institution" maps to `institution_name`). "Memo" is not used since the backend calls it `notes`.

### 2. Amount-entry model

**Decision: a Direction toggle/select (Income / Expense) plus a positive-amount `AmountInput`.** The user types a plain positive dollar amount and picks "Income" or "Expense"; the form negates the parsed cents value when Expense is selected before calling `createTransaction`/`updateTransaction`. This was already the direction chosen in the original (superseded) `sprint-5.md` Phase D plan and is the only model that satisfies "the user should not need to understand internal storage conventions" — a raw signed-amount input would require users to type a leading `-` and remember that expenses are negative, which is exactly the internal convention this decision shields them from. A more elaborate "transaction type selector" (with more than two options) is rejected because the schema has no field to store anything beyond the amount's sign — there is nothing else to select.

### 3. Account balance behavior

Documented in full in "Accounts" above. Restated precisely for implementation: **the UI never computes a balance.** After create/edit/delete, the transaction list is refetched from `listTransactions`, and if any account balance is displayed anywhere on the Transactions page (e.g., next to the account selector for context), it is refetched via `listAccountsByWorkspace` or `getAccountBalance`, never adjusted client-side. This mirrors the "canonical refetch after mutation" pattern already established across every Accounts phase.

### 4. Category behavior

**Decision:** the category selector shows **all** workspace categories (both types), grouped visually by Income/Expense for scannability (matching the category repository's own `ORDER BY category_type, name`), plus an explicit "Uncategorized" option. The UI does **not** filter or restrict the category list based on the transaction's current direction, because the backend does not enforce category-type matching and there is no product documentation establishing that it should — inventing a client-side restriction the backend doesn't share would create a UI that silently disagrees with what the API actually allows, and would need to be un-done if a future category-matching validation is added server-side. If category/direction mismatch turns out to matter to users, add backend validation first (a Backend Change Rule-style gap report), then restrict the UI to match — not the other way around. Uncategorized is fully supported (`category_id: null`).

### 5. Archived records in selectors

- **Categories:** moot — there is no archived state for categories (see above); all categories are always shown.
- **Accounts:** **decision — the "Account" selector on the Create Transaction dialog excludes archived accounts by default.** The backend allows assigning transactions to archived accounts (no validation blocks it), but a user archives an account specifically to signal "I'm done actively using this," and offering it as a destination for a brand-new transaction would contradict that intent. This is a **UI-level restriction, not a backend one** — flagged explicitly as a product decision made for this plan, not a discovered backend rule, and easily reversible if product direction says otherwise. **The Edit Transaction dialog is different:** if an existing transaction already belongs to an account that has since been archived, that account must still appear in the dropdown (pre-selected, labeled e.g. "Old Savings (Archived)") so the edit form never shows an invalid or blank selection for legitimate historical data.

### 6. Dates

**Decision: use the single `date` field only.** The model has no separate posted date, and no user workflow in this plan requires one (no bank sync exists yet — "posted vs. pending" is a Plaid-era distinction from Milestone 5, not relevant here). Default the create form's date to today (`new Date().toISOString().slice(0, 10)`, matching the local machine's date — no timezone conversion is performed, consistent with the plain `YYYY-MM-DD` string storage).

### 7. Transfers

**Explicitly deferred**, per the "Transfers" section above. No transfer UI, no "linked transaction" affordance, and no client-side heuristic for detecting/pairing transfer-like transactions (e.g., matching amounts on the same day across two accounts) is built in Sprint 6. See ADR Recommendations.

### 8. Delete safety

**Decision: transaction deletion is permanent (hard delete) and irreversible** — there is no restore mechanic, unlike accounts' archive/restore. The confirmation dialog (via the existing `ConfirmDialog`, already extended with an `error` prop in the Accounts work) must say so plainly: *"Delete this transaction? This cannot be undone. The account balance will be adjusted."* No "Archive Instead" alternative is offered, because transactions have no archive concept to offer.

### 9. Currency

**Decision: no multi-currency UI.** Transactions have no currency field of their own; `amount_minor` is implicitly in the account's currency. `formatAmount`/`AmountInput` will format and parse plain decimal amounts using the existing hardcoded `/100`, `$`-prefixed convention already used throughout the Accounts UI — this is an existing, codebase-wide simplification (see [ADR 0008](../adr/0008-monetary-amounts-as-integer-minor-units.md)'s "Future Considerations: Multi-Currency Support"), not a new limitation introduced here.

### 10. Table design

**Decision: a plain semantic `<table>`**, matching the Accounts page's established pattern exactly — **not** a generic `Table.tsx` primitive (none exists; see the Sprint 5 closeout's documentation-conflict note that `Table.tsx` was listed as built in the Phase A notes but was never actually created or adopted), and **not** a card-based list. Recommended columns, derived only from actual fields and the decisions above: **Date, Description, Category, Account, Amount, Actions.** `Status` (uncleared/cleared/reconciled) exists on the model but is not surfaced as a column in this plan — no workflow here reads or sets it, and adding a column with no interaction would be premature. Amount is right-aligned and color-differentiated by sign (positive/negative), consistent with the existing account-balance color convention, with the sign's numeric value (not color alone) as the actual source of truth (accessibility requirement, see below).

---

## Architecture Constraints (preserved)

- **Local-first / offline-first** — every operation goes through Rust/SQLite via typed Tauri commands; no network calls.
- **Rust as backend authority** — all validation, balance math, and ordering happen server-side; the frontend never duplicates domain logic (e.g., no client-side balance computation, no client-side re-sorting of the list).
- **Integer minor units** — `amount_minor` is parsed/formatted via the existing `parseAmount`/`formatAmount` helpers; no floating-point currency math anywhere.
- **Typed Tauri API boundary** — consume `src/api/transactions.ts` exactly as it exists today; no changes to that file are anticipated (verified to match the Rust commands 1:1 during inspection).
- **Local page state** — `useState`/`useEffect` in `Transactions.tsx` and its dialogs, matching every Accounts phase; no global state library, no React Query, no other caching abstraction.
- **No generic form engine** — dialogs are colocated, purpose-built components (`CreateTransactionDialog`, `EditTransactionDialog`), following the established `CreateAccountDialog`/`EditAccountDialog` pattern (deliberately *not* unified into one generic form, per Sprint 5's own review conclusion that the two dialogs' field sets diverge enough to make a shared abstraction costlier than the duplication it would remove — transactions' create/edit dialogs are expected to diverge similarly, e.g. `source` is create-only).
- **No speculative component library** — reuse existing primitives (`Button`, `Input`, `Select`, `Textarea`, `Dialog`, `ConfirmDialog`, `EmptyState`, `LoadingSpinner`, `ErrorMessage`, `Badge`, `Card`) wherever they fit unmodified; build only what's genuinely missing (`AmountInput` — see Phase A).
- **Canonical refetch after mutations** — no optimistic updates; every create/edit/delete is followed by a refetch of the transaction list (and, if displayed, account balances) from the backend.
- **Sanitized errors** — reuse `parseCommandError`/`src/lib/errors.ts` unchanged; no Rust/SQLite/Tauri internals are ever shown to the user.
- **Deterministic presentation** — never override the backend's `date DESC, id DESC` ordering client-side.

---

## Scope

### In Scope (Phases A–B4)

- Transaction UI foundation: `AmountInput` component, direction/sign presentation helpers, Transactions page shell replacing the current placeholder.
- Read-only transaction list: table, deterministic ordering, loading/empty/error states, a simple single-account filter, basic Previous/Next pagination using the existing `total_count`/`limit`/`offset` contract.
- Create transaction: dialog with date, description, amount (direction + positive amount), account (active accounts only), category (optional, all types), notes (optional).
- Edit transaction: same fields, pre-populated, canonical refetch, patch-aware submission for `category_id`/`notes`.
- Delete transaction: confirmation, canonical refetch, permanent.

### Explicitly Out of Scope for This Plan

- Full multi-field filtering UI (category filter, date-range filter, direction filter) beyond the single account filter included in B1.
- Text search (debounced or otherwise).
- Keyboard shortcuts (`Ctrl/Cmd+N`, etc.).
- `status` (uncleared/cleared/reconciled) UI — display or editing.
- Transfers (explicitly deferred — see above).
- Dashboard, monthly summary UI, or any use of `getTransactionSummary`.
- Categories UI (still a placeholder page; the category *selector* inside the transaction dialogs is new, small, and local to those dialogs — it does not imply building the Categories management page).
- CSV import/export, Plaid, budgets, goals, reports, licensing, updater, cloud features.
- Bulk transaction operations of any kind.
- Permanent account deletion (separate, already-deferred Accounts scope).

These are candidates for a later phase (see "Phase B5" below) or a subsequent sprint, evaluated after B1–B4 ship and are reviewed — not assumed now.

---

## Implementation Phases

### Phase A — Transaction UI Foundation

**Objective:** Build the shared pieces every later phase depends on, without building any workflow yet.

**Scope:**
- `src/lib/transactionHelpers.ts` (or similarly named, colocated with `src/lib/accountTypes.ts`'s precedent): a `directionFromAmount(amountMinor: number): Direction` helper and any small label/formatting helpers genuinely needed by the table and dialogs (e.g., a category display helper that renders "Uncategorized" for `null`).
- `AmountInput` component (`src/components/ui/AmountInput.tsx`) — a **new** component; despite being listed as already built in `sprint-5.md`'s Phase A notes, it does not exist in the codebase (confirmed by direct inspection; see the Sprint 5 closeout's documentation-conflict note). Wraps `parseAmount`/`formatAmount`, accepts/returns a positive dollar amount as text, with label/error/disabled props matching the existing `Input` component's API shape.
- **Decision: no new `DateInput` component.** The existing `Input` component already spreads `InputHTMLAttributes<HTMLInputElement>`, so `<Input type="date" label="Date" ... />` already renders a native date picker with the same label/error/disabled styling as every other field — a bespoke wrapper would duplicate `Input` for no behavioral gain. Revisit only if a concrete requirement for a custom calendar UI emerges.
- Replace the `Transactions.tsx` placeholder with a page shell: header, "New Transaction" button (disabled/hidden until Phase B2 exists — or simply not rendered until B2, whichever is less code), and the data-loading skeleton (`useWorkspace`, `listAccountsByWorkspace`, `listCategoriesByWorkspace` wired up but not yet rendering a table) — mirroring `Accounts.tsx`'s B1 structure before the table existed.
- **Does not** build the transaction table, any dialog, or any mutation.

**Out of scope:** everything in Phase B1–B4.

**Dependencies:** none beyond what already exists (Sprint 3/4 backend, Sprint 5 UI primitives and `WorkspaceContext`).

**Architecture constraints:** see "Architecture Constraints" above; `AmountInput` must not introduce a new parsing implementation — it wraps the existing `parseAmount`/`formatAmount`.

**UX requirements:** `AmountInput` behaves like a normal text field with numeric formatting on blur/submit (matching how `parseAmount` is already used), not a custom spinner or masked input.

**Accessibility requirements:** `AmountInput` follows `Input`'s existing label/`aria-describedby`/`aria-invalid` pattern exactly.

**Testing requirements:** `AmountInput` unit tests (renders, formats display, converts to/from cents — mirroring the `format.test.ts` coverage already in place for `parseAmount`/`formatAmount`); `directionFromAmount` unit tests (positive → income, negative → expense; zero is never a valid input to this helper and does not need a case, since the backend rejects zero before a `Transaction` object with `amount_minor: 0` could ever exist).

**Manual verification requirements:** none beyond a clean `npm run dev` launch with no runtime errors (no interactive workflow exists yet to click through).

**Documentation updates:** none beyond this plan (implementation notes will be added to this file per the established per-phase pattern once built).

**Definition of Done:** `AmountInput` exists and is tested; `Transactions.tsx` shell renders without error for a workspace with zero accounts, some accounts, and a fetch error; no table or dialog exists yet; all automated checks pass.

**Review checkpoint:** primitives and shell only — reviewable as a small, low-risk diff before any workflow logic exists.

**Commit boundary:** one commit, scoped to Phase A only.

#### Phase A Implementation Notes (2026-07-19)

Transaction UI foundation implemented. No transaction list, dialog, or mutation exists yet — Phase B1 onward remain not started.

**Files created:**
- `src/lib/transactionHelpers.ts` — `parseAmountMagnitudeToMinorUnits`, `applyTransactionDirection`, `formatMinorUnits`, `formatSignedAmount`, `directionFromAmount`, `directionLabel`, `formatTransactionDate`, `categoryDisplayLabel`, `accountDisplayLabel`, `amountDisplayClass`
- `src/lib/transactionHelpers.test.ts` — 35 tests
- `src/components/ui/AmountInput.tsx` — new controlled currency-magnitude text field
- `src/components/ui/AmountInput.test.tsx` — 9 tests
- `src/hooks/useTransactionReferenceData.ts` — narrowly scoped hook loading active accounts and all categories for the current workspace
- `src/hooks/useTransactionReferenceData.test.tsx` — 8 tests
- `src/pages/Transactions.test.tsx` — 6 tests

**Files modified:**
- `src/pages/Transactions.tsx` — rewritten from the static placeholder into a page shell wired to `useTransactionReferenceData`, with loading/error/foundational-empty states. No table, dialog, or button for a workflow that doesn't exist yet.

**Deviation from this plan's original wording (Amount-entry model):** this Phase A's actual instructions (issued after this plan was written) required a stricter parsing contract than described above. Two changes from the text above:
1. **New parser, not a wrap of `parseAmount`.** `parseAmountMagnitudeToMinorUnits` is a new, strict implementation rather than a wrapper around the existing `parseAmount` (`src/lib/format.ts`). `parseAmount` is a lenient best-effort parser written for account balances that always originate from validated Rust data (it silently coerces malformed input rather than rejecting it, and was — until this phase — unused by any page). A user-typed transaction amount needs real validation (reject empty, reject a leading `-`, reject more than two decimal places, reject thousands separators, reject garbage), which is a different contract, not a duplicate of the same logic. `formatMinorUnits`, by contrast, *is* a plain re-export of the existing `formatAmount` — formatting was not duplicated, only parsing needed new, stricter behavior.
2. **No formatting-on-blur inside `AmountInput`.** The component is a plain controlled text field that stores and returns the raw string exactly as typed, with no internal parsing, normalization, or reformatting. Invalid text stays visible rather than being silently rewritten. Parsing and the create/edit form's blur/submit behavior are deferred to Phase B2, which will call `parseAmountMagnitudeToMinorUnits` and `applyTransactionDirection` explicitly.

**Reference-data eligibility and sorting (Backend Change Rule check — no gap found):**
- **Accounts:** `list_accounts_by_workspace` returns rows `ORDER BY id` (confirmed in `src-tauri/src/repositories/account.rs`), not name, so the hook filters to `is_active` accounts only (Product Decision 5 — archived accounts are not offered as a destination for a new transaction) and sorts the result alphabetically by name client-side, mirroring the precedent already established by `Accounts.tsx`'s own client-side sort.
- **Categories:** `list_categories_by_workspace` already returns rows `ORDER BY category_type, name` (confirmed in `src-tauri/src/repositories/category.rs`) — already deterministic and already grouped by type, matching Product Decision 4. That order is passed through unchanged; it is not re-sorted client-side, per the "never override backend ordering" architecture constraint. `Category` has no `is_active` field at all (confirmed in `src-tauri/src/models/category.rs`), so there is no archived-category state to filter — every category returned is eligible, exactly as this plan's "Categories" section already documented.
- No backend change was needed or made.

**Date field decision confirmed:** no `DateInput` component was built. The existing `Input` component's `InputHTMLAttributes` spread already supports `<Input type="date" ... />` cleanly, matching the decision recorded in this plan's Phase A scope above. This will be exercised for the first time in Phase B2's create-transaction form.

**Sidebar navigation:** verified already correct — `/transactions` in `Sidebar.tsx` and `App.tsx` already routed to the (previously placeholder) `Transactions` page. No changes were needed.

**Test results:** 169/169 frontend tests passing (111 existing + 58 new), `npm run lint` clean, `npm run format:check` clean, `npm run build` succeeds. `cargo check` and 104/104 Rust tests pass, unchanged — confirms no backend code was touched.

**Manual verification:** not performed. As with every prior Sprint 5 phase, no tooling exists in this environment to drive the native Tauri/WebView window — see the manual verification checklist reported alongside this phase's closeout for what a human pass should confirm.

---

### Phase B1 — Read-Only Transaction List

**Objective:** A user can see their transaction history across all (or one) account, in a clear, correctly ordered table, without yet being able to create, edit, or delete anything.

**Scope:**
- Fetch via `listTransactions({ workspaceId, limit: 50 })` on mount; never override the backend's `date DESC, id DESC` ordering.
- Table columns: Date, Description, Category (or "Uncategorized"), Account, Amount (formatted via `formatAmount`, right-aligned, sign-colored).
- Loading state (full-page spinner only on true-empty initial load, matching the Accounts precedent of never flashing a spinner over an already-rendered table on refetch), empty state ("No transactions yet. Record your first transaction." — copy finalized once Phase B2 exists to link its "New Transaction" action, matching how Accounts' B1 empty-state action was wired up in B2), sanitized error state with retry.
- **A simple, single-select account filter** (one `Select`, not a filter framework) — justified because it is already fully supported by the backend (`account_id` param) with zero new abstraction, and because an unfiltered list becomes materially less useful once a workspace has more than one account.
- **Basic pagination**: Previous/Next buttons plus a "Page X of Y" (or equivalent) indicator, using the existing `total_count`/`limit`/`offset` contract — included in B1 (not deferred) because a read-only list with no way to see past the newest 50 transactions is not a usable "list" for any workspace with real transaction history. This is list-usability, not a "filtering framework."
- **Excluded from B1** (see Scope): category filter, date-range filter, direction filter, text search.

**Dependencies:** Phase A (`Transactions.tsx` shell, `directionFromAmount`/label helpers).

**Architecture constraints:** identical fetch-effect pattern to `Accounts.tsx` (`Promise.resolve().then()` chain to satisfy `react-hooks/set-state-in-effect`, `cancelled` guard, retry-token-based refetch).

**UX requirements:** table remains calm/compact, matching Accounts' visual density; amount color is a secondary cue only (see Accessibility).

**Accessibility requirements:** semantic `<table>` with `scope="col"` headers and a `<caption className="sr-only">` describing the ordering, matching Accounts; sign is conveyed by the `+`/`-` (or parenthetical) in the formatted amount text itself, not by color alone; the account filter `Select` has a visible label.

**Testing requirements:** loading/empty/error states; correct column rendering and formatting for a representative row (income and expense); ordering is rendered exactly as returned (no client re-sort); account filter changes the query and refetches; pagination controls call `listTransactions` with the correct `offset`/`limit` and disable appropriately at the first/last page; "Uncategorized" renders for `category_id: null`.

**Manual verification requirements:** with real seeded data (created via existing Rust test fixtures or manually through B2 once available), confirm the visible order matches `date DESC, id DESC`; confirm pagination is stable across pages after clicking Next then Previous.

**Documentation updates:** `docs/sprint-notes/sprint-6.md` implementation notes (per-phase pattern), `CHANGELOG.md`.

**Definition of Done:** a workspace with transactions shows them correctly ordered, paginated, and filterable by account; a workspace with zero transactions shows the empty state; a fetch failure shows a sanitized, retryable error; all automated checks pass.

**Review checkpoint:** read-only, no mutation risk — safe to review and merge independently of B2–B4.

**Commit boundary:** one commit, scoped to Phase B1 only.

#### Phase B1 Implementation Notes (2026-07-19)

Read-only transaction list implemented. No create, edit, delete, filter, search, or pagination-control workflow exists yet — Phase B2 onward remain not started.

**Files created:**
- `src/pages/Transactions.test.tsx` — rewritten from the Phase A shell test into the full B1 test suite (27 tests)

**Files modified:**
- `src/pages/Transactions.tsx` — rewritten from the Phase A shell into the read-only transaction table described below
- `src/hooks/useTransactionReferenceData.ts` — extended with `accountsById`/`categoriesById` (see "Historical reference-data strategy" below); the existing `accounts`/`categories` fields and their 8 Phase A tests are unchanged
- `src/hooks/useTransactionReferenceData.test.tsx` — 2 new tests for the extension

**Deviation from this plan's original wording (Scope):** the actual instructions issued for this phase (after this plan was written) explicitly excluded the account filter and pagination controls this section originally scoped in. Both are deferred to a later, reviewed phase rather than built now:
- **No account filter.** The single-select account filter described above is not built. All transactions in the workspace's first page are shown.
- **No pagination controls.** Only the backend's first page (`limit: 50`, `offset: 0`, its own default) is fetched — no Previous/Next buttons. `total_count` is still captured from the response and, when it exceeds the number of rows shown, a plain informational sentence ("Showing the N most recent of M transactions") is displayed so the truncation is never silently invisible — this is not an interactive control, just a preserved-for-later piece of state surfaced honestly.

**Exact backend list contract used:** `listTransactions({ workspaceId, limit: 50 })` (`src/api/transactions.ts` → `list_transactions` Tauri command). No `accountId`, `categoryId`, `dateFrom`, `dateTo`, `search`, `amountMin`, `amountMax`, `direction`, or `offset` are passed. Response is `{ transactions: Transaction[], total_count: number }`; `transactions` is rendered in exactly the order returned (backend default `ORDER BY date DESC, id DESC`, confirmed already covered by the existing Rust test `list_default_ordering` — no new Rust test was needed).

**Table columns (final):** Date, Description, Account, Category, Type, Amount — matching this plan's recommendation exactly. Notes is excluded, as originally scoped ("no workflow here reads or sets it"). `Status` is likewise excluded, as originally scoped.

**Amount presentation:** uses `formatSignedAmount` (Phase A helper) prefixed with `$`, e.g. `$+42.50` / `$-15.00`, mirroring `Accounts.tsx`'s existing `` `$${formatAmount(...)}` `` convention exactly (dollar sign immediately before whatever sign the formatted number already carries) rather than inventing a new "$" placement rule. The sign character itself is the accessible source of truth for direction (per this plan's own Accessibility requirement above); `amountDisplayClass` (green/red) is a secondary color cue only. A zero amount (not reachable in practice — the backend's `CHECK(amount_minor != 0)` prevents it) renders deterministically as `$0.00`, never `-$0.00` (verified by both `transactionHelpers.test.ts`'s existing `applyTransactionDirection` zero test and a new page-level test).

**Historical reference-data strategy:** `useTransactionReferenceData` was extended (not replaced) with two new fields, `accountsById: Map<number, Account>` and `categoriesById: Map<number, Category>`, built from the *same* already-fetched account/category lists (no additional API call). This is a deliberate split from the hook's existing `accounts` field: `accounts` stays active-only (Product Decision 5 — correct for a future create-transaction selector) and is untouched; `accountsById` is unfiltered, so an archived account's historical transactions still resolve to its real name instead of "Unknown account". `categoriesById` mirrors `categories`, which was already unfiltered (categories have no archived state). Missing/unresolvable references (an id with no matching entry in the map) fall back to the existing Phase A helpers' deterministic text (`accountDisplayLabel` → "Unknown account", `categoryDisplayLabel` → "Uncategorized") rather than crashing or rendering blank.

**Currency-formatting strategy (contract gap, documented not fixed):** `CreateAccountInput.currency` (`src-tauri/src/repositories/account.rs`) confirms accounts *can* be created with a currency different from their workspace's default — currency is not actually single-valued per workspace at the schema level. However, neither `formatAmount`/`formatMinorUnits` nor any existing page (`Accounts.tsx`) renders a currency symbol or code at all — every amount in the app today is prefixed with a hardcoded `"$"` regardless of the record's actual `currency` field. This is a pre-existing, codebase-wide simplification, not something introduced by this phase — it matches this plan's own Product Decision 9 ("no multi-currency UI... an existing, codebase-wide simplification, see ADR 0008's 'Future Considerations: Multi-Currency Support'"). Phase B1 continues that exact existing pattern (hardcoded `"$"`) rather than inventing new currency-symbol-lookup logic. Flagged here per instruction, not treated as a Phase B1 blocker: a true multi-currency-aware UI is future work, not a defect in this phase.

**Loading/empty/error behavior:**
- **Loading:** a single combined loading state (`transactionsLoading || referenceLoading`) is shown until both the transaction fetch and the reference-data fetch complete, so labels are never rendered with a stale/empty lookup map. No empty-state text is shown before this resolves.
- **Empty:** "No transactions yet" with no create button, no import/sync language — room is explicitly left for Phase B2 to add a creation entry point later.
- **Error (transactions fetch fails):** blocking, full-page `PageErrorState` with retry — there is no meaningful table to show without transaction data.
- **Partial failure (transactions succeed, reference data fails):** non-blocking. The table still renders using the deterministic fallback labels described above, with a dismissal-free warning banner (`ErrorMessage`, `role="alert"`) above the table explaining that some names may be placeholders. This was a deliberate choice between the two options this plan's parent instructions offered — chosen because blocking the entire transaction history behind a failure in supplementary label data would contradict the local-first principle of not letting a secondary data source hide the user's primary financial record.
- **Retry:** a single retry action re-triggers both the transaction fetch and the reference-data fetch (`retryReferenceData()` plus a local retry-token bump), regardless of which one is currently failing.

**Test results:** 192/192 frontend tests passing (net +23 over Phase A's 169: `Transactions.test.tsx` grew from 6 Phase A shell tests to 27 B1 tests, a net +21; `useTransactionReferenceData.test.tsx` gained 2 tests for the new lookup maps), `npm run lint` clean, `npm run format:check` clean, `npm run build` succeeds. `cargo check` and 104/104 Rust tests pass, unchanged — confirms no backend code was touched.

**Manual verification:** not performed. As with every prior phase, no tooling exists in this environment to drive the native Tauri/WebView window — see the manual verification checklist reported alongside this phase's closeout.

---

### Phase B2 — Create Transaction

**Objective:** A user can record a new income or expense transaction against any active account.

**Scope:**
- `CreateTransactionDialog`: Date (`Input type="date"`, defaults to today), Description (`Input`, required), Amount (`AmountInput`, required, positive), Direction (`Select`, Income/Expense, required — determines the sign applied to the parsed amount before submission), Account (`Select`, required, **active accounts only** — see Product Decision 5), Category (`Select`, optional, all workspace categories grouped by type, plus "Uncategorized"), Notes (`Textarea`, optional).
- Validation: date required and valid `YYYY-MM-DD`; description required and not whitespace-only; amount required and non-zero (mirrors the backend's own rejection, checked before submission so the user never sees a raw backend zero-amount error); account required.
- On submit: negate the parsed amount if Expense is selected, then call `createTransaction(workspaceId, accountId, amountMinor, description, date, categoryId, notes)` (never pass `source` — always server-defaulted to `manual`).
- On success: close dialog, reset form, refetch the transaction list (Phase B1's fetch), and refetch account data if any balance is displayed anywhere on the page.
- Wire the "New Transaction" button from Phase A's shell to open this dialog (mirroring `CreateAccountDialog`'s header-button wiring).

**Dependencies:** Phase A, Phase B1 (for the post-create refetch and empty-state action wiring).

**Architecture constraints:** same reopen/reset-on-transition pattern as `CreateAccountDialog` (lazy initial state; `wasOpenRef`-based reset effect run in a `Promise.resolve().then()` to satisfy `react-hooks/set-state-in-effect`).

**UX requirements:** the dialog visually matches `CreateAccountDialog`/`EditAccountDialog` (same `Dialog` primitive, same button layout, "Cancel" / primary submit); Direction and Amount are presented together so the sign relationship is visually obvious without requiring the user to understand `amount_minor`.

**Accessibility requirements:** focus enters the Date or Description field on open (matching the established "focus the first meaningful field, not the dialog's own close button" fix from Accounts' Phase B2); all fields have associated labels; validation errors are field-adjacent and not conveyed by color alone; submit button shows a loading state and is disabled during submission (duplicate-submission prevention, matching every Accounts dialog).

**Testing requirements:** field-level validation (required date/description/amount/account; whitespace-only description rejected; zero amount rejected before any API call); direction correctly negates the submitted amount (test both Income and Expense paths); category omission omits `categoryId` (uncategorized); duplicate submission prevented while a request is in flight; API failure preserves entered values and shows a sanitized error; successful create closes the dialog, resets state, and triggers a refetch; the archived-accounts exclusion (Product Decision 5) is tested directly (an archived account never appears in the create dialog's account options).

**Manual verification requirements:** create an income transaction and confirm the account balance increases by exactly the entered amount after refetch; create an expense and confirm it decreases; confirm the new transaction appears in the correct sorted position without a page reload.

**Documentation updates:** sprint notes, `CHANGELOG.md`.

**Definition of Done:** a user can create a valid transaction of either direction against any active account, with or without a category, and see it appear correctly in the list with the account balance correctly updated; invalid input is rejected with clear, field-level messaging; all automated checks pass.

**Review checkpoint:** first mutation-capable phase — review focuses on the sign-conversion logic and the archived-account exclusion, since both are UI-only decisions layered on top of a backend that doesn't enforce either.

**Commit boundary:** one commit, scoped to Phase B2 only.

#### Phase B2 Implementation Notes (2026-07-19)

Transaction creation implemented. No edit, delete, filter, search, pagination-control, transfer, import, or reconciliation workflow exists yet — Phase B3 onward remain not started.

**Files created:**
- `src/components/transactions/CreateTransactionDialog.tsx`
- `src/components/transactions/CreateTransactionDialog.test.tsx` — 36 tests

**Files modified:**
- `src/pages/Transactions.tsx` — "New Transaction" button (header, gated on a fully usable page state) and the empty state's action, dialog wiring, canonical refetch on success (reuses the existing `retryToken` mechanism from Phase B1 — no new fetch path)
- `src/pages/Transactions.test.tsx` — 3 Phase B1-era assertions updated to reflect that creation now exists (see "Deviations" below), 4 new integration tests

**Exact `CreateTransactionInput` contract used** (verified directly against `src-tauri/src/models/transaction.rs`, `src-tauri/src/commands/transaction.rs`, and `src/api/transactions.ts` — not the draft spec):
```
createTransaction(
  workspaceId: number,
  accountId: number,
  amountMinor: number,
  description: string,
  date: string,
  categoryId?: number,   // no null variant on create
  notes?: string,        // no null variant on create
): Promise<Transaction>
```
`status` and `source` parameters exist on the wrapper but are never passed — both are server-defaulted (`uncleared`, `manual`).

**Deviations from this plan's original wording, discovered during implementation:**
1. **Direction is an accessible radio-button `<fieldset>`, not a `Select`.** The actual Phase B2 instructions (issued after this plan was written) explicitly required "an accessible grouped control" whose "selection must be understandable without color" — a `<fieldset>`/`<legend>` with two labeled radio inputs is the standard accessible pattern for a mandatory, always-visible binary choice, and matches that requirement more precisely than a dropdown. No new shared component was created — the markup lives directly in `CreateTransactionDialog.tsx`.
2. **Uncategorized and blank Notes are sent as `undefined`, not `null`.** `categoryId?: number` and `notes?: string` on `createTransaction` have **no nullable variant** for create — unlike `updateTransaction`'s later patch-style `number | null | undefined` / `string | null | undefined`. Sending `null` would be a TypeScript contract violation. This is a direct, verified consequence of "follow the transaction contract exactly; do not reuse account-specific null-handling assumptions" — the account-editing precedent (explicit `""` to clear `institution_name`) does not apply here because transaction *creation* has no existing-value-to-preserve concept at all.
3. **Description is required (client-side) even though the backend does not enforce non-emptiness.** `validate_create_input` (`src-tauri/src/repositories/transaction.rs`) only checks `description.len() > MAX_DESCRIPTION_LENGTH` — there is no minimum-length/non-empty check, and the SQL column defaults to `''`. Requiring a non-blank description is a UI-only decision (mirroring the Account Name field's own established required-and-trimmed pattern), documented here rather than presented as a discovered backend rule.
4. **Focus lands on the Expense radio, not the Date/Description field.** Since Direction is now the first control in the form (a deliberate placement so the sign relationship reads top-to-bottom before Amount), the "focus the first meaningful field, not the dialog's close button" fix applies to the Expense radio input instead.

**Zero-value validation decision:** the backend already independently rejects `amount_minor == 0` (`DomainError::Validation("Transaction amount cannot be zero.")` in `validate_create_input`). `parseAmountMagnitudeToMinorUnits` itself accepts `"0"` (parsing has no opinion on business rules — this was already documented in its Phase A docstring). The dialog adds a UI-layer rejection of a *parsed* zero magnitude ("Amount must be greater than zero.") before ever calling the backend, so the user sees a clear, immediate message rather than a round-trip validation error. This mirrors, rather than invents, the backend's own rule.

**Local calendar-date default:** `todayLocalDateString()` (private to `CreateTransactionDialog.tsx`) builds `YYYY-MM-DD` from `Date.getFullYear()`/`getMonth()`/`getDate()` — local accessors, never `toISOString()` (UTC-based) — computed fresh every genuine reopen transition, not once at module load.

**Account/category eligibility:** the dialog receives `accounts` (active-only, alphabetical) and `categories` (all, backend `category_type, name` order) as props — the exact same selector-purpose fields `useTransactionReferenceData` already exposed in Phase A/B1, unchanged. The dialog does no filtering of its own. The hook's separate `accountsById`/`categoriesById` (unfiltered, for the read-only table's historical labels) are never passed to or used by this dialog, keeping the two eligibility rules structurally separate per the architecture constraint.

**No-active-accounts behavior:** when `accounts` is empty, the Account `<Select>` is replaced entirely by explanatory text ("An active account is required to record a transaction...") rather than rendering a selector with a fake/placeholder-only value; the submit button is `disabled` directly (not just validated on submit); Cancel remains available. Covered by 3 dedicated tests.

**Canonical refetch (no optimistic insert):** `onCreated` closes the dialog and increments `Transactions.tsx`'s existing `retryToken` state — the exact same mechanism Phase B1 built for retry-after-error. The newly created transaction, its position under `date DESC, id DESC`, and the updated `total_count` all come from a fresh `listTransactions` call; no local array mutation or manual row insertion exists anywhere in the diff.

**Account balance behavior (inspected, not modified):** `TransactionRepository::create` (`src-tauri/src/repositories/transaction.rs`) performs the row `INSERT` and `UPDATE accounts SET balance = balance + amount_minor` inside a single `unchecked_transaction()`, committed together — atomic by construction. A positive (income) `amount_minor` increases the cached balance; a negative (expense) value decreases it (SQL addition handles the sign uniformly — no separate income/expense branch exists in the SQL). Account `currency` plays no role in this arithmetic; balance is always plain integer minor units regardless of the account's currency field. If either the insert or the balance update fails, the whole transaction rolls back (nothing commits) — there is no partial-write state. This is already covered by existing Rust tests (`create_income_transaction`, `create_expense_transaction`, `create_zero_amount_fails`, and the broader `assert_balance_consistent` helper used throughout `repositories/transaction.rs`'s test module); no new Rust test was added, and no Rust code was touched. When a user later opens Accounts, that page's own existing mount-time fetch (unrelated to this phase) picks up the updated balance naturally, since React Router unmounts/remounts page components on navigation — no new cache-invalidation code was needed or added.

**Test results:** 232/232 frontend tests passing (net +40 over Phase B1's 192: 36 new in `CreateTransactionDialog.test.tsx`, 4 new integration tests in `Transactions.test.tsx`, 0 net change to that file's other test count since 3 Phase-B1-era assertions were updated in place rather than added/removed), `npm run lint` clean, `npm run format:check` clean, `npm run build` succeeds. `cargo check` and 104/104 Rust tests pass, unchanged — confirms no backend code was touched.

**Manual verification:** not performed. As with every prior phase, no tooling exists in this environment to drive the native Tauri/WebView window — see the manual verification checklist reported alongside this phase's closeout.

---

### Phase B3 — Edit Transaction

**Objective:** A user can correct or update an existing transaction.

**Scope:**
- `EditTransactionDialog`: same fields as create, pre-populated from the selected transaction. Direction is derived from `existing.amount_minor`'s sign (positive → Income pre-selected; negative → Expense pre-selected); Amount is pre-populated with the absolute value.
- **Submission contract, precisely following the backend inspection above:** `account_id`, `amount_minor` (re-signed per the selected direction), `description`, `date` are always sent as their current (possibly unchanged) value — mirroring the "complete payload" style already established for account edits, for auditability. **`category_id` and `notes` must use the patch contract deliberately** — send `null` when the user clears them, omit (`undefined`) only if genuinely not touched by this form (in practice, since this form always renders both fields, "cleared" and "touched" are the same state here, so the form always sends an explicit value: either the current/new id, or `null`). This is the direct, load-bearing lesson from the account-institution-clearing discovery in `sprint-5.md` Phase B3, applied to the corresponding transaction fields.
- Account and category **can** be changed (confirmed supported by the backend, including correct cross-account balance adjustment) — both selectors behave exactly as in create, with the same archived-account handling nuance from Product Decision 5 (the transaction's current account is always shown even if archived).
- No dirty-state tracking — submitting unchanged values is safe and idempotent (matches the Accounts precedent).
- On success: canonical refetch of the transaction list (and account balances, if displayed) — never manually patch the row client-side.

**Dependencies:** Phase A, B1, B2 (shares the dialog's field components and validation approach).

**Architecture constraints:** same lazy-initial-state-from-prop pattern used by `EditAccountDialog` (fixing the bug discovered there — initializing directly from the selected transaction on mount, not only via a reopen-transition effect, since a dialog can legitimately mount already-open in tests and in principle in the app).

**UX requirements:** reopening the dialog for a different transaction must never leak the previous transaction's values (mirrors the tested Accounts requirement).

**Accessibility requirements:** identical to Phase B2's dialog.

**Testing requirements:** all of Phase B2's validation tests, plus: editing changes exactly the intended fields and leaves others as sent; category cleared via the edit form sends `null`, not `undefined`; changing the account triggers the correct two-account balance adjustment (verified against the mocked API call arguments, matching the backend's own `update_account_moves_balance`-style test intent); switching direction on an existing transaction correctly flips the sign of the submitted amount; editing one transaction then a different one does not leak stale form state; API failure preserves entered values.

**Manual verification requirements:** edit a transaction's amount and confirm the account balance adjusts by exactly the delta; move a transaction to a different account and confirm both accounts' balances update correctly; clear a transaction's category and confirm it becomes "Uncategorized" after refetch (not silently unchanged).

**Documentation updates:** sprint notes, `CHANGELOG.md`.

**Definition of Done:** every transaction field documented as mutable can be edited correctly, balance adjustments are correct in every case (amount-only change, account change, both), category/notes clearing works via the explicit-null contract, and no stale state leaks between edits; all automated checks pass.

**Review checkpoint:** the category/notes null-vs-omit contract is the single highest-risk detail in this phase and should be the specific focus of review (a silent bug here would look identical to success in casual testing — the field would just fail to clear).

**Commit boundary:** one commit, scoped to Phase B3 only.

#### Phase B3 Implementation Notes (2026-07-19)

Transaction editing implemented. No delete, filter, search, pagination-control, transfer, import, or reconciliation workflow exists yet — Phase B4 onward remain not started.

**Files created:**
- `src/components/transactions/EditTransactionDialog.tsx`
- `src/components/transactions/EditTransactionDialog.test.tsx` — 40 tests

**Files modified:**
- `src/pages/Transactions.tsx` — Actions column with a per-row "Edit [transaction]" button, `editingTransactionId`/`showEditDialog` state, dialog wiring, canonical refetch on success (reuses the existing `retryToken` mechanism)
- `src/pages/Transactions.test.tsx` — 2 Phase B1/B2-era assertions updated to reflect that editing now exists, 6 new integration tests
- `src/lib/transactionHelpers.ts` — `MAX_DESCRIPTION_LENGTH`/`MAX_NOTES_LENGTH` promoted from a `CreateTransactionDialog`-local pair of constants to shared exports, so Create and Edit cannot silently drift apart on these limits
- `src/components/transactions/CreateTransactionDialog.tsx` — imports the now-shared constants instead of defining its own copy; no behavior change

**Shared-form extraction decision: rejected, dialogs kept separate.** Following this plan's own architecture constraints and the precedent already set by `CreateAccountDialog`/`EditAccountDialog` (Sprint 5: "the two dialogs' field sets have already diverged... in a way that would make a shared abstraction more complex than the duplication it would remove"), `EditTransactionDialog` is a separate, purpose-built component. The two dialogs' *field markup* looks similar, but their semantics have genuinely diverged: Edit needs three-state category/notes clearing (Create only needs two-state), live change detection driving a disabled Save button (Create has no equivalent), and archived-current-account handling (a case Create never encounters, since a brand-new transaction has no "current" account to preserve). Only the two numeric constants above were shared; no shared form component was extracted.

**Exact `updateTransaction` contract used** (verified directly against `src-tauri/src/models/transaction.rs`, `src-tauri/src/commands/transaction.rs`, and `src/api/transactions.ts`):
```
updateTransaction(
  id: number,
  accountId?: number,
  categoryId?: number | null,   // three states: undefined = unchanged, null = clear, number = set
  amountMinor?: number,
  description?: string,          // two states only: undefined = unchanged, string = set (no null/clear)
  date?: string,
  notes?: string | null,         // three states: undefined = unchanged, null = clear, string = set
  status?: TransactionStatus,    // never sent by this dialog
): Promise<Transaction>
```
Confirmed by direct inspection of `TransactionRepository::update`: `account_id`, `amount_minor`, `description`, `date` are single `Option<T>` (omitted = keep existing); `category_id` and `notes` are `Option<Option<T>>` at the Rust struct level, which Tauri's per-argument binding resolves into the three-state TS shape above (key absent from the IPC call → outer `None`/unchanged; key present with value `null` → `Some(None)`/clear; key present with a value → `Some(Some(v))`/set).

**Deviation from this plan's original wording, discovered during implementation:** the actual Phase B3 instructions (issued after this plan was written) required the opposite submission style from what this section originally described. Two changes:
1. **Only changed fields are sent, not a "complete payload."** This section's original text said `account_id`/`amount_minor`/`description`/`date` are "always sent as their current (possibly unchanged) value... mirroring the 'complete payload' style already established for account edits." The actual instructions required per-field change detection with each unchanged field omitted (`undefined`) from the call — closer to the *minimal*-diff style than the "complete payload" style. Implemented as a single normalization pass (magnitude/direction → signed amount, trimmed description, etc.) computed once per render and reused for both the Save-button-enablement check and the submitted payload, so the two can never disagree.
2. **Dirty-state tracking now exists and gates Save.** This section originally said "No dirty-state tracking — submitting unchanged values is safe and idempotent." The actual instructions required the opposite: Save Changes is `disabled` until at least one field is both valid and different from the transaction's current (normalized) value, and re-disables if the user reverts back to the original values. Submitting unchanged values was never tested as "safe" under this design since the Save button prevents that submission from happening at all.

**Change-detection normalization (avoids the "different string, same value" trap):** comparisons never use raw form strings directly for the amount field — `form.amount` is parsed via `parseAmountMagnitudeToMinorUnits` and re-signed via `applyTransactionDirection` before comparing against `transaction.amount_minor`, so re-typing a numerically-equivalent string (e.g. baseline `"42.50"` retyped as `"42.5"`) correctly leaves Save disabled. Description and notes are trimmed before comparison. Category and notes compare against `transaction.category_id ?? null` / `transaction.notes ? transaction.notes : null` so "Uncategorized"/"blank" compare correctly against a `null` baseline.

**Category clearing semantics:** selecting "Uncategorized" when the transaction currently has a category sends `categoryId: null` explicitly (verified via `mock.calls[0][2]` in tests, not just an equality assertion, to guarantee it is literally `null` and not `undefined` or `""`). Selecting the same category as before, or leaving Uncategorized as Uncategorized, sends `undefined` (omitted, "unchanged").

**Notes clearing semantics:** identical three-state pattern — blanking a populated Notes field sends `notes: null`; leaving it unchanged sends `undefined`; entering new text sends the trimmed string.

**Archived-account behavior (Scenario A confirmed, not ambiguous):** `TransactionRepository::update` performs **no `is_active` check anywhere** — not when the account is left unchanged (the `if new_account_id != existing.account_id` branch is skipped entirely, so no account lookup/validation happens at all in that case) and not when reassigning to a different account (the only check is workspace membership, identical to create's own permissiveness already documented in Phase A/B1/B2). This directly confirms Scenario A from the task instructions ("the backend allows the current archived account to remain"). Implementation: `EditTransactionDialog` receives `accountsById` (the same unfiltered historical-lookup map `useTransactionReferenceData` already exposed for the read-only table) and, if the transaction's current account is archived, prepends it to the Account `<Select>`'s options labeled `"[name] (Archived)"`, pre-selected, alongside a one-line explanatory note. Saving other fields with the archived account left in place sends no `accountId` at all (unchanged → omitted) and succeeds, since the backend's unchanged-account path never validates `is_active`. Other archived accounts (not the transaction's own) are never listed, matching Product Decision 5.

**Backend balance behavior (inspected, not modified — `TransactionRepository::update`):**
- **Account unchanged, amount unchanged:** no balance `UPDATE` executes at all — a description/date/category/notes-only edit never touches any account's balance.
- **Account unchanged, amount changed:** a single `UPDATE accounts SET balance = balance + (new_amount - existing_amount)` — a direct delta application, not an explicit reverse-then-reapply (mathematically identical, one statement instead of two).
- **Account changed:** two statements in the same transaction — `balance -= existing.amount_minor` on the *old* account, then `balance += new_amount` on the *new* account. This is a true reversal-then-reapplication, and both updates are atomic with each other and with the row update.
- **Currency plays no role** in any of this arithmetic, matching create's behavior.
- **Failure at any point rolls back everything** — the whole operation (both balance updates, if two, plus the row update) happens inside one `unchecked_transaction()`, committed together only at the end; nothing partially commits.
- This is already covered by existing Rust tests (`update_amount_adjusts_balance`, `update_account_moves_balance`, and the `assert_balance_consistent` helper used throughout `repositories/transaction.rs`'s test module). No new Rust test was added, and no Rust code was touched.

**Test results:** 278/278 frontend tests passing (net +46 over Phase B2's 232: 40 new in `EditTransactionDialog.test.tsx`, 6 new integration tests in `Transactions.test.tsx`, 2 Phase B1/B2-era assertions updated in place rather than added/removed since editing now legitimately exists), `npm run lint` clean, `npm run format:check` clean, `npm run build` succeeds. `cargo check` and 104/104 Rust tests pass, unchanged — confirms no backend code was touched.

**Manual verification:** not performed. As with every prior phase, no tooling exists in this environment to drive the native Tauri/WebView window — see the manual verification checklist reported alongside this phase's closeout.

---

### Phase B4 — Delete Transaction

**Objective:** A user can permanently remove a transaction they no longer want, with a clear understanding that it cannot be undone.

**Scope:**
- A "Delete" action per transaction row, opening the existing `ConfirmDialog` (already extended with the `error` prop during Accounts Phase B4 — no further changes to `ConfirmDialog` are anticipated).
- Confirmation copy: *"Delete this transaction? This cannot be undone. The account balance will be adjusted."* — no "Archive Instead" alternative (transactions have no archive concept).
- On confirm: `deleteTransaction(id)`, then close the dialog, refetch the transaction list, and refetch account balances if displayed.
- No bulk deletion (single transaction per confirmation, matching the explicit constraint).
- No transfer safeguards are needed or built, since transfers do not exist in this domain (see "Transfers" above) — there is nothing to protect against.

**Dependencies:** Phase A, B1.

**Architecture constraints:** identical state shape to the Accounts archive-confirmation flow (`deleteTarget`, `deleting`, `deleteError` — three explicit `useState` values, no generic mutation abstraction).

**UX requirements:** Cancel is the default-focused, safe action (`autoFocus`, matching `ConfirmDialog`'s existing behavior); the dialog cannot be dismissed mid-request (`preventClose` while `deleting`).

**Accessibility requirements:** identical to the Accounts archive confirmation — accessible title/description, focus returns to the triggering row action after the dialog closes (native `<dialog>` behavior, no custom code needed).

**Testing requirements:** confirmation opens/cancels without calling the API; delete uses the correct transaction id; duplicate submission is prevented while a request is in flight; failure keeps the dialog open, preserves the selected transaction, and shows a sanitized error; success closes the dialog and refetches; the deleted transaction's account balance reflects the reversal after refetch.

**Manual verification requirements:** delete a transaction and confirm the account balance reverses by exactly the deleted amount; confirm the transaction no longer appears in the list without a page reload; confirm cancelling makes no change.

**Documentation updates:** sprint notes, `CHANGELOG.md`.

**Definition of Done:** a user can delete any transaction with clear, accurate confirmation copy, the balance adjusts correctly, and failures are handled safely without data loss or a stuck UI; all automated checks pass.

**Review checkpoint:** the last of the four core workflows — a good point to do the "does this feel like one coherent feature" pass across B1–B4 together before deciding whether Phase B5 is warranted.

**Commit boundary:** one commit, scoped to Phase B4 only.

---

### Phase B5 — Transaction UX Review and Polish

**Not scheduled by default.** Per the phase template's own instruction, this phase is only created if concrete review work remains after B1–B4 ship — it is not assumed here. Candidates to evaluate at that review point, none pre-committed:

- Category filter, date-range filter, and direction filter on the transaction list (all trivially supported by the existing `listTransactions` contract, deferred from B1 to keep it minimal — see Scope).
- Debounced text search.
- Keyboard shortcuts (`Ctrl/Cmd+N` for new transaction, `Escape` to close dialogs — `Escape` already works today via the shared `Dialog` component's existing Escape handling; only the `Ctrl/Cmd+N` shortcut would be new).
- Surfacing `status` (uncleared/cleared/reconciled) in the table and/or as an editable field.

If review after B4 finds none of these are needed yet, close Sprint 6 without a B5, exactly as Sprint 5 closed without needing an additional Accounts polish phase (see `sprint-5.md`'s Review Notes: "No additional polish phase is required before Sprint 6").

---

## Testing Strategy

| Concern | Test location |
|---|---|
| Amount parsing (`parseAmount`/`formatAmount`) | Already covered by existing `src/lib/format.test.ts` — no new coverage needed unless `AmountInput` reveals a gap |
| Sign/direction conversion (`directionFromAmount`, create/edit sign negation) | TypeScript helper tests (Phase A) + React component tests (Phase B2/B3, asserting the exact signed value passed to the mocked API) |
| Date handling (format, default-to-today, validation) | React component tests (Phase B2/B3) |
| List ordering | React component test asserting rendered row order matches the mocked (already-ordered) API response verbatim — Rust already covers that the backend itself orders correctly (`list_default_ordering`), so the frontend test only needs to confirm it doesn't re-sort |
| Account/category label rendering, "Uncategorized" | React component tests (Phase B1) |
| Loading/empty/error states | React component tests (Phase B1), mirroring the existing Accounts test patterns exactly |
| Create | React component tests (Phase B2): validation, submission contract, duplicate-submission prevention, API failure, success/refetch |
| Edit | React component tests (Phase B3): pre-population, the category/notes null-vs-omit contract (highest priority), account/category change balance-adjustment call shape, cross-transaction state isolation |
| Delete | React component tests (Phase B4): confirmation flow, failure/success, duplicate-submission prevention |
| Balance updates | **Rust repository tests already exist and pass** (`update_amount_adjusts_balance`, `update_account_moves_balance`, `delete_reverses_balance`, and the `assert_balance_consistent` helper used throughout) — Sprint 6 does not need new Rust tests for balance correctness unless a genuine backend gap is found. Frontend tests only need to assert that the correct API calls are made and that a refetch occurs after — not that arithmetic is correct (that's the backend's job, per the architecture constraint). |
| Persistence | Already covered by the existing Rust integration test `data_persists_across_close_and_reopen`; no new Rust test needed. **Manual native-app verification** (see below) remains the only way to confirm this end-to-end through the actual UI, and — consistent with every Sprint 5 phase — could not be performed in an environment without native-window automation tooling. |
| Invalid backend states (e.g., zero amount reaching the API despite client validation) | Existing Rust tests (`create_zero_amount_fails`, `check_constraint_rejects_zero_amount`) already cover this; a frontend test should confirm the sanitized error path if the backend ever does reject a submission (mirrors the Accounts API-failure tests) |
| Transfer behavior | **Explicit exclusion test**, not a feature test: assert no transfer-related UI element exists anywhere in the transaction dialogs or table (mirrors the "never renders a Delete action" pattern from Accounts B1–B3, applied here to "never renders a Transfer action") |
| Existing Accounts regression coverage | No changes are planned to `Accounts.tsx`, its dialogs, or `src/api/accounts.ts` — the existing 111 frontend tests and 104 Rust tests must continue to pass unmodified through every Sprint 6 phase, verified by the same full-suite run required before every commit |

**Manual native-app verification** (required, but with the same known limitation as every Sprint 5 phase — see Lessons Learned in `sprint-5.md`): create/edit/delete transactions through the actual native window; confirm balances update visibly; confirm persistence across an app restart; confirm the archived-account exclusion is visible in the real UI. This has not been possible in any prior phase of this project due to the absence of native Tauri/WebView automation tooling in this environment, and should be planned for as a genuine human QA pass before Sprint 6 is considered done in practice, not merely automated-test-complete.

---

## Risks

| Risk | Mitigation |
|---|---|
| **Incorrect sign convention in the UI** (e.g., an Expense selection producing a positive amount) | Directly tested at the component level (Phase B2/B3) by asserting the exact signed argument passed to the mocked `createTransaction`/`updateTransaction`; the backend's own `CHECK(amount_minor != 0)` and direction-filter tests provide a second, independent layer of confirmation that positive=income/negative=expense is the correct, load-bearing convention. |
| **Floating-point currency bugs** | Not a real risk here — `parseAmount`/`formatAmount` already do integer-cents arithmetic with no floating-point amount storage anywhere in the path; this is inherited, tested infrastructure, not new code. |
| **Stale account balances displayed after a mutation** | Mitigated by the "canonical refetch after mutations" architecture constraint — no client-side balance math exists to drift from the backend. |
| **Transaction/account consistency** (a transaction referencing a deleted or archived account) | Account deletion cascades transactions away entirely (no orphans possible); archived accounts remain valid transaction owners at the backend level, so no "broken reference" state can occur — the only UI concern is Product Decision 5's presentation choice, not data integrity. |
| **Transfer-modeling complexity** | Avoided entirely by explicit deferral (see "Transfers") rather than a fragile client-side approximation. |
| **Date and timezone ambiguity** | The model stores a plain `YYYY-MM-DD` string with no time or timezone component; the UI must never construct a `Date` object and re-derive the string through timezone-sensitive formatting (e.g., `new Date(dateString).toISOString()` can shift the date by a day near midnight in non-UTC zones) — always read/write the string directly, only using `Date` for computing "today" once at form-open time via local `Date` methods (not UTC), matching how a native `<input type="date">` already round-trips this format safely. |
| **Category/direction mismatch** (an expense using an income-typed category) | Not prevented by the backend; Product Decision 4 explicitly does not invent a client-side restriction the backend doesn't share, and documents this as a known, accepted gap rather than a silent risk. |
| **Destructive deletion** | Mitigated by the required confirmation dialog with plain, accurate ("cannot be undone") language — matching the existing Accounts archive-confirmation UX pattern, minus the "reversible" framing, since deletion genuinely is not reversible here. |
| **Performance with large transaction histories** | Addressed under "Performance" above — flagged (missing composite index) but not treated as blocking, backed by existing 100k-row performance tests; monitor rather than optimize prematurely. |
| **UI complexity from too many filters** | Directly addressed by Scope: B1 ships with exactly one filter (account) and basic pagination; every other filter is explicitly deferred to a reviewed B5, not built speculatively. |
| **Premature abstractions** | Directly addressed by the architecture constraints: no generic form engine, no shared `AccountForm`-style unification of create/edit dialogs, no `Table.tsx` primitive, no new component built without a concrete, current-phase requirement (`AmountInput` is the only new primitive, and it's needed immediately by Phase B2). |
| **Inconsistent date validation** (the backend's `validate_date` accepts calendar-invalid dates like `2026-02-30`) | Low severity — the native `<input type="date">` widget itself will not let a user select an invalid calendar date in the first place, so this backend looseness is not user-reachable through the planned UI. Documented here so it is not mistaken for an unknown gap if discovered later (e.g., during a future CSV import feature, which could feed raw strings that bypass the date picker). |

---

## Acceptance Criteria

1. Transactions persist across an application restart (already guaranteed by the existing backend and its integration test; verified again manually if native-app tooling becomes available).
2. Account balances update correctly after every transaction create, edit, and delete, including when an edit changes the account or the amount.
3. Amounts are stored in integer minor units at every step — no floating-point amount ever exists in the create/edit path.
4. Users can create valid income and expense transactions without needing to understand or type a signed amount.
5. Invalid account or category references are rejected (already enforced backend-side; the UI's selectors are scoped to the current workspace so this should never be user-reachable, but the sanitized-error path is tested regardless).
6. Loading, empty, and error states are clear and consistent with the existing Accounts UI's visual language.
7. Mutation failures (create/edit/delete) do not corrupt displayed state — the form preserves entered values, and the list is never left in a partially-updated state (refetch-or-nothing, never a manual patch).
8. Existing Accounts workflows (111 frontend tests, 104 Rust tests) continue to pass unmodified through every Sprint 6 phase.
9. No unsupported transfer behavior is presented anywhere in the UI (explicit negative test, not just an absence of a feature).
10. All automated checks pass at every phase boundary: `npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `cargo check`, `cargo test`.
11. Manual native-app flows are attempted and their outcome (verified, or blocked by tooling) is explicitly reported at every phase — not silently skipped.
12. No Delete-like or archive-like action is presented anywhere for a workflow the backend doesn't support (e.g., no "restore a deleted transaction" affordance).

---

## Assumptions

1. Sprint 4's transaction backend is complete, correct, and will not change during Sprint 6 (no Backend Change Rule gap was found during this inspection — every planned UI decision maps to an existing, tested backend capability).
2. `src/api/transactions.ts` does not need modification — it already matches the Rust commands exactly.
3. The existing UI primitives (`Button`, `Input`, `Select`, `Textarea`, `Dialog`, `ConfirmDialog`, `EmptyState`, `LoadingSpinner`, `ErrorMessage`, `Badge`, `Card`) are sufficient except for `AmountInput`, which must be built fresh in Phase A.
4. `formatAmount`/`parseAmount` require no changes.
5. A single-currency (USD-equivalent) assumption is acceptable, matching every other page in the app today.
6. The account-selector exclusion of archived accounts (Product Decision 5) and the no-category-type-filtering decision (Product Decision 4) are UI-level choices that can be revisited without a backend change if product direction later disagrees.
7. Categories UI does not need to exist first — the transaction dialogs' category selector reads directly from `listCategoriesByWorkspace` and the already-seeded default categories; a user cannot yet *manage* categories through this app, but can already *use* the seeded ones.

---

## What Sprint 6 Does Not Change

- No modifications to `src-tauri/` (Rust backend), migrations, or `src/api/transactions.ts` are anticipated — this plan found no genuine capability gap requiring one.
- No changes to `Accounts.tsx`, its dialogs, or any Accounts test.
- No changes to `docs/milestones.md`'s sprint numbering by this document itself — the 2026-07-19 Product Owner decision that ratified this document as "Sprint 6" was recorded directly in `docs/milestones.md`, `TASKS.md`, and `docs/business/ROADMAP.md`, not here.
- No new npm dependencies.
- No product direction changes beyond the explicit, documented decisions above (each traceable to either a discovered backend fact or an explicitly flagged, reversible UI-only choice).

---

## ADR Recommendations (not created)

Two topics surfaced during this inspection that are genuine architecture decisions, not yet covered by an existing ADR. Per instruction, these are reported as recommendations only — no ADR has been created:

1. **Transfer modeling.** When transfer support is eventually designed, an ADR should decide the representation (a linked pair of ordinary transactions with a shared transfer id, vs. a dedicated `transfers` entity) and its atomicity/consistency guarantees (what happens if one side of a transfer is edited or deleted independently). This plan deliberately does not attempt to answer that question by building a client-side approximation.
2. **Category-type-to-transaction-direction validation policy.** The backend currently allows any category to be assigned to any transaction regardless of the category's `income`/`expense` type and the transaction's amount sign (see "Categories" above). An ADR (or a simpler documented decision) should establish whether this should ever become an enforced rule, and at which layer (backend validation vs. UI-only filtering) — this plan explicitly declines to invent UI-only enforcement in its absence (Product Decision 4).

A third topic — the Sprint 5/6 naming and scope conflict with `docs/milestones.md` — was a roadmap/process decision, not an architecture decision, so it was not proposed as an ADR; it was resolved directly by the Product Owner and is recorded in `sprint-5.md`'s closeout section, `docs/milestones.md`, and `TASKS.md`.

---

## Sprint-to-Milestone Alignment (resolved 2026-07-19)

Per `docs/milestones.md`, this work falls under **Milestone 3: Core Finance Features**, now formally scoped as Sprints 5 (Accounts UI, complete), 6 (Transactions UI, this document), 7 (Categories UI), and 8 (Dashboard). This plan's Phase B1–B4 core (basic pagination and a single account filter, deferring full search/multi-field filtering to a reviewed B5) is accepted as Sprint 6's scope — Milestone 3's exit criteria were narrowed accordingly during the 2026-07-19 reconciliation rather than requiring this plan to expand to meet a broader bar. See `docs/milestones.md`'s Milestone 3 section for the current exit criteria.
