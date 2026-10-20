# Sprint 8: Dashboard — Implementation Plan

**Status:** Complete
**Date:** 2026-10-20

---

## Objective

When a user opens Ledger Desktop, the Dashboard provides an at-a-glance summary of their finances: total balance across active accounts, active account count, monthly income and expenses for the current month, and a list of recent transactions. A new user with no data sees a welcoming empty state. After this sprint, the user lands on a useful home screen — all offline, all local.

---

## Backend Contract Reference

No new backend commands are needed. The Dashboard combines data from existing APIs:

### Accounts

| Operation | TS wrapper | Returns |
|---|---|---|
| List all | `listAccountsByWorkspace(workspaceId): Promise<Account[]>` | Full account list with `balance`, `is_active` fields |

**Total balance:** Sum of `balance` for accounts where `is_active === true`, computed client-side.
**Account count:** Count of accounts where `is_active === true`, computed client-side.

### Monthly Summary

| Operation | TS wrapper | Returns |
|---|---|---|
| Aggregated summary | `getTransactionSummary(workspaceId, dateFrom, dateTo): Promise<TransactionSummary>` | `{ income_minor, expense_minor, net_minor, transaction_count }` |

This uses SQL aggregate functions (`SUM`, `COUNT`) over all matching transactions — **no row-count limitation**. The `expense_minor` value is **negative** (not absolute). The sprint-5 "Known API Gap" about a 500-row limitation does not apply here because this command bypasses the paginated `listTransactions` path entirely.

**Current month range:** `dateFrom = YYYY-MM-01`, `dateTo = YYYY-MM-DD` (today's date). Computed in JavaScript.

### Recent Transactions

| Operation | TS wrapper | Returns |
|---|---|---|
| List with limit | `listTransactions({ workspaceId, limit: 10 }): Promise<TransactionListResult>` | `{ transactions: Transaction[], total_count: number }` |

Default ordering is `date DESC, id DESC` (most recent first), which is exactly what the dashboard needs. A `limit: 10` fetches the 10 most recent transactions without loading the full history.

**Display:** Each transaction needs account and category names for display. These are fetched the same way the Transactions page does it — `listAccountsByWorkspace` and `listCategoriesByWorkspace` provide lookup maps.

### Error Behavior

Same established pattern: `parseCommandError` for all API errors. The dashboard fetches multiple independent data sources; a failure in one should not prevent the others from rendering. Each card/section handles its own loading and error state independently.

---

## Scope

### In Scope

- Dashboard page replacing the current placeholder
- Summary cards: total balance, active account count, monthly income, monthly expenses
- Recent transactions list (10 most recent)
- Empty state for new users (no accounts, no transactions)
- Per-section loading states
- Per-section error handling (one failing API doesn't break the whole page)

### Out of Scope

- Charts or graphs
- Date range picker (always shows current month)
- Budget progress indicators
- Click-through navigation from cards to detail pages
- Sparklines or trend indicators
- Customizable dashboard layout

---

## Phase Structure

### Phase A: Dashboard Layout and Summary Cards

Replace the placeholder `src/pages/Dashboard.tsx` with the working dashboard.

**Delivers:**
1. Fetch accounts via `listAccountsByWorkspace` and monthly summary via `getTransactionSummary` on mount
2. Four summary cards in a responsive grid:
   - **Total Balance** — sum of `balance` for active accounts, formatted as currency
   - **Active Accounts** — count of active accounts
   - **Monthly Income** — `income_minor` from transaction summary, formatted as currency
   - **Monthly Expenses** — `Math.abs(expense_minor)` from transaction summary, formatted as positive currency
3. Current month label displayed (e.g., "October 2026")
4. Loading state per data source (accounts and summary can load independently)
5. Error state per data source with retry
6. Empty state when no accounts exist: welcoming message with prompt to create first account
7. Cards show `$0.00` gracefully when accounts exist but no transactions in the current month

**Exit criteria:**
- Dashboard shows four summary cards with correct values
- Loading spinner while data loads
- Error in one source doesn't prevent the other from rendering
- Empty state for new workspace

### Phase B: Recent Transactions List

**Delivers:**
1. Fetch recent transactions via `listTransactions({ workspaceId, limit: 10 })`
2. Fetch account and category lists for label resolution (can reuse accounts already fetched in Phase A)
3. Transaction list section below the summary cards:
   - Each row: date, description, amount (formatted with sign/color), account name, category name
   - Amount positive = green, negative = red (same convention as Transactions page)
4. Empty state when no transactions exist: "No transactions yet"
5. Independent loading and error handling from the summary cards

**Exit criteria:**
- 10 most recent transactions shown with correct formatting
- Account and category names resolved
- Empty message when no transactions

### Phase C: Tests and Documentation

**Delivers:**
1. Frontend tests for:
   - Dashboard rendering with all four cards
   - Correct total balance calculation (sums only active accounts)
   - Monthly income/expense display (expense shown as positive absolute value)
   - Recent transactions list rendering
   - Empty state (no accounts)
   - Error handling (partial failures)
   - Loading states
2. Update `TASKS.md` — mark Sprint 8 phases complete
3. Update `CHANGELOG.md` — Sprint 8 entry
4. Update `README.md` — Milestone 3 complete
5. Update `docs/milestones.md` — check Sprint 8 and Milestone 3 exit criteria
6. Create closeout section in this file

**Exit criteria:**
- All new frontend tests pass
- All existing tests continue to pass (336 frontend, 104+ Rust)
- `cargo test`, `npm test`, `npm run lint`, `npm run format:check`, `npm run build` all pass
- Documentation reflects Milestone 3 completion

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Multiple concurrent API calls on mount | Fire all three calls (accounts, summary, transactions) in parallel; each section renders independently as its data arrives |
| Transaction summary for empty month | `getTransactionSummary` returns zeros correctly (tested); cards show `$0.00` |
| Account/category names missing for recent transactions | Use the same lookup-map pattern as the Transactions page; show "Unknown" fallback |

---

## Dependencies

- Sprint 3 (Core Domain Entities) — account/category list commands: **complete**
- Sprint 4 (Transaction Engine) — `listTransactions`, `getTransactionSummary`: **complete**
- Sprint 5 (Accounts UI) — `WorkspaceContext`, UI primitives: **complete**

---

## Backend Changes

**None.** All required APIs exist. Sprint 8 is a frontend-only sprint.

---

## Sprint 8 Closeout

**Completed:** 2026-10-20

### Delivered

All three phases (A through C) delivered as planned:

| Phase | Description | Status |
|---|---|---|
| A | Dashboard layout with four summary cards (total balance, active accounts, monthly income, monthly expenses) | Complete |
| B | Recent transactions list (10 most recent) with account and category name resolution | Complete |
| C | 18 new frontend tests, documentation updates, Milestone 3 marked complete | Complete |

### Files Created/Modified

- `src/pages/Dashboard.tsx` — full dashboard page (replaced placeholder)
- `src/pages/Dashboard.test.tsx` — 18 tests (replaced 1 placeholder test)

### Test Summary

- 353 frontend tests across 18 test files, all passing
- 104+ Rust tests, all passing
- Lint, format, build all clean

### Design Decisions

- **Independent data loading:** Accounts, monthly summary, and recent transactions are fetched in parallel as three independent calls. Each section renders independently as its data arrives; a failure in one does not block the others.
- **No row-count limitation on monthly totals:** `getTransactionSummary` uses SQL `SUM`/`COUNT` aggregates directly, bypassing the paginated `listTransactions` path entirely. The Sprint 5 "Known API Gap" does not apply.
- **Expense shown as positive:** `expense_minor` from the backend is negative; the dashboard displays `Math.abs(expense_minor)` so the card reads as a positive dollar amount.
- **Empty state gating:** The "Welcome to Ledger" empty state appears only when accounts have been successfully loaded and the list is empty — an account-fetch failure shows the cards grid with "Failed to load" indicators instead.

### What's Next

**Milestone 3 (Core Finance Features) is complete.** All four sprints (5: Accounts UI, 6: Transactions UI, 7: Categories UI, 8: Dashboard) are delivered. See `TASKS.md` "Future Milestones (Unscheduled)" for the next product domains.
