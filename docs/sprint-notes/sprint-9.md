# Sprint 9: Budgets — Implementation Plan

**Status:** Complete
**Date:** 2026-10-20

---

## Objective

A user can set monthly spending limits per expense category and track progress against those limits. The Budgets page shows each budget with a visual progress bar, the amount spent vs the budgeted amount, and highlights over-budget categories. The Dashboard gains a budget summary showing how many categories are over budget in the current month. After this sprint, users have a basic but functional budgeting workflow — all offline, all local.

---

## Data Model

### Budget Entity

A budget represents a monthly spending target for one expense category in one workspace.

| Field | Type | Stored as | Notes |
|---|---|---|---|
| `id` | integer | `INTEGER PRIMARY KEY` | Auto-assigned |
| `workspace_id` | integer | `INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE` | Immutable after creation |
| `category_id` | integer | `INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE` | Must be an expense category; immutable after creation |
| `amount_minor` | integer | `INTEGER NOT NULL CHECK(amount_minor > 0)` | Budget limit in minor units (cents), per ADR 0008 |
| `month` | integer | `INTEGER NOT NULL CHECK(month >= 1 AND month <= 12)` | Calendar month (1–12) |
| `year` | integer | `INTEGER NOT NULL CHECK(year >= 1900 AND year <= 2999)` | Calendar year |
| `created_at` | string | `TEXT NOT NULL DEFAULT (datetime('now'))` | Immutable |
| `updated_at` | string | `TEXT NOT NULL DEFAULT (datetime('now'))` | Bumped on update |

**Uniqueness constraint:** `UNIQUE(workspace_id, category_id, month, year)` — one budget per category per month per workspace.

**Why expense categories only:** Budgets are spending limits. Budgeting income categories doesn't fit the standard budgeting mental model. If income budgeting is needed later, the CHECK constraint on `category_id` can be relaxed without a migration.

**Why month+year instead of a date string:** Explicit month and year integers avoid ambiguity about which day of the month the budget covers, simplify month navigation, and enable straightforward SQL queries (`WHERE month = ?1 AND year = ?2`) without date-string parsing.

**ON DELETE CASCADE for category_id:** If a category is deleted, its budgets are deleted too. This is simpler than keeping orphaned budget rows. The user has already confirmed category deletion (which warns about uncategorized transactions); the budget deletion is a natural consequence.

### Migration: `0006_budgets.sql`

```sql
CREATE TABLE budgets (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
    month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK(year >= 1900 AND year <= 2999),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(workspace_id, category_id, month, year)
);

CREATE INDEX idx_budgets_workspace_month_year ON budgets(workspace_id, month, year);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
```

---

## Backend Contract

### Budget CRUD

| Operation | Tauri command | TS wrapper | Notes |
|---|---|---|---|
| Create | `create_budget` | `createBudget(workspaceId, categoryId, amountMinor, month, year): Promise<Budget>` | Validates: workspace exists, category exists and is expense type, amount > 0, month/year valid, no duplicate |
| List | `list_budgets` | `listBudgets(workspaceId, month, year): Promise<Budget[]>` | Returns all budgets for a workspace+month+year, ordered by category name |
| Update | `update_budget` | `updateBudget(id, amountMinor): Promise<Budget>` | Only the amount can be changed; category, month, year are immutable |
| Delete | `delete_budget` | `deleteBudget(id): Promise<void>` | Straightforward delete, no cascading side effects |

### Budget Progress (New Aggregation Command)

| Operation | Tauri command | TS wrapper | Notes |
|---|---|---|---|
| Category spending | `get_category_spending` | `getCategorySpending(workspaceId, month, year): Promise<CategorySpending[]>` | Returns `{ category_id, spent_minor }` for each expense category that has transactions in the given month |

This is a new SQL aggregation query:

```sql
SELECT category_id, COALESCE(SUM(ABS(amount_minor)), 0) AS spent_minor
FROM transactions
WHERE workspace_id = ?1
  AND date >= ?2 AND date <= ?3
  AND amount_minor < 0
  AND category_id IS NOT NULL
GROUP BY category_id
```

The date range is computed from month+year: `dateFrom = YYYY-MM-01`, `dateTo = YYYY-MM-{last day}`. Using `ABS()` so `spent_minor` is a positive value for display (expenses are stored as negative amounts).

**Why a separate command instead of per-category `getTransactionSummary` calls?** A single GROUP BY query is O(1) SQL calls regardless of category count, vs N calls for N budgets. With ~20 categories, this matters for responsiveness.

### Error Behavior

Same established pattern: `DomainError` → `CommandError { code, message }` → `parseCommandError`.

| Error | Condition |
|---|---|
| `Validation` | Empty/invalid amount, workspace not found, category not found, category is income type, month/year out of range |
| `Conflict` | Duplicate budget (same workspace + category + month + year) |
| `NotFound` | Budget ID doesn't exist (for update/delete) |

---

## Scope

### In Scope

- `budgets` table migration
- Budget model, repository, Tauri commands, TypeScript API wrappers
- Category spending aggregation command
- Budgets page: list budgets for current month with progress bars, month navigation
- Create budget dialog (category selector filtered to expense categories without existing budget for this month, amount input)
- Edit budget dialog (amount only)
- Delete budget with confirmation
- Over-budget visual indicator (progress bar color change, text warning)
- Dashboard: budget summary card or section (e.g., "2 of 5 budgets over limit")
- Loading, empty, error states
- Frontend and Rust tests

### Out of Scope

- Income budgets
- Multi-month budget creation (one month at a time)
- Budget rollover or copying between months
- Budget history or trend views
- Budget alerts or notifications
- Budget templates
- Charts or graphs (progress bars only)

---

## Phase Structure

### Phase A: Backend — Migration, Model, Repository, Commands

**Delivers:**
1. Migration `0006_budgets.sql`
2. `Budget` model struct (`src-tauri/src/models/budget.rs`)
3. `BudgetRepository` with CRUD + list by workspace+month+year (`src-tauri/src/repositories/budget.rs`)
4. `CategorySpending` model and `get_category_spending` query (new file or extend `transaction_summary.rs`)
5. Tauri commands: `create_budget`, `list_budgets`, `update_budget`, `delete_budget`, `get_category_spending`
6. TypeScript API wrappers: `src/api/budgets.ts`
7. TypeScript types: `Budget`, `CategorySpending` in `src/types/domain.ts`
8. Rust tests for repository (CRUD, validation, conflict, cascade on category delete)
9. Rust tests for category spending aggregation

**Exit criteria:**
- `cargo test` passes with new budget and category-spending tests
- All existing Rust tests continue to pass
- TypeScript wrappers compile

### Phase B: Budgets Page — List with Progress

**Delivers:**
1. `src/pages/Budgets.tsx` — replaces any placeholder or is a new page
2. Fetch budgets via `listBudgets(workspaceId, month, year)` and category spending via `getCategorySpending(workspaceId, month, year)` on mount
3. Also fetch categories via `listCategoriesByWorkspace` for category name resolution
4. Month navigation: previous/next month buttons, current month+year label
5. Budget list: each row shows category name, budgeted amount, spent amount, remaining amount, progress bar
6. Progress bar: green when under budget, yellow at 80%+, red when over budget
7. Summary line: "X of Y budgets over limit" or "All budgets on track"
8. Empty state: "No budgets set for [Month Year]. Create one to start tracking your spending."
9. "New Budget" button → create dialog (Phase C)
10. Edit/Delete buttons on each budget row
11. Loading and error states
12. Add "Budgets" link to the sidebar navigation

**Exit criteria:**
- Budgets page shows budget list with progress bars for the current month
- Month navigation works (previous/next)
- Over-budget categories visually highlighted
- Empty state renders correctly

### Phase C: Create and Edit Budget Dialogs

**Delivers:**
1. `CreateBudgetDialog` — category selector (expense categories only, filtered to exclude categories that already have a budget for this month), amount input
2. `EditBudgetDialog` — pre-populated amount, category shown as read-only text
3. Validation: amount required and must be positive, duplicate conflict handling
4. On success: close dialog, refresh budget list

**Exit criteria:**
- User can create a budget for an expense category
- Category selector only shows eligible categories
- User can edit a budget's amount
- Conflict error surfaces on duplicate
- Dialog closes on success and list updates

### Phase D: Delete Budget and Dashboard Integration

**Delivers:**
1. Delete budget with confirmation dialog (simpler than category delete — no cascading warnings needed)
2. Dashboard budget summary: add a card or section showing budget status for the current month
   - If budgets exist: "X of Y budgets on track" or "X over budget"
   - If no budgets: card not shown (don't clutter dashboard for users who don't use budgets)
3. Dashboard fetches budget data alongside existing data (parallel, independent error handling)

**Exit criteria:**
- User can delete a budget with confirmation
- Dashboard shows budget summary when budgets exist
- Dashboard unchanged when no budgets exist

### Phase E: Tests and Documentation

**Delivers:**
1. Frontend tests for:
   - Budgets page (list, progress bars, month navigation, empty/loading/error states)
   - CreateBudgetDialog (category filtering, validation, submission)
   - EditBudgetDialog (pre-population, amount update)
   - Delete flow
   - Dashboard budget summary (present when budgets exist, absent when not)
2. Update `TASKS.md` — add Sprint 9 tracking, mark phases complete
3. Update `CHANGELOG.md` — Sprint 9 entry
4. Update `README.md` — project status
5. Update `docs/milestones.md` — check Sprint 9 exit criteria
6. Create closeout section in this file

**Exit criteria:**
- All new frontend and Rust tests pass
- All existing tests continue to pass
- `cargo test`, `npm test`, `npm run lint`, `npm run format:check`, `npm run build` all pass
- Documentation reflects Sprint 9 completion

---

## UI Details

### Progress Bar Behavior

| Spent / Budget ratio | Color | Text |
|---|---|---|
| 0–79% | Green (`bg-green-500`) | "$X of $Y spent" |
| 80–99% | Yellow (`bg-yellow-500`) | "$X of $Y spent" |
| 100%+ | Red (`bg-red-500`) | "$X of $Y spent — over by $Z" |

The bar width is `min(percentage, 100)%` so it doesn't overflow the container. The over-budget amount is shown as text.

### Month Navigation

Two buttons: "← Previous" and "Next →". Current month+year displayed between them (e.g., "October 2026"). No limit on how far back or forward the user can navigate (budget history viewing). Navigating to a month with no budgets shows the empty state.

### Category Selector Filtering

The create dialog's category dropdown:
1. Fetches all categories via `listCategoriesByWorkspace`
2. Filters to `category_type === "expense"` only
3. Further filters out categories that already have a budget for the currently selected month+year
4. Sorts alphabetically by name
5. If all expense categories already have budgets: shows disabled state with explanation

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Category deleted while budget exists | `ON DELETE CASCADE` — budget is automatically removed |
| Budget for a category that has no transactions | `getCategorySpending` returns nothing for that category; UI shows $0 spent, full budget remaining |
| Navigating to months far in the past/future | No restriction; empty state for months without budgets |
| Large number of budgets | ~20 max (one per expense category); no pagination needed |

---

## Dependencies

- Milestone 2 (Local Data Platform) — SQLite, migrations, repository pattern: **complete**
- Milestone 3 (Core Finance Features) — categories, transactions, transaction summary: **complete**
- Sprint 5 (Accounts UI) — `WorkspaceContext`, UI primitives: **complete**

---

## Navigation Change

The sidebar currently has: Dashboard, Accounts, Transactions, Categories, Settings. Sprint 9 adds **Budgets** between Categories and Settings.

This requires modifying the sidebar/navigation component to include the new route and page.

---

## Sprint 9 Closeout

**Status:** Complete
**Date:** 2026-10-20

### What Was Delivered

All five phases (A through E) delivered. Phases B, C, and D were combined into a single implementation pass because the budgets page, dialogs, and dashboard integration are tightly coupled and small enough to build together.

**Backend (Phase A):**
- Migration `0006_budgets.sql` — budgets table with UNIQUE(workspace_id, category_id, month, year), CHECK constraints, indexes, ON DELETE CASCADE for category FK
- `Budget` model, `CreateBudgetInput`, `CategorySpending` structs
- `BudgetRepository` — full CRUD, validation (expense-only categories, positive amounts, month/year range, duplicate detection, workspace/category existence), category spending aggregation via single GROUP BY query
- 5 Tauri commands registered in invoke_handler
- TypeScript API wrappers and domain types
- 20 new Rust repository tests

**Frontend (Phases B–D):**
- `Budgets.tsx` — budget list with progress bars (green <80%, yellow 80–99%, red 100%+), month navigation (previous/next), budget summary line ("X of Y over budget" or "All on track"), empty/loading/error states
- Create budget dialog with category selector (expense only, excludes already-budgeted categories for the current month), amount input
- Edit budget dialog (pre-populated amount, category read-only)
- Delete budget dialog with confirmation
- Dashboard budget summary card — shows when budgets exist, hidden when none
- Sidebar: "Budgets" link between Categories and Settings
- Route `/budgets` registered in App.tsx

**Tests and Documentation (Phase E):**
- 27 new frontend tests covering: page rendering, loading/empty/error states, budget list with progress bars, month navigation, create/edit/delete dialogs, category filtering, summary line, progressbar accessibility
- 125 total Rust tests, 380 total frontend tests, all passing
- TypeScript compiles clean, Prettier formatting verified

### Design Decisions

- **Phases combined:** B (page), C (dialogs), and D (delete + dashboard) were built together since the dialogs are small and inline in the page component, not separate component files.
- **DialogOverlay inline:** Used a local `DialogOverlay` wrapper instead of the project's `Dialog` component to keep the budgets page self-contained. The existing `Dialog` component expects `open` prop toggling; the budget dialogs use conditional rendering.
- **parseAmountToMinor local:** Duplicated simple amount parsing rather than importing `parseAmount` from format.ts, which handles negative amounts (budgets are always positive).
- **Dashboard budget fetch is fire-and-forget:** Budget data on the dashboard loads independently and silently — failure doesn't show an error card, it just hides the budget summary. This matches the sprint plan: "If no budgets: card not shown."
- **overBudget threshold:** A budget counts as "over" when spent >= amount (at or above), matching the progress bar red threshold at 100%.
