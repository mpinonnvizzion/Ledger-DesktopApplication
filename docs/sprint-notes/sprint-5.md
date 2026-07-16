# Sprint 5: Personal Finance UI — Implementation Plan

**Status:** Planned
**Date:** 2026-07-16

---

## Objective

Transform the completed local data platform into the first usable personal finance application. Sprint 5 connects the existing repositories and Tauri commands to the desktop UI. No new finance engine functionality is introduced unless a genuine capability gap is discovered during implementation.

After Sprint 5, a user can create a workspace, add accounts and categories, record transactions, view balances, browse and search transactions, edit and delete records, close the application, reopen it, and see all data preserved.

---

## Sprint Context

Sprint 5 is the first sprint of Milestone 3: Core Finance Features.

**Depends on (all complete and committed):**
- Sprint 1: App shell with sidebar, routing, placeholder pages
- Sprint 2: Database foundation (SQLite, migrations, AppState)
- Sprint 3: Workspace, account, category repositories + Tauri commands + TypeScript API wrappers
- Sprint 4: Transaction repository + search/filter + batch create + TypeScript API wrappers

**What exists when Sprint 5 begins:**
- `AppShell` with Sidebar (Dashboard, Accounts, Transactions, Settings), Header, and Outlet
- React Router with hash routing and 4 placeholder page components
- Full CRUD API wrappers: `src/api/workspaces.ts`, `accounts.ts`, `categories.ts`, `transactions.ts`
- TypeScript domain types: `src/types/domain.ts`
- Error handling: `src/lib/errors.ts` (parseCommandError, ErrorCodes)
- Amount formatting: `src/lib/format.ts` (formatAmount, parseAmount)
- Tailwind CSS v4 with design tokens (primary palette, semantic colors)
- No state management library — uses component-level `useState`/`useEffect` per architecture docs
- No UI component library — `src/components/ui/` is empty

**What Sprint 5 builds:**
- Production UI for all existing data operations
- No new Rust code, commands, or migrations unless a genuine gap is discovered (see Backend Change Rule)

---

## Backend Change Rule

Sprint 5 should reuse the existing Rust commands, repositories, and database schema. Do not add backend code merely for convenience.

If implementation discovers a genuine command, validation, or query capability gap required by the documented Sprint 5 workflows:

1. Stop that workflow.
2. Report the exact gap.
3. Identify the minimum backend change required.
4. Do not invent a frontend workaround that bypasses domain validation.
5. Update this plan before implementing the backend change.

### Known API Gap: Dashboard Monthly Totals

The `list_transactions` command enforces a hard maximum of 500 rows per query (documented in Sprint 4 plan). The dashboard needs to compute monthly income and expense totals by summing all transactions in the current month.

**Problem:** If a user has more than 500 transactions in a single month, the dashboard will silently compute incorrect totals because it cannot fetch all matching transactions.

**Assessment:** For typical personal finance usage (most users have <100 transactions per month), this limit is not a problem. However, the plan must not present the dashboard totals as universally accurate.

**Resolution options (choose during implementation):**
1. **Accept the limitation with documentation:** Display totals for up to 500 transactions. If `total_count > 500`, show an indicator that totals are approximate. This requires no backend change but limits accuracy.
2. **Add a dedicated aggregation command (preferred if gap is hit):** A single Rust command that returns `SELECT SUM(amount_minor) FROM transactions WHERE workspace_id = ? AND date >= ? AND date <= ? AND amount_minor > 0` (and similarly for expenses). This is a simple query, not new finance engine functionality — it's a query the frontend cannot safely perform because the 500-row cap prevents it from fetching all data.

**Decision:** If the 500-row limitation is genuinely encountered during development or testing, option 2 is the minimum backend change. It should be reported per the Backend Change Rule before implementation. If all test scenarios stay under 500 transactions/month, option 1 is acceptable with the UI indicating the cap.

---

## Architectural Approach

### State Management

Per `docs/architecture/state-management.md`:
- No global state library. Use `useState` and `useEffect` in page components.
- `WorkspaceContext` provides `currentWorkspaceId` across the app.
- Data loaded via Tauri commands on mount, refetched after mutations.
- No optimistic updates. Wait for command success before updating UI.
- No client-side cache. Fresh data on every page load.

If state management proves painful during implementation (many components needing shared data, cache invalidation complexity), document the finding for Sprint 6 evaluation — not mid-sprint addition.

### Component Architecture

- Page components own data fetching and state.
- UI primitives (Button, Input, Select, Dialog, Table) go in `src/components/ui/`.
- Feature-specific components (TransactionRow, AccountCard) go in feature directories under `src/components/`.
- Forms use controlled components with local state.
- No form library unless form complexity proves unmanageable.

### Error Handling

Per `docs/architecture/error-handling.md`:
- Validation errors shown inline on forms.
- Not-found errors show a fallback state.
- Conflict errors show a descriptive message.
- Database/internal errors show generic "Something went wrong."

### Styling

- Tailwind CSS v4 utility classes throughout.
- No external component library (shadcn, headless-ui, radix). Build minimal UI primitives.
- If headless primitives are genuinely needed for accessibility (e.g., dialog focus trap), evaluate during implementation and document the decision.

---

## Domain Behavior Reference

### Account Archive (is_active)

Account archiving **is supported** by the existing backend:
- The `accounts` table has `is_active INTEGER NOT NULL DEFAULT 1`
- `UpdateAccountInput` accepts `is_active: Option<bool>`
- The `update_account` Tauri command passes `isActive` through
- The TypeScript `updateAccount` wrapper accepts `isActive?: boolean`

**UI behavior:** Archiving sets `is_active = false`. Archived accounts remain in the database with all their transactions intact. The UI should show archived accounts distinctly (dimmed or in a separate section) and allow unarchiving.

### Account Deletion

Account deletion **cascades to all transactions** in the existing schema:
- `accounts.account_id` on the transactions table uses `ON DELETE CASCADE`
- Calling `deleteAccount(id)` permanently destroys the account and all its transactions
- The repository performs no transaction-count check — it deletes unconditionally

**UI behavior required:**
- Before deletion, the UI must warn the user that all transactions in this account will be permanently deleted
- Show the number of transactions that will be affected (requires a `list_transactions` call with account filter to get `total_count`, or a display of the account's transaction count)
- Require explicit confirmation with clear language: "This will permanently delete [account name] and all [N] transactions. This cannot be undone."
- **Recommend archiving instead** — the confirmation dialog should offer "Archive instead" as an alternative action
- Do NOT silently delete accounts with transactions without user awareness

**Data Model Overview reference:** "Deleting an account should warn about associated transactions." The warning belongs in the UI layer.

### Category Deletion

Category deletion behavior depends on the category type:

**System categories (`is_system = true`):**
- The backend repository rejects deletion with `DomainError::Validation("System categories cannot be deleted.")`
- The UI should disable the delete button or hide it for system categories
- If somehow triggered, the backend returns a validation error

**User-created categories (`is_system = false`):**
- Deletion succeeds at the backend
- The schema uses `ON DELETE SET NULL` on `transactions.category_id`
- Transactions that referenced the deleted category will have their `category_id` set to NULL (they become uncategorized)
- No transaction data is lost — only the category association is removed

**UI behavior required:**
- System categories: delete action disabled with clear indicator ("System categories cannot be deleted")
- User categories with transactions: warn that affected transactions will become uncategorized
- User categories without transactions: simple confirmation
- The backend handles all integrity — the UI only needs to inform the user of consequences

### Transaction Deletion

- Hard deletion, removes the row
- Balance is adjusted atomically by the backend (Sprint 4 ADR 0009)
- UI requires confirmation dialog

---

## Scope

### In Scope

- WorkspaceContext and workspace initialization (first-launch create prompt)
- Navigation refinements (categories route, active states)
- Accounts page: list, create, edit, archive/unarchive, delete with cascade warning
- Categories page: list by type, create, edit, delete (respecting system category protection)
- Transactions page: table with sorting, filtering, searching, pagination; create/edit dialog; delete confirmation
- Dashboard: total balance, account count, monthly income, monthly expenses, recent transactions (with 500-row limitation documented)
- Empty states for all list pages
- Loading states for data fetches
- Error states for failed operations
- Confirmation dialogs for destructive actions (with cascade warnings where applicable)
- Amount input formatting (dollars ↔ cents conversion using existing formatAmount/parseAmount)
- Date picker for transaction dates
- Keyboard shortcuts for common actions
- Responsive desktop layouts (not mobile — desktop-first per principles)
- UI primitives: Button, Input, Select, Dialog/Modal, Table, EmptyState, LoadingSpinner, ErrorMessage
- Frontend component tests for critical interactions
- Manual workflow verification
- Desktop build verification

### Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Budgets | Later Milestone 3 sprint |
| Goals | Later Milestone 3 sprint |
| Reports | Later Milestone 3 sprint |
| Charts or graphs | Later Milestone 3 sprint |
| CSV import | Future sprint |
| Transfers | No transfer ADR exists |
| Recurring transactions | Not designed |
| Plaid | Milestone 5 |
| Licensing | Milestone 4 |
| Updater | Milestone 4 |
| Cloud sync | Milestone 5 |
| Business invoicing | Later Milestone 3 sprint |
| Clients / vendors | Later Milestone 3 sprint |
| Onboarding wizard | Later Milestone 3 sprint |
| App lock / password / PIN | Later Milestone 3 sprint |
| Dark mode | Future polish |
| Analytics / notifications | Not planned |
| Sprint 6+ functionality | Future sprints |

---

## Implementation Phases

### Phase A: Foundation — Context, Primitives, and Layout

**Goal:** Build the shared infrastructure that all feature pages depend on.

1. **WorkspaceContext**
   - Create `src/contexts/WorkspaceContext.tsx`
   - Provides `currentWorkspaceId` and `setCurrentWorkspaceId`
   - On mount: call `listWorkspaces()`. If none exist, prompt user to create one. If one exists, select it. If multiple, let user choose.
   - Wrap the app in `<WorkspaceProvider>` in `App.tsx`
   - Seed default categories when a new workspace is created (`seedDefaultCategories`)

2. **UI Primitives** (`src/components/ui/`)
   - `Button.tsx` — primary, secondary, danger variants; disabled state; loading state
   - `Input.tsx` — label, error message, disabled state
   - `Select.tsx` — label, options, error message
   - `Dialog.tsx` — modal overlay with focus trap, title, close button, Escape to close
   - `ConfirmDialog.tsx` — extends Dialog for destructive confirmations (message + confirm/cancel buttons)
   - `Table.tsx` — header, rows, sortable column headers, empty state slot
   - `EmptyState.tsx` — icon/illustration, title, description, optional action button
   - `LoadingSpinner.tsx` — centered spinner for page/section loading
   - `ErrorMessage.tsx` — inline error display for forms and page-level errors
   - `AmountInput.tsx` — handles dollar input, converts to/from cents using parseAmount/formatAmount
   - `DateInput.tsx` — date picker (native `<input type="date">` or minimal custom picker)

3. **Layout Refinements**
   - Add "Categories" to sidebar navigation
   - Update sidebar icons (simple SVG or consistent character set)
   - Ensure header shows current page title correctly for new routes
   - Add route for `/categories` in `App.tsx`

**Verification:** App renders with WorkspaceContext. Creating a workspace on first launch works. UI primitives render in isolation.

---

### Phase B: Accounts UI

**Goal:** Full account management — list, create, edit, archive, delete with appropriate warnings.

4. **Accounts List Page** (`src/pages/Accounts.tsx`)
   - Fetch accounts via `listAccountsByWorkspace(currentWorkspaceId)` on mount
   - Display accounts in a table or card list: name, type, institution, balance (formatted), active status
   - Show total balance across all active accounts at the top
   - Empty state when no accounts exist
   - Loading state while fetching
   - Error state on fetch failure
   - "New Account" button opens create dialog

5. **Create Account Dialog**
   - Fields: name (required), account type (select), institution name (optional), currency (optional, defaults to workspace currency)
   - Validation: name required, must not be empty
   - On submit: call `createAccount(...)`, refetch list on success
   - Show validation errors inline
   - Close on success or cancel

6. **Edit Account Dialog**
   - Pre-populated fields: name, institution name
   - On submit: call `updateAccount(...)`, refetch list
   - Close on success or cancel

7. **Archive/Unarchive**
   - Toggle via `updateAccount(id, undefined, undefined, !isActive)`
   - Inactive accounts shown dimmed or in a separate "Archived" section
   - Inactive accounts still visible but clearly marked
   - No confirmation needed for archive (non-destructive, reversible)

8. **Delete Account**
   - Confirmation dialog with explicit cascade warning:
     - If account has transactions: "This will permanently delete [account name] and all [N] transactions. This cannot be undone. Consider archiving instead."
     - Include an "Archive Instead" button as alternative
     - If account has no transactions: "Delete [account name]? This cannot be undone."
   - To get transaction count: call `listTransactions({ workspace_id, account_id, limit: 1 })` and read `total_count`
   - On confirm: call `deleteAccount(id)`, refetch list

**Verification:** User can create, view, edit, archive/unarchive, and delete accounts. Balances display correctly. Cascade warning appears for accounts with transactions.

---

### Phase C: Categories UI

**Goal:** Category management — list by type, create, edit, delete with appropriate restrictions.

9. **Categories Page** (`src/pages/Categories.tsx`)
    - Route: `/categories`
    - Fetch categories via `listCategoriesByWorkspace(currentWorkspaceId)`
    - Display in two sections: Income categories and Expense categories
    - Show system badge on system categories
    - Empty state per section if no user categories of that type
    - "New Category" button

10. **Create Category Dialog**
    - Fields: name (required), type (income/expense select), parent category (optional select filtered by same type)
    - On submit: call `createCategory(...)`, refetch list
    - Validation: name required
    - Conflict error displayed if duplicate name (backend returns `DomainError::Conflict`)

11. **Edit Category Dialog**
    - Pre-populated: name, parent
    - System categories: name field disabled with explanation "System categories cannot be renamed"
    - On submit: call `updateCategory(...)`, refetch list

12. **Delete Category**
    - System categories: delete button disabled or hidden with tooltip "System categories cannot be deleted"
    - User categories: confirmation dialog
      - "Delete [category name]? Transactions using this category will become uncategorized."
      - The backend handles the `SET NULL` — the UI only informs the user
    - On confirm: call `deleteCategory(id)`, refetch list

**Verification:** User can view, create, edit, and delete categories. System categories are protected at UI and backend level. Deletion warning mentions uncategorized transactions.

---

### Phase D: Transactions UI

**Goal:** The primary feature — transaction list with full CRUD, search, filter, sort, and pagination.

13. **Transactions Page** (`src/pages/Transactions.tsx`)
    - Fetch transactions via `listTransactions({ workspace_id, limit: 50 })`
    - Display as a table: date, description, category name, account name, amount (formatted, colored by direction)
    - Positive amounts (income) in green or neutral. Negative amounts (expense) in red or distinct color.
    - Default sort: date DESC (newest first) — matches backend default
    - Loading state, empty state, error state

14. **Filtering Controls**
    - Account filter: dropdown of accounts in workspace
    - Category filter: dropdown of categories in workspace
    - Direction filter: All / Income / Expense
    - Date range: from/to date inputs
    - Clear filters button
    - Filters update the `listTransactions` query parameters and refetch

15. **Search**
    - Text input for searching by description
    - Debounced (300ms) — triggers refetch with `search` parameter
    - Clear button

16. **Sorting**
    - Default ordering from backend is `date DESC, id DESC` — newest first
    - If client-side column sorting is desired for the current page of results, implement within the fetched page
    - Do not override backend ordering for pagination correctness

17. **Pagination**
    - Show `total_count` from backend response
    - "Page X of Y" display
    - Previous/Next buttons
    - Uses `offset` parameter on backend query
    - Page size: 50 (matches backend default limit)

18. **Create Transaction Dialog**
    - Fields: date (required, defaults to today), description (required), amount (required, via AmountInput), direction toggle (Income/Expense — determines sign of `amount_minor`), account (required select), category (optional select), notes (optional textarea)
    - Direction toggle: user picks "Income" or "Expense", backend receives positive or negative `amount_minor`
    - Validation: date required, amount required and non-zero, account required, description required
    - On submit: call `createTransaction(...)`, refetch list
    - Keyboard: Enter to submit, Escape to close

19. **Edit Transaction Dialog**
    - Same fields as create, pre-populated with existing values
    - Direction derived from existing amount sign (positive = Income selected, negative = Expense selected)
    - On submit: call `updateTransaction(...)`, refetch list

20. **Delete Transaction**
    - Confirmation dialog: "Delete this transaction? This cannot be undone. The account balance will be adjusted."
    - On confirm: call `deleteTransaction(id)`, refetch list
    - Balance updates automatically (backend handles atomically)

21. **Keyboard Shortcuts**
    - `Ctrl/Cmd + N`: Open create transaction dialog (when on transactions page)
    - `Escape`: Close any open dialog
    - `Enter`: Submit form (when dialog is focused)

**Verification:** User can create, view, search, filter, paginate, edit, and delete transactions. Amount direction (income/expense) is intuitive. Balances update after mutations.

---

### Phase E: Dashboard

**Goal:** Simple financial summary — no charts, no reports.

22. **Dashboard Page** (`src/pages/Dashboard.tsx`)
    - Fetch accounts for total balance and count
    - Fetch recent transactions (limit 5–10) for the "recent transactions" section
    - Compute monthly totals: fetch current month's transactions and sum by direction

23. **Dashboard Content**
    - **Total Balance card:** Sum of all active account balances (from accounts list, already accurate — maintained by backend)
    - **Accounts card:** Count of active accounts
    - **Income This Month card:** Sum of positive `amount_minor` for transactions in current month
    - **Expenses This Month card:** Sum of absolute value of negative `amount_minor` in current month
    - **Recent Transactions section:** Last 5–10 transactions as a compact list (date, description, amount, account)

24. **Monthly Totals Implementation**
    - Fetch via `listTransactions({ workspace_id, date_from: firstOfMonth, date_to: lastOfMonth, limit: 500 })`
    - Sum positive amounts for income, sum absolute negative amounts for expenses
    - **If `total_count > 500`:** Display an indicator that totals are based on the most recent 500 transactions and may be incomplete. Do NOT silently truncate.
    - **Note:** If this limitation is genuinely encountered during development, invoke the Backend Change Rule (add a dedicated aggregation command). See "Known API Gap" section above.

25. **Dashboard States**
    - Loading: spinners while data loads
    - Empty: "Get started by creating an account" with action button
    - Error: generic error message

**Verification:** Dashboard shows correct totals derived from actual account and transaction data. Numbers update after creating/editing transactions. 500-row limitation is visible if triggered.

---

### Phase F: Polish, Testing, and Documentation

**Goal:** Quality assurance, tests, and documentation.

26. **Empty States**
    - Accounts: "No accounts yet. Create your first account to start tracking your finances."
    - Categories: appropriate per-section empty state
    - Transactions: "No transactions yet. Record your first transaction."
    - Dashboard: "Welcome to Ledger. Create a workspace and add an account to get started."

27. **Loading and Error States**
    - All pages show LoadingSpinner while initial data loads
    - Buttons show loading state during mutations
    - Error messages from failed commands display appropriately

28. **Frontend Component Tests**
    - AmountInput: renders, formats input, returns cents
    - Button: renders all variants, handles click, shows loading
    - Dialog: opens, closes on Escape, renders title and content
    - ConfirmDialog: renders message, calls confirm/cancel callbacks
    - EmptyState: renders title and action
    - Dashboard: renders with mock data (mock Tauri invoke)
    - Accounts page: renders list, handles empty state
    - Transactions page: renders table, handles filters
    - Format utilities: existing tests continue passing

29. **Manual Workflow Tests (documented, not automated)**
    - First launch: workspace creation prompted → categories seeded → dashboard shows empty state
    - Account lifecycle: create → view in list → edit name → archive → unarchive → delete with cascade warning
    - Category lifecycle: create income + expense categories → edit → delete user category → system category undeletable
    - Transaction lifecycle: create income transaction → balance increases → create expense → balance decreases → edit amount → balance adjusts → delete → balance reverts
    - Search and filter: create 5+ transactions → search by text → filter by account → filter by date → filter by direction → clear filters
    - Persistence: create data → close app → reopen → all data present
    - Dashboard accuracy: verify totals match expected sums
    - Cascade warning: create account with transactions → attempt delete → warning shows count → can archive instead

30. **Documentation**
    - Update TASKS.md — mark Sprint 5 complete
    - Update CHANGELOG.md — Sprint 5 entry
    - Update ARCHITECTURE.md — v1.5, "Sprint 5 Complete — Personal Finance UI"
    - Update README.md — update status
    - Finalize sprint-5 notes (Status → Complete)

31. **Verification Checklist**
    - `cargo check` succeeds
    - `cargo test` passes (all Sprint 2 + 3 + 4 tests unmodified)
    - `npm run build` succeeds
    - `npm run lint` passes
    - `npm run format:check` passes
    - `npm run test` passes (new + existing frontend tests)
    - `npm run dev` launches, database migrates, UI is functional
    - Desktop build (`npm run tauri:build`) succeeds

**Verification:** All tests pass. All manual workflows verified. Documentation updated.

---

## Acceptance Criteria

Sprint 5 is complete when all of the following are true:

1. User can create a workspace on first launch
2. Default categories are seeded when a workspace is created
3. User can create an account with name, type, and institution
4. User can view all accounts with their current balances (formatted as currency)
5. User can edit an account name and institution
6. User can archive an account (set `is_active = false`) — non-destructive, reversible
7. User can unarchive an account (set `is_active = true`)
8. User can delete an account with explicit cascade warning showing transaction count
9. Account deletion confirmation offers "Archive Instead" as an alternative
10. User can view categories grouped by income and expense type
11. User can create a new category (income or expense)
12. User can edit a user-created category name
13. System categories cannot be renamed (backend enforces, UI disables)
14. User can delete a user-created category with warning about uncategorized transactions
15. System categories cannot be deleted (backend enforces, UI disables)
16. User can create a transaction with date, description, amount, direction, account, and optional category
17. User can view transactions in a table with date, description, category, account, and amount
18. User can search transactions by description
19. User can filter transactions by account
20. User can filter transactions by category
21. User can filter transactions by date range
22. User can filter transactions by direction (income/expense)
23. User can paginate through transaction results
24. User can edit a transaction
25. User can delete a transaction with confirmation
26. Account balances update immediately after transaction create/edit/delete (backend handles atomically)
27. Dashboard shows total balance across active accounts
28. Dashboard shows number of active accounts
29. Dashboard shows income for the current month (with 500-row limitation documented if exceeded)
30. Dashboard shows expenses for the current month (with 500-row limitation documented if exceeded)
31. Dashboard shows recent transactions
32. Empty states appear on all pages when no data exists
33. Loading states appear during data fetches
34. Validation errors appear inline on forms (from backend via parseCommandError)
35. Destructive actions require confirmation dialogs with clear consequence descriptions
36. Application data persists after closing and reopening
37. Keyboard shortcut Ctrl/Cmd+N opens create transaction dialog
38. Escape closes any open dialog
39. `cargo check` succeeds
40. `cargo test` passes (all existing Rust tests unchanged)
41. `npm run build` succeeds
42. `npm run lint` passes
43. `npm run format:check` passes
44. `npm run test` passes
45. `npm run dev` launches with functional UI
46. `npm run tauri:build` succeeds
47. No budgets, goals, reports, or charts exist
48. No CSV import UI exists
49. No transfer workflows exist
50. No recurring transaction features exist
51. No Plaid, licensing, cloud, onboarding wizard, or app lock code exists
52. No backend code added unless a gap was reported per the Backend Change Rule
53. TASKS.md, CHANGELOG.md, ARCHITECTURE.md, README.md updated

---

## Testing Strategy

### Frontend Component Tests (automated, via Vitest + Testing Library)

| Component | Tests |
|-----------|-------|
| Button | Renders variants, handles click, shows loading, disabled state |
| Input | Renders label, shows error, disabled state |
| Dialog | Opens, closes on Escape, renders title and content |
| ConfirmDialog | Renders message, calls onConfirm/onCancel |
| AmountInput | Formats display, converts to/from cents correctly |
| EmptyState | Renders title, description, action |
| Dashboard | Renders cards with mock data |
| Accounts page | Renders account list, shows empty state |
| Transactions page | Renders table, shows filters |

**Estimated new tests:** 15–25

### Integration Tests (manual workflow verification)

| Workflow | Steps |
|----------|-------|
| First launch | Open app → workspace prompt → create → categories seeded → dashboard empty state |
| Account lifecycle | Create → list → edit → archive → unarchive → delete (with cascade warning) |
| Category lifecycle | Create income + expense → edit → delete user → verify system undeletable |
| Transaction lifecycle | Create income → balance up → create expense → balance down → edit → balance adjusts → delete → balance reverts |
| Search and filter | Create 5+ → search text → filter account → filter date → filter direction → clear |
| Cascade warning | Account with transactions → delete attempt → warning with count → archive alternative works |
| Persistence | Create data → close → reopen → verify all data intact |
| Dashboard accuracy | Verify totals match expected sums from transactions |

### Desktop Build Verification

- `npm run tauri:build` completes successfully
- Built application launches
- Database migration runs on fresh database
- All UI features functional in built application

### Regression

- All existing `cargo test` tests pass (Sprint 2–4 Rust tests)
- All existing `npm run test` tests pass (format utility tests)

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Dialog accessibility (focus trap, keyboard nav) | Poor UX, accessibility gaps | Medium | Use native `<dialog>` element where possible. Build minimal focus trap if needed. |
| Date input inconsistency across OS | Different date picker on macOS vs Windows | Low | Native `<input type="date">` is consistent in Tauri webview (Chromium). Test both platforms. |
| Dashboard monthly totals exceed 500-row cap | Incorrect totals displayed | Low (personal finance) | Document limitation. If hit during testing, invoke Backend Change Rule. |
| No state management becomes painful | Prop drilling, stale data | Medium | Monitor during implementation. Document for Sprint 6 evaluation if painful. |
| Amount input UX | Users confused by cents vs. dollars | Low | AmountInput component abstracts this. User types dollars, system stores cents. |
| Account cascade deletion could destroy data unexpectedly | Data loss | High (if warning absent) | Explicit cascade warning with transaction count. Offer archive alternative. |

---

## Assumptions

1. Sprint 4 is fully complete and committed (confirmed — not a risk)
2. No new Rust code needed for documented workflows — existing command layer is sufficient (except known 500-row gap for edge-case monthly totals)
3. No external UI library needed — Tailwind + custom primitives sufficient for professional desktop UI
4. Native date input is acceptable — `<input type="date">` provides cross-platform picking
5. Client-side monthly aggregation is acceptable for typical usage (<500 transactions/month)
6. One workspace is the common case — context supports multiple but UI shows active without complex switcher
7. The `is_active` field on accounts constitutes archiving support — no schema change needed

---

## File Structure (new files)

```
src/
  contexts/
    WorkspaceContext.tsx
  components/
    ui/
      Button.tsx
      Input.tsx
      Select.tsx
      Dialog.tsx
      ConfirmDialog.tsx
      Table.tsx
      EmptyState.tsx
      LoadingSpinner.tsx
      ErrorMessage.tsx
      AmountInput.tsx
      DateInput.tsx
    accounts/
      AccountList.tsx
      AccountForm.tsx
    categories/
      CategoryList.tsx
      CategoryForm.tsx
    transactions/
      TransactionTable.tsx
      TransactionFilters.tsx
      TransactionForm.tsx
    dashboard/
      SummaryCard.tsx
      RecentTransactions.tsx
  pages/
    Accounts.tsx (rewritten from placeholder)
    Categories.tsx (new)
    Dashboard.tsx (rewritten from placeholder)
    Transactions.tsx (rewritten from placeholder)
    Settings.tsx (unchanged)
  hooks/
    useWorkspace.ts (convenience hook for context)
```

---

## What Sprint 5 Does NOT Change

- No modifications to `src-tauri/` (Rust backend) unless Backend Change Rule invoked
- No new database migrations
- No new Tauri commands unless Backend Change Rule invoked
- No changes to repositories or validation logic
- No changes to existing API wrappers (only consumes them)
- No new npm dependencies unless genuinely necessary (documented if added)
- No product direction changes

---

## What Later Milestone 3 Sprints Will Build On

Sprint 5 delivers a working personal finance application with core CRUD workflows. Later Milestone 3 sprints will add:

- Budgets, goals, and reports (requires transaction aggregation views)
- Security and onboarding (requires app lock, first-launch wizard)
- Business features (requires clients, vendors, invoices)

Sprint 5 must not implement any of this. The UI architecture, component patterns, and workspace context must be solid enough to extend without rewrites.
