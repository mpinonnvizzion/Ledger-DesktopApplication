# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## Sprint 6 Phase B3 — 2026-07-19

Transaction editing implemented, per the Sprint 6 (Transactions UI) plan in `docs/sprint-notes/sprint-6.md`. No delete, filter, search, pagination-control, transfer, import, or reconciliation workflow exists yet — that begins with Phase B4.

### Added

- **Edit Transaction workflow** (`src/components/transactions/EditTransactionDialog.tsx`)
  - The transactions table gains an "Actions" column with a keyboard-accessible "Edit [description]" button per row (loading/empty/error states show no Edit action)
  - Dialog form is prepopulated directly from the selected transaction: Direction derived from the amount's sign, Amount shown as a positive magnitude, Date/Description/Account/Category/Notes shown exactly as stored
  - **Save Changes is disabled until at least one field is both valid and genuinely different** from the transaction's current (normalized) values, and re-disables if the user reverts back to the original values — comparisons use normalized values (parsed amount+direction, trimmed text), not raw strings, so retyping a numerically-equivalent amount does not spuriously enable Save
  - Only the fields that actually changed are sent to `updateTransaction`; unchanged fields are omitted so the backend's own "omitted = leave unchanged" semantics apply
  - Category and Notes use the verified three-state contract: omitted = unchanged, explicit `null` = cleared, a value = set — clearing either sends `null`, never `undefined` or an empty string
  - If the transaction's current account is archived, it is shown pre-selected and labeled "(Archived)" so its other fields can still be edited without forcing an account change; other archived accounts remain excluded from the selector
  - If the selected transaction disappears from the page after a refetch, or the workspace changes while the dialog is open, it closes itself safely
  - Duplicate submission is prevented; API failures keep the dialog open, preserve every entered value, and show a sanitized message
  - On success: the dialog closes, and `Transactions.tsx` canonically refetches the transaction list (reusing the existing retry mechanism) — no optimistic row mutation
  - 40 new component tests plus 6 new integration tests in `Transactions.test.tsx`

### Changed

- `MAX_DESCRIPTION_LENGTH`/`MAX_NOTES_LENGTH` moved from `CreateTransactionDialog.tsx`-local constants to shared exports in `src/lib/transactionHelpers.ts`, so Create and Edit cannot silently drift apart on these limits. No behavior change.

### Notes

- No backend or schema changes. No new npm dependencies. No delete, transfer, import, or reconciliation code.
- **No shared Create/Edit form component was extracted** — the two dialogs' semantics have diverged enough (three-state clearing, live change detection, archived-current-account handling exist only in Edit) that a shared abstraction would be more complex than the duplication it removes, mirroring the same conclusion already reached for `CreateAccountDialog`/`EditAccountDialog` in Sprint 5.
- **Archived accounts are permitted for editing without restriction**, confirmed by direct inspection of `TransactionRepository::update`: the backend performs no `is_active` check when the account is left unchanged, and none beyond workspace-membership when it changes.
- Account balance updates during edit were inspected, not modified: unchanged account + unchanged amount touches no balance; unchanged account + changed amount applies the delta directly; changed account reverses the old account's balance and applies the new amount to the new account — all atomic, all already covered by existing Rust tests.
- Manual native-app verification was not performed — no tooling exists in this environment to drive the Tauri/WebView window, consistent with every prior phase.

## Sprint 6 Phase B2 — 2026-07-19

Transaction creation implemented, per the Sprint 6 (Transactions UI) plan in `docs/sprint-notes/sprint-6.md`. No edit, delete, filter, search, pagination-control, transfer, import, or reconciliation workflow exists yet — that begins with Phase B3.

### Added

- **Create Transaction workflow** (`src/components/transactions/CreateTransactionDialog.tsx`)
  - "New Transaction" action in the Transactions page header and its empty state (shown only when the page is fully loaded, with no blocking or reference-data error), mirroring `Accounts.tsx`'s header + empty-state pattern
  - Dialog fields: Direction (accessible Expense/Income radio group, Expense selected by default), Amount (`AmountInput`, positive magnitude only), Date (`Input type="date"`, defaults to today's local calendar date, never UTC), Description (required), Account (active accounts only, required), Category (optional, "Uncategorized" plus every workspace category in the backend's own order), Notes (optional)
  - Client-side validation: valid non-zero amount (mirrors the backend's own independent zero-amount rejection), required date, required non-blank description (≤500 characters), required account, notes (≤2000 characters)
  - On submit: the entered magnitude and selected direction are converted via the existing `applyTransactionDirection`/`parseAmountMagnitudeToMinorUnits` helpers into a signed `amount_minor`, then `createTransaction` is called with the exact typed contract (Uncategorized and blank Notes are omitted, not sent as `null` — see Notes below)
  - When no active account exists, the Account selector is replaced with an explanation and the submit button is disabled directly, rather than showing a selector with a fake value
  - Duplicate submission is prevented; API failures keep the dialog open, preserve every entered value, and show a sanitized message
  - On success: the dialog closes, the form resets, and `Transactions.tsx` canonically refetches the transaction list (reusing Phase B1's existing retry mechanism) — no optimistic row insertion
  - 36 new component tests plus 4 new integration tests in `Transactions.test.tsx`

### Notes

- No backend or schema changes. No new npm dependencies. No edit, delete, transfer, import, or reconciliation code.
- **`categoryId`/`notes` are sent as `undefined`, never `null`, for create** — `createTransaction`'s TypeScript contract has no nullable variant for either parameter (unlike `updateTransaction`'s later patch-style nullable fields). This is a verified, deliberate divergence from a literal "submit null for blank optional fields" reading — see `docs/sprint-notes/sprint-6.md`'s Phase B2 notes for the full contract citation.
- **Zero-amount rejection is a UI-layer decision that mirrors an existing backend rule**, not a new one: the backend's `validate_create_input` already independently rejects `amount_minor == 0`.
- Account balance updates are atomic (single SQLite transaction covering the insert and the `balance = balance + amount_minor` update) and were inspected, not modified — Rust remains fully authoritative, and existing Rust tests already cover this path.
- Manual native-app verification was not performed — no tooling exists in this environment to drive the Tauri/WebView window, consistent with every prior phase.

## Sprint 6 Phase B1 — 2026-07-19

Read-only transaction list implemented, per the Sprint 6 (Transactions UI) plan in `docs/sprint-notes/sprint-6.md`. No create, edit, delete, filter, search, or pagination-control workflow exists yet — that begins with Phase B2.

### Added

- **Transaction history table** (`src/pages/Transactions.tsx`) — fetches the first page of transactions (`listTransactions({ workspaceId, limit: 50 })`) and renders them in the backend's own `date DESC, id DESC` order (never re-sorted client-side). Semantic `<table>` with columns Date, Description, Account, Category, Type, Amount. Income/Expense is shown as an explicit "Type" column and as an explicit `+`/`-` sign in the Amount column, not by color alone. Uncategorized transactions and unresolvable account/category references render deterministic fallback text ("Uncategorized" / "Unknown account") instead of blank cells or a crash. No row actions, no fake data, no card-based rows — horizontal scrolling handles narrow widths instead.
  - A plain informational sentence ("Showing the N most recent of M transactions") appears when the backend's `total_count` exceeds the number of rows shown — not an interactive pagination control, just an honest note that the list is truncated.
- **Historical reference-data lookup** (`src/hooks/useTransactionReferenceData.ts`) — extended with `accountsById`/`categoriesById`, two unfiltered lookup maps built from the same already-fetched account/category lists (no new API call). This is additive: the existing `accounts` field (active-only, for future create-transaction selectors) and `categories` are unchanged. `accountsById` specifically includes archived accounts, so a transaction on an archived account still displays its real name instead of "Unknown account". 2 new tests.
- 21 net new tests in `src/pages/Transactions.test.tsx` (27 total, up from the 6 Phase A shell tests it replaced).

### Notes

- No backend or schema changes. No new npm dependencies. No account filter, category filter, date-range filter, search, sorting, or pagination controls — deferred to a later, reviewed phase.
- **Partial reference-data failure is non-blocking:** if transactions load successfully but account/category reference data fails to load, the table still renders (using the deterministic fallback labels above) with a non-destructive warning banner, rather than replacing the whole page with an error. A transaction-fetch failure, by contrast, is blocking (full-page error with retry), since there is no meaningful table to show without transaction data. A single retry action reloads both.
- **Currency formatting is a documented, pre-existing simplification, not a new gap introduced here:** account currencies can technically differ within a workspace (confirmed in `src-tauri/src/repositories/account.rs`), but no page in this app — including this one — renders a currency symbol/code; every amount is prefixed with a hardcoded `"$"`, matching `Accounts.tsx`'s existing convention and Sprint 6's own Product Decision 9 (no multi-currency UI; see ADR 0008). Flagged for visibility, not treated as a Phase B1 defect.
- Manual native-app verification was not performed — no tooling exists in this environment to drive the Tauri/WebView window, consistent with every prior phase.

## Sprint 6 Phase A — 2026-07-19

Transaction UI foundation implemented, per the Sprint 6 (Transactions UI) plan in `docs/sprint-notes/sprint-6.md`. No transaction list, create/edit/delete workflow, filtering, search, or pagination exists yet — that begins with Phase B1.

### Added

- **Transaction amount/direction/presentation helpers** (`src/lib/transactionHelpers.ts`)
  - `parseAmountMagnitudeToMinorUnits` — strict parser for a user-typed positive currency magnitude into integer minor units; rejects empty/whitespace, a leading `-`, more than two decimal places, thousands separators, and malformed input
  - `applyTransactionDirection` — applies an Income/Expense direction to a positive magnitude to produce the signed `amount_minor` the backend expects (expense negates, income passes through, zero never becomes `-0`)
  - `formatMinorUnits` — re-export of the existing `formatAmount`; no new formatting logic
  - `formatSignedAmount`, `directionFromAmount`, `directionLabel`, `formatTransactionDate` (never constructs a `Date` object, so it cannot shift a date through a timezone), `categoryDisplayLabel`, `accountDisplayLabel`, `amountDisplayClass`
  - 35 new tests
- **`AmountInput` component** (`src/components/ui/AmountInput.tsx`) — a controlled, accessible currency-magnitude text field. Stores and returns the raw typed string; performs no parsing, normalization, or backend calls itself. 9 new tests.
- **`useTransactionReferenceData` hook** (`src/hooks/useTransactionReferenceData.ts`) — loads active accounts (client-sorted alphabetically, archived accounts excluded) and all categories (backend-ordered, unfiltered — categories have no archived state) for the current workspace, for later transaction forms to consume. Sanitized errors, retry, and workspace-change reload. 8 new tests.
- **Transactions page shell** (`src/pages/Transactions.tsx`) — replaces the static placeholder with a title, honest "not yet available" copy, and loading/error/empty states wired to `useTransactionReferenceData`. No fake data, no table, no CRUD controls. 6 new tests.

### Notes

- No backend or schema changes. No new npm dependencies. No transfer, import, reconciliation, or bulk-action code.
- `parseAmountMagnitudeToMinorUnits` is a new implementation, not a wrapper around the existing lenient `parseAmount` — see `docs/sprint-notes/sprint-6.md`'s Phase A Implementation Notes for why a stricter, separate parser was needed while formatting was still reused unchanged.
- Manual native-app verification was not performed — no tooling exists in this environment to drive the Tauri/WebView window, consistent with every prior Sprint 5 phase.

## Roadmap Reconciliation — 2026-07-19

The Product Owner resolved the Sprint 5/6 roadmap conflict flagged at Sprint 5 closeout (see below). This is a documentation-only change; no application code was modified.

### Decision

- Sprint 5 is confirmed as **Accounts UI** and is complete.
- Sprint 6 is **Transactions UI** (ratifies `docs/sprint-notes/sprint-6.md` as the official Sprint 6 plan).
- Sprint 7 is **Categories UI** (new).
- Sprint 8 is **Dashboard** (new).
- **Budgets, Goals, and Reports** move out of Milestone 3 entirely and are replanned later as separate product domains rather than one immediate sprint.
- Security & Onboarding, Business Finance, Commercial Readiness, Installer/Distribution, Beta Hardening, Public Launch Preparation, and Optional Connected Services (previously numbered Sprints 7-12) move to an unnumbered "Future Milestones (Unscheduled)" list, since their prior sprint numbers are now used by Categories UI and Dashboard. Detailed schedules for these domains were not invented — only their previously documented scope was preserved as placeholders.

### Documentation

- `docs/milestones.md` (v2.2) — Milestone 3 redefined as Sprints 5-8; Milestones 4 and 5 replaced with a "Future Milestones (Unscheduled)" section.
- `TASKS.md` — Sprint 6/7/8 sections defined; later sprints moved to a "Future Milestones (Unscheduled)" section; conflict warnings removed.
- `docs/business/ROADMAP.md` — Sprint 5-8 sections updated to match; Sprints 6 (old)-12 replaced with "Future: Unscheduled Product Domains".
- `docs/sprint-notes/sprint-5.md` — "Scope Change and Documentation Conflict" section marked resolved.
- `docs/sprint-notes/sprint-6.md` — naming-conflict warning marked resolved; document ratified as the official Sprint 6 plan.
- `README.md` — status note updated to reference the ratified Sprint 6/7/8 sequence.

## Sprint 5 Complete — 2026-07-18

Sprint 5 is formally closed. Delivered scope: workspace foundation and a complete, reversible Accounts UI lifecycle (create, edit, archive, restore) backed by local SQLite persistence — see `docs/sprint-notes/sprint-5.md`'s "Sprint 5 Closeout" section for the full record.

### Summary

- Users can select or create a workspace, view all accounts with live balances and summary counts, create accounts, edit an account's name and institution, and archive or restore accounts — all through the desktop UI with no network dependency.
- 111 frontend tests and 104 Rust tests pass; every mutation's success, failure, and duplicate-submission paths are covered.
- Account deletion was **not** implemented and remains deferred.

### Documentation

- `docs/sprint-notes/sprint-5.md` — added a "Sprint 5 Closeout" section (objective as delivered, completed scope, explicit notes, out-of-scope confirmation, review notes, lessons learned) and flagged a scope/numbering conflict with `docs/milestones.md` (see below).
- `TASKS.md` — Sprint 5 marked complete for its actual (Accounts-only) scope; corrected a factual inaccuracy in the Phase A notes (`Table`, `AmountInput`, and `DateInput` primitives were listed as built but do not exist in the codebase); flagged the same numbering conflict near the existing "Sprint 6: Budgets, Goals, and Reports" section.
- `README.md` — product status section updated from a stale "Sprint 4" reference to reflect Sprint 5 completion.

### Known documentation conflict (unresolved, flagged for a product-owner decision)

`docs/milestones.md` (the authoritative roadmap, v2.1) still defines Sprint 5 as including Categories UI, Transactions UI, and a Dashboard, and defines Sprint 6 as "Budgets, Goals, and Reports." A new `docs/sprint-notes/sprint-6.md`, titled "Sprint 6: Transactions UI," was created per explicit direction for this closeout, which conflicts with that existing numbering. This was deliberately not resolved by editing `docs/milestones.md` or renumbering later sprints, since that would mean deciding where Budgets/Goals/Reports and Security/Onboarding/Business Finance now fall — a product-direction decision, not an implementation one.

## Sprint 5 Phase B4 — 2026-07-17

### Added
- **Archive and Restore account lifecycle** (`src/pages/Accounts.tsx`)
  - Active account rows show Edit and Archive actions; archived account rows show Edit and Restore actions. No account ever shows both, and no Delete action exists anywhere yet.
  - Archive requires confirmation via the shared `ConfirmDialog` ("Archive account?" / "Archive Account"), naming the account in the confirmation copy. Cancel is the default-focused, safe action and makes no changes.
  - Restore executes directly from its row action — no confirmation dialog, since it is reversible and non-destructive.
  - Both actions use the existing `updateAccount(id, undefined, undefined, isActive)` contract — no new backend commands. Name and institution are left untouched (`undefined` preserves them, per the merge semantics discovered in Phase B3).
  - On success: the confirmation (for archive) closes, the account list refetches, the row's status and the Active/Archived summary counts update immediately, and the account moves into the correct ordering group (active-first, alphabetical) — no full-page reload or loading-spinner flash.
  - Duplicate submission is prevented for both actions; Restore tracks in-flight state per account id, so restoring one archived account never disables another's Restore button.
  - Failures are shown as sanitized errors — inside the confirmation dialog for archive (leaving the account active and the dialog open), and as a page-level message for restore (leaving the account archived and its Restore action available again).
  - 24 new frontend tests covering action visibility, the archive confirmation flow, the restore flow, ordering transitions, and summary-count updates (111 total, up from 92 after Phase B3).

### Changed
- **`ConfirmDialog` component** (`src/components/ui/ConfirmDialog.tsx`) — added an optional `error?: string` prop that renders a sanitized `ErrorMessage` inside the dialog body. This was the component's first real consumer; existing usages and tests are unaffected since the prop is optional.

### Notes
- No dedicated archive/restore Tauri commands exist, and none were added — both actions reuse `update_account` / `UpdateAccountInput.is_active`, exactly as the plan's Domain Behavior Reference already documented. `list_accounts_by_workspace` returns archived accounts unfiltered, which the existing client-side sort/badge logic already relies on.
- **Permanent deletion is explicitly not implemented in this phase** — no Delete action, confirmation, or cascade-warning logic exists anywhere in the UI. It remains deferred.

## Sprint 5 Phase B3 — 2026-07-17

### Added
- **Edit Account workflow** (`src/components/accounts/EditAccountDialog.tsx`)
  - Accounts table gains an "Actions" column with a keyboard-accessible "Edit [account name]" button per row
  - Dialog form: account name (required, editable), account type (read-only display — not supported by the update API), institution name (optional, editable)
  - Form is pre-populated from the selected account; reopening for a different account never leaks stale values
  - Client-side validation mirrors backend rules: name required and not whitespace-only
  - On success: dialog closes, account list refetches, updated values appear immediately with updated summary totals — no full-page reload
  - API failures are shown as a sanitized, form-level error while preserving entered values
  - Duplicate submission prevented while a request is in flight; Cancel and Escape disabled during submission
  - Submit button label "Save Changes"; Cancel discards changes without calling the update API
  - 21 new frontend tests covering the edit dialog and the page-level edit workflow (92 total, up from 71 after Phase B2)

### Fixed
- **`Dialog` component** (`src/components/ui/Dialog.tsx`) — the dialog title used a hardcoded `id="dialog-title"`, which produced duplicate IDs and an ambiguous `aria-labelledby` once two `Dialog` instances (Create and Edit) are mounted on the same page at once. Now uses `useId()` to generate a unique title id per instance.

### Notes
- `UpdateAccountInput` (Rust and TypeScript) has no `account_type` field — account type cannot be changed after creation via the existing update API. The edit dialog displays it (read-only) for context but does not submit it. No backend change was made; this preserves the documented Phase B item 6 scope (name and institution only).
- The update repository's merge semantics differ from create: an omitted (`undefined`) field means "preserve the existing value," not "clear it." The edit dialog therefore always sends the trimmed institution value as an explicit string (including `""` when cleared) rather than omitting it, so clearing the field actually clears it.
- Archive/unarchive and delete-with-cascade-warning remain out of scope for this phase; deferred to Phase B4+.

## Sprint 5 Phase B2 — 2026-07-17

### Added
- **Create Account workflow** (`src/components/accounts/CreateAccountDialog.tsx`)
  - "New Account" action in the Accounts page header and in the empty state
  - Dialog form: account name (required), account type (required select), institution name (optional)
  - Client-side validation mirrors backend rules: name required and not whitespace-only, account type required
  - On success: dialog closes, form resets, account list refetches, new account appears immediately with updated summary totals — no full-page reload or flash of the loading spinner over an already-rendered table
  - API failures are shown as a sanitized, form-level error while preserving entered values
  - Duplicate submission prevented while a request is in flight; Cancel and Escape disabled during submission
  - Reopening the dialog always starts from a clean state (no stale values or errors)
- **`src/lib/accountTypes.ts`** — shared `ACCOUNT_TYPE_LABELS`, `formatAccountType`, and `ACCOUNT_TYPE_OPTIONS`, used by both the accounts table and the create dialog
- Accounts page empty-state copy updated from placeholder "coming in a future update" language to production copy, with a "New Account" call to action
- 16 new frontend tests covering the create-account dialog and the page-level create workflow (71 total, up from 55 after Phase B1)

### Changed
- Accounts page subtitle updated from "A read-only view of your accounts and balances." to "Manage your financial accounts and balances."

## Sprint 5 Phase A — 2026-07-16

### Added
- **WorkspaceContext** (`src/contexts/workspaceContextDef.ts`, `src/contexts/WorkspaceContext.tsx`)
  - `WorkspaceProvider` wraps the application; exposes `workspaces`, `currentWorkspace`, `currentWorkspaceId`, `loading`, `error`, `refreshWorkspaces`, `selectWorkspace`, `createInitialWorkspace`
  - On launch: fetches workspace list; selects persisted selection (localStorage) or first workspace
  - If no workspace exists: renders `FirstWorkspaceSetup` focused creation screen
  - After first workspace created: seeds default categories via `seedDefaultCategories`
  - Context definition separated from provider component to satisfy `react-refresh` lint rule
  - Workspace selection persisted to `localStorage` (`ledger_current_workspace_id`)
- **`useWorkspace` hook** (`src/hooks/useWorkspace.ts`) — typed convenience hook for context access
- **`FirstWorkspaceSetup` component** (`src/components/workspace/FirstWorkspaceSetup.tsx`)
  - Focused creation screen with name input (default "Personal Finance") and create button
  - Shows error on API failure; loading state during submission
- **UI primitives** (`src/components/ui/`)
  - `Button` — primary/secondary/danger variants; disabled and loading states; ARIA attributes
  - `Input` — label, error, disabled; ARIA `aria-invalid` and `aria-describedby`
  - `Select` — label, options array, error, placeholder option
  - `Textarea` — label, error, disabled, resizable
  - `FormField` — label + hint + error wrapper for any child input
  - `Dialog` — native `<dialog>` element; `showModal()`/`close()`; Escape via `cancel` event + document keydown fallback; close button
  - `ConfirmDialog` — extends Dialog; destructive variant; loading state disables both buttons
  - `EmptyState` — title, description, optional action button, optional icon slot
  - `LoadingSpinner` + `PageLoadingState` — sm/md/lg sizes; screen-reader label; centered full-page variant
  - `ErrorMessage` + `PageErrorState` — ARIA `role="alert"`; optional retry action
  - `Card` + `CardHeader` — border/shadow wrapper for dashboard cards
  - `Badge` — default/success/warning/error/info/system color variants
  - `Table` — generic typed component; sortable columns with ARIA `aria-sort`; loading and empty state slots
  - `AmountInput` — dollar text input; formats on blur; converts to/from cents via `formatAmount`/`parseAmount`
  - `DateInput` — native `<input type="date">` wrapper with label and error
- **Application shell refinements**
  - `Categories` page added (placeholder for Phase C)
  - `/categories` route added to `App.tsx`
  - Sidebar: Categories nav item added; workspace name indicator shown at bottom; improved icon set; accessible `aria-label` on `<nav>`
  - `AppShell`: Categories added to page-title map
  - `App.tsx`: `WorkspaceProvider` wraps router; `AppRouter` handles loading/error/no-workspace render paths
- **`dialog` CSS** (`src/index.css`): `::backdrop` semi-transparent overlay; reset default browser border/padding
- **33 new frontend tests** (42 total)
  - `WorkspaceContext`: 8 tests — existing workspace selection, localStorage persistence, selectWorkspace, empty workspace list, createInitialWorkspace, seeding order, API error state, recovery after refresh
  - `Button`: 7 tests — variants, click, disabled, loading, type
  - `Dialog`: 6 tests — render, close button, Escape key, showModal/close lifecycle
  - `ConfirmDialog`: 6 tests — render, confirm, cancel, custom labels, loading, Escape
  - `EmptyState`: 6 tests — title, description, action button, no button without action

### Changed
- `App.tsx` restructured: `WorkspaceProvider` is outermost wrapper; `AppRouter` is an inner component that reads workspace context
- `Sidebar.tsx` updated: Categories nav item added; workspace indicator footer; accessible nav landmark
- `AppShell.tsx` updated: `/categories` title registered

## Sprint 4 — 2026-07-16

### Added
- **ADR 0009:** Cached account balance with transactional updates
- **Transaction migration** (`0005_transactions.sql`)
  - Transaction table with 12 columns, 4 indexes, CHECK constraints
  - No `transaction_type`, `import_session_id`, or transfer columns
  - `ON DELETE CASCADE` from accounts, `ON DELETE SET NULL` from categories
- **Transaction domain model** (`src-tauri/src/models/transaction.rs`)
  - `Transaction` entity, `TransactionStatus`, `TransactionSource`, `Direction` enums
  - `CreateTransactionInput`, `UpdateTransactionInput`, `TransactionQuery`, `TransactionListResult` structs
- **Transaction repository** (`src-tauri/src/repositories/transaction.rs`)
  - Full CRUD with atomic balance maintenance (ADR 0009)
  - Search, filter (account, category, date range, direction, amount range, text), sort (date DESC, id DESC)
  - Bounded pagination (default 50, max 500) with `total_count`
  - `create_batch` all-or-nothing import foundation
  - `verify_balance` and `rebuild_balance` utilities
  - Full validation: workspace/account/category existence, cross-workspace checks, date format, string lengths, zero-amount rejection
- **Transaction Tauri commands** (9 commands registered)
  - `create_transaction`, `get_transaction`, `update_transaction`, `delete_transaction`
  - `list_transactions`, `create_transaction_batch`
  - `get_account_balance`, `verify_account_balance`, `rebuild_account_balance`
- **TypeScript transaction API** (`src/api/transactions.ts`, `src/types/domain.ts`)
  - Typed invoke wrappers for all 9 commands plus existing `getTransactionSummary`
  - Full domain type definitions: Transaction, TransactionListResult, Direction, etc.
- **46 new Rust tests** covering CRUD, validation, balance maintenance, batch operations, cascade/FK behavior, migration schema, and performance
- **Performance validation:**
  - 10k transactions: 3ms list query (target < 50ms)
  - 50k transactions: 19ms filtered query (target < 100ms)
  - 100k transactions: 29ms filtered query (target < 200ms)
  - All queries use `idx_transactions_workspace_id` index
- **Milestone 2: Local Data Platform — Complete**

### Changed
- Sprint 4 implementation plan (`docs/sprint-notes/sprint-4.md`)
  - Transaction engine design: signed-integer amounts (no persisted type column), schema, repository, commands, TypeScript API
  - Balance strategy: cached balance with transactional updates (ADR 0009 required before implementation)
  - Transfer scope: fully deferred (no transfer type, no partial reservation — ADR required before any transfer work)
  - Import foundation: atomic batch-create with shared validation pathway (no import_session_id column)
  - Performance targets: 10k < 50ms, 50k < 100ms, 100k < 200ms (non-gating, documented)
  - 47 acceptance criteria for Milestone 2 completion
- Updated TASKS.md with Sprint 4 phased task breakdown (6 phases, ~30 tasks)
- Sprint 5 implementation plan (`docs/sprint-notes/sprint-5.md`)
  - Personal Finance UI: connect existing Tauri commands to desktop interface
  - Scope: workspace init, accounts CRUD, categories CRUD, transactions CRUD with search/filter/sort/pagination, simple dashboard
  - No new Rust code, commands, or migrations — UI integration only
  - 46 acceptance criteria
  - 6 implementation phases (Foundation → Accounts → Categories → Transactions → Dashboard → Polish)
- Updated TASKS.md with Sprint 5 phased task breakdown (6 phases)

### Changed
- Revised Sprint 4 plan: removed transfer type from schema, removed import_session_id, adopted signed-integer semantics without redundant type column, strengthened performance test documentation requirements
- **Milestone 3 sprint redistribution:**
  - Sprint 5 repurposed from "Budgets, Goals, and Reports" to "Personal Finance UI"
  - Sprint 6 repurposed from "Local Security and Onboarding" to "Budgets, Goals, and Reports" (absorbs original Sprint 5 scope + CSV import/export)
  - Sprint 7 combined "Local Security and Onboarding" + "Lightweight Business Finance" into "Security, Onboarding, and Business Finance"
  - Rationale: the data platform needs a working UI before reports/budgets can be built on it
- Refined Sprint 5 plan: added Backend Change Rule, documented 500-row dashboard limitation as known API gap, verified account archive support (is_active field exists), specified account deletion cascade warning requirements, specified category deletion behavior (system protection + SET NULL for user categories), removed obsolete Sprint-4-incomplete risk
- Updated docs/milestones.md: Milestone 2 → Complete, Milestone 3 → In Progress, sprint names aligned
- Updated docs/business/ROADMAP.md: Sprint 5/6/7 definitions aligned with milestone changes

## Sprint 3 — 2026-07-08

### Added
- **Domain model types** (`src-tauri/src/models/`)
  - `Workspace` entity with `WorkspaceType` enum (personal, business)
  - `Account` entity with `AccountType` enum (checking, savings, credit_card, cash, investment, loan, other)
  - `Category` entity with `CategoryType` enum (income, expense)
  - Input structs for create and update operations per entity
- **Database migrations** (`src-tauri/migrations/`)
  - `0002_workspaces.sql`: workspaces table with CHECK constraint on workspace_type
  - `0003_accounts.sql`: accounts table with FK to workspaces, balance as INTEGER (cents per ADR 0008), index on workspace_id
  - `0004_categories.sql`: categories table with FK to workspaces, self-referential FK for parent_id, UNIQUE constraint on (workspace_id, name, category_type), indexes on workspace_id and parent_id
- **Repository layer** (`src-tauri/src/repositories/`)
  - `WorkspaceRepository`: CRUD with name validation (non-empty, ≤100 chars), cascade delete to accounts and categories
  - `AccountRepository`: CRUD with workspace existence validation, list by workspace, balance defaults to 0
  - `CategoryRepository`: CRUD with workspace and parent validation, duplicate detection, seed defaults (4 income + 13 expense system categories), system category deletion protection
- **Extended error handling** (`src-tauri/src/error.rs`)
  - Added `NotFound`, `Validation(String)`, `Conflict(String)` variants to `DomainError`
  - `rusqlite::Error::QueryReturnedNoRows` maps to `DomainError::NotFound`
  - UNIQUE constraint violations map to `DomainError::Conflict`
  - `CommandError` conversion for new error variants with stable error codes
- **Tauri commands** (`src-tauri/src/commands/`)
  - 5 workspace commands: create, get, list, update, delete
  - 5 account commands: create, get, list_by_workspace, update, delete
  - 6 category commands: create, get, list_by_workspace, update, delete, seed_default_categories
- **TypeScript API wrappers** (`src/api/`)
  - `workspaces.ts`, `accounts.ts`, `categories.ts` with typed invoke functions
- **TypeScript domain types** (`src/types/domain.ts`)
  - Interfaces mirroring Rust entity and input structs
  - String union types for WorkspaceType, AccountType, CategoryType
- **Frontend utilities** (`src/lib/`)
  - `errors.ts`: CommandError interface, error code constants, parse helper
  - `format.ts`: `formatAmount` (cents → display) and `parseAmount` (display → cents)
- **35 new Rust tests** (46 total unit + 3 integration)
  - 10 workspace repository tests (CRUD, validation, cascade)
  - 11 account repository tests (CRUD, validation, FK checks)
  - 14 category repository tests (CRUD, validation, conflict, seed, parent hierarchy)
- **8 frontend tests** (9 total)
  - formatAmount and parseAmount for zero, typical, negative, large, and single-digit-cent amounts
- Sprint 3 implementation plan (`docs/sprint-notes/sprint-3.md`)

### Changed
- Updated `DomainError` from 3 variants (Database, Io, Migration) to 6 variants (+ NotFound, Validation, Conflict)
- Updated `From<rusqlite::Error>` to distinguish NotFound and Conflict from generic Database errors
- Updated migration idempotency test to check count equality rather than hardcoded value
- Updated integration tests for 4 migrations (was 1)

## Sprint 2 — 2026-07-07

### Added
- **SQLite database foundation** (`src-tauri/src/db/`)
  - `rusqlite` with `bundled` feature for consistent cross-platform SQLite
  - Database auto-creation in Tauri app data directory (`~/Library/Application Support/io.nvizzion.ledger/ledger.db`)
  - Connection lifecycle: open, configure pragmas, share via `Mutex<Connection>`
  - WAL mode, foreign key enforcement, 5000ms busy timeout
  - Forward-only embedded migration system with `_migrations` tracking table
  - Schema version-ahead detection (prevents older app from corrupting newer database)
  - WAL checkpoint utility for backup foundation
  - `0001_initial_schema.sql`: creates `app_settings` key-value table
- **Error handling foundation** (`src-tauri/src/error.rs`)
  - `DomainError` enum (Database, Io, Migration variants)
  - `CommandError` struct with code/message (strips internal details)
  - Error conversions from `rusqlite::Error` and `std::io::Error`
- **Application state** (`src-tauri/src/state.rs`)
  - `AppState` with `Mutex<Connection>` registered as Tauri managed state
- **System commands** (`src-tauri/src/commands/system.rs`)
  - `db_info` command returns database path, schema version, WAL/FK status
  - `greet` command moved from `commands/mod.rs` to `commands/system.rs`
- **14 Rust tests** (11 unit + 3 integration)
  - Connection: directory creation, WAL mode, foreign keys, busy timeout, WAL checkpoint
  - Migrations: table creation, idempotency, invalid SQL, version-ahead detection, transaction rollback
  - Integration: data persistence across close/reopen, migration tracking, AppState wrapping

### Added (pre-Sprint 2)
- **Architecture Phase 1: Local Data Platform** (`docs/architecture/`)
  - Database architecture: SQLite role, connection lifecycle, WAL mode, migrations, data types, testing
  - Repository architecture: repository pattern, domain types, validation, transaction boundaries
  - Tauri command architecture: IPC conventions, naming, request/response shape, TypeScript wrappers
  - State management: React state philosophy, data loading patterns, Context usage guidelines
  - Folder structure: backend and frontend organization, naming conventions, testing layout
  - Error handling: error categories, propagation, user-facing messages, logging, privacy
  - Backup and restore: backup philosophy, WAL checkpoint safety, restore workflow, migration compatibility
- ADR 0008: Monetary amounts as integer minor units (`docs/adr/0008-monetary-amounts-as-integer-minor-units.md`)
- Sprint 2 implementation plan (`docs/sprint-notes/sprint-2.md`)
- Updated ARCHITECTURE.md with Architecture Phase 1 section and document links
- Updated PROJECT.md documentation map with architecture documents

### Changed
- **Finalized milestone and sprint structure** (`docs/milestones.md` v2.1, `TASKS.md`, `docs/business/ROADMAP.md`)
  - Milestone 2: Sprints 2, 3, 4 (Local Data Platform)
  - Milestone 3: Sprints 5, 6, 7 (Core Finance Features)
  - Milestone 4: Sprints 8, 9, 11, 12 (Commercial Readiness)
  - Milestone 5: Sprint 10 (Optional Connected Services)
  - Sprint 2 scoped as "Database Foundation" (SQLite, migrations, DB service)
  - Sprint 3 scoped as "Core Domain Entities" (repository layer, accounts, categories)
  - Sprint 4 scoped as "Transaction Engine" (CRUD, search, filtering, import foundation)
  - Sprint 8 placed in Milestone 4 alongside packaging, distribution, and launch
  - ROADMAP.md Sprint 2/3/4 definitions updated to match milestone structure
  - Removed temporary re-scoping notes from milestones.md
- Updated TASKS.md: Sprint 1 marked as completed, sprints organized under milestone headers

### Fixed
- **Build script recursion**: `npm run build` no longer triggers `tauri build` (which re-invoked `npm run build` via `beforeBuildCommand`). `build` now runs frontend-only (`tsc && vite build`); full desktop build uses `npm run tauri:build`. Also fixed `beforeDevCommand` in `tauri.conf.json` to call `npx vite` directly instead of `npm run dev`.

## Sprint 1 — 2026-07-07

### Added
- **Tauri 2 project foundation** initialized with React 19, TypeScript 5.8, Vite 7
  - Bundle identifier: `io.nvizzion.ledger`, window 1280×800, min 900×600
- **Tailwind CSS v4** with custom design tokens (primary palette, semantic colors, system font stack)
- **App shell layout** with fixed sidebar navigation and header
- **Four placeholder pages**: Dashboard, Accounts, Transactions, Settings
- **Hash-based routing** via React Router v7
- **Rust command boundary**: `greet` command in `src-tauri/src/commands/`, typed invoke wrapper in `src/api/client.ts`, wired into Settings page
- **ESLint 9** with TypeScript, React Hooks, and React Refresh plugins
- **Prettier 3** with eslint-config-prettier integration
- **Vitest 3** with jsdom environment and Testing Library
- **Frontend test**: Dashboard component render test
- **Rust test**: greet command logic test
- **TypeScript path aliases**: `@/` maps to `src/`
- **npm scripts**: dev, build, lint, lint:fix, format, format:check, test, test:watch
- **Sprint 1 Implementation Plan** (`docs/sprint-notes/sprint-1.md`)

### Changed
- Updated TASKS.md: Sprint 1 tasks marked complete
- Updated README.md: added Getting Started section, updated project status
- Updated ARCHITECTURE.md: status updated to Sprint 1

---

## Sprint 0 — 2026-07-07

### Added
- **Sprint 0: Documentation and Architecture Foundation**
  - README.md with product overview, architecture summary, and repository structure
  - PROJECT.md with product definition, business model summary, and documentation map
  - ARCHITECTURE.md with target technology stack, system architecture, and design principles
  - CLAUDE.md with Claude Code operating rules for the Ledger Desktop project
  - TASKS.md with Phase -1 completion, Sprint 0 checklist, Sprint 1 scope, and future sprint outline
  - CHANGELOG.md (this file)
  - ADR 0001: Documentation-first development process
  - ADR 0002: Desktop-first architecture using Tauri 2
  - ADR 0003: Local-first data ownership with SQLite
  - ADR 0004: Offline-first core workflows
  - ADR 0005: Plaid requires a cloud relay service
  - ADR 0006: One-time purchase with optional subscriptions
  - ADR 0007: Existing Ledger app as reference only
  - Specification: App Scope
  - Specification: Data Model Overview
  - Specification: Security Model
  - Specification: Onboarding Flow
  - Specification: Commercial Model
  - Specification: Plaid Bank Sync
  - Specification: Release and Distribution
  - Sprint 0 notes
  - Normalized business document filenames (VISION.md, TARGET_CUSTOMER.md, PRODUCT_GUARDRAILS.md, PRICING_AND_PACKAGING.md)
  - Ledger v3 Desktop Architecture converted to readable Markdown (docs/reference/Ledger_v3_Desktop_Architecture.md)

### Fixed
- Converted VISION.md and TARGET_CUSTOMER.md from UTF-16LE to UTF-8 with proper Markdown formatting
- Removed misspelled duplicate source files (VISION.txt, Targer_Customer.txt, PRODUCT_GAURDRAILS.md, PRICING_AND_PACKAKING.md)

### Phase -1 (Pre-Sprint 0)
- Vision document
- Target Customer document
- Business Model document
- Product Strategy document
- Competitor Analysis document
- Roadmap document
- Product Guardrails document
- Pricing and Packaging document
- Licensing and Activation document
- Release Strategy document
- Product Requirements Document
- Ledger v3 Desktop Architecture reference document
