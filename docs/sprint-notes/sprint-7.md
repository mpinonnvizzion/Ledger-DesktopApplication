# Sprint 7: Categories UI — Implementation Plan

**Status:** Complete
**Date:** 2026-10-19 (planned and implemented 2026-10-19)

---

## Objective

A user can view, create, edit, and delete their income and expense categories through the desktop UI. System-seeded categories are visible and usable but protected from rename and deletion. User-created categories can be freely managed. Deleting a category that has transactions shows a warning that those transactions will become uncategorized. After this sprint, the user has full control over how they organize their transactions by category — all offline, all local.

---

## Backend Contract Reference

This section was produced by directly inspecting the Sprint 3 category implementation (migration `0004_categories.sql`, `src-tauri/src/models/category.rs`, `src-tauri/src/repositories/category.rs`, `src-tauri/src/commands/category.rs`, `src/api/categories.ts`).

### Category entity fields

| Field | Type | Stored as | Notes |
|---|---|---|---|
| `id` | integer | `INTEGER PRIMARY KEY` | Auto-assigned |
| `workspace_id` | integer | `INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE` | Immutable after creation |
| `name` | string | `TEXT NOT NULL` | Max 100 chars (app-layer); trimmed |
| `category_type` | enum | `TEXT NOT NULL CHECK(... IN ('income', 'expense'))` | Immutable after creation |
| `parent_id` | integer, nullable | `INTEGER REFERENCES categories(id) ON DELETE SET NULL` | Must be same workspace |
| `is_system` | boolean | `INTEGER NOT NULL DEFAULT 0` | Only `seed_defaults` sets this to 1 |
| `created_at` | string | `TEXT NOT NULL DEFAULT (datetime('now'))` | Immutable |
| `updated_at` | string | `TEXT NOT NULL DEFAULT (datetime('now'))` | Bumped on update |

**Uniqueness constraint:** `UNIQUE(workspace_id, name, category_type)` — the same name can exist as both an income and expense category, but not twice within the same type in one workspace.

### CRUD contract

| Operation | TS wrapper | Notes |
|---|---|---|
| List | `listCategoriesByWorkspace(workspaceId): Promise<Category[]>` | Returns all categories for the workspace, ordered by `category_type, name`. No pagination (category counts are small). |
| Read | `getCategory(id): Promise<Category>` | Not needed by planned UI (list returns full rows). |
| Create | `createCategory(workspaceId, name, categoryType, parentId?): Promise<Category>` | Validates workspace existence, name length, parent workspace match. Returns `Conflict` on duplicate name+type. |
| Update | `updateCategory(id, name?, parentId?): Promise<Category>` | System categories reject name changes. Returns `Conflict` on duplicate name+type. `category_type` is not updatable. |
| Delete | `deleteCategory(id): Promise<void>` | System categories are rejected. Transactions referencing the category get `category_id = NULL` (FK `ON DELETE SET NULL`). |
| Seed | `seedDefaultCategories(workspaceId): Promise<void>` | Called during workspace creation (already wired in `WorkspaceContext`). Idempotent. |

### System categories (seeded defaults)

4 income: Salary, Freelance, Investments, Other Income.
13 expense: Housing, Transportation, Food & Dining, Utilities, Healthcare, Entertainment, Shopping, Education, Personal Care, Insurance, Savings & Investments, Gifts & Donations, Other Expense.

All have `is_system = true`. Backend enforces: **cannot rename, cannot delete**. These are always present after workspace creation. They have the same `category_type` and `parent_id` capabilities as user categories — the only behavioral difference is the rename/delete restriction.

### Error behavior

Same established pattern: `DomainError` → `CommandError { code, message }` → `parseCommandError`. Relevant error cases:
- `Validation`: empty name, name too long, workspace not found, parent not found, parent in different workspace, system category rename attempt, system category delete attempt
- `Conflict`: duplicate name+type in workspace
- `NotFound`: category ID doesn't exist

### Impact on transactions

Deleting a category sets `category_id = NULL` on all referencing transactions (FK `ON DELETE SET NULL`). This is automatic at the database level — no application code is needed. The UI must warn the user about this before confirming deletion. To show the transaction count, the UI queries `listTransactions({ workspaceId, categoryId })` and reads `total_count` from the result.

### Parent categories

The backend supports `parent_id` for hierarchical categories, but **Sprint 7 defers parent/subcategory UI**. The backend is ready, but no existing category (system or user) uses `parent_id`, and the Transactions UI doesn't group or filter by parent. Implementing hierarchy UI without a clear use case would be premature. The list page and dialogs will not expose parent selection.

---

## Scope

### In Scope

- Categories page replacing the current placeholder
- Two-section layout: Income categories, Expense categories
- Category cards showing name, system/user badge, transaction count
- Create category dialog (name, type selection)
- Edit category dialog (name only; type is immutable; system categories: name field disabled with explanation)
- Delete category with confirmation dialog (user categories only; shows transaction count warning; system categories: delete button hidden or disabled)
- Loading, empty, and error states
- Frontend tests

### Out of Scope

- Parent/subcategory hierarchy UI (backend supports it; UI deferred)
- Category reordering or custom sort
- Category icons or colors
- Merging categories
- Bulk operations
- Category usage statistics or reports

---

## Existing UI Primitives

Available (no new primitives needed):
- `Button`, `Input`, `Select`, `FormField` — form controls
- `Dialog`, `ConfirmDialog` — modal dialogs
- `Card`, `Badge` — display components
- `EmptyState`, `LoadingSpinner` (`PageLoadingState`), `ErrorMessage` (`PageErrorState`) — state indicators
- `parseCommandError` — error handling

---

## Phase Structure

### Phase A: Categories List Page

Replace the placeholder `src/pages/Categories.tsx` with a working categories page.

**Delivers:**
1. Fetch categories via `listCategoriesByWorkspace(currentWorkspaceId)` on mount (same data-loading pattern as Accounts page)
2. Split categories into two sections: **Income** and **Expense** (client-side filter on `category_type`)
3. Each section shows a heading with count (e.g., "Income Categories (4)")
4. Each category rendered as a card/row showing:
   - Name
   - Badge: "System" for `is_system === true`, no badge for user categories
   - Transaction count (fetched via a lightweight query — see implementation note below)
5. "New Category" button in page header, opening create dialog (Phase B)
6. Edit button on each card → edit dialog (Phase C)
7. Delete button on user category cards → delete confirmation (Phase D); hidden on system categories
8. Loading state while fetching
9. Empty state when workspace has no categories (unlikely with system defaults, but handled)
10. Error state on fetch failure with retry

**Transaction count implementation note:** Fetching per-category transaction counts requires one `listTransactions` call per category (reading only `total_count`). For the expected category count (~17 system + a few user = ~20), this is ~20 fast SQLite queries on mount. This is acceptable for Sprint 7. A dedicated backend endpoint (`getCategoryCounts(workspaceId)`) would be more efficient but is not needed yet — optimize only if category counts grow large or the user reports slowness.

**Alternative (simpler, chosen):** Defer transaction counts from Phase A. Show the list without counts first. Add counts in Phase D (delete confirmation) where they're actually needed for the warning message. This avoids the N+1 query on every page load and keeps Phase A focused.

**Exit criteria:**
- Categories page shows income and expense sections with all categories
- System categories display "System" badge
- Loading/empty/error states work
- Page refreshes when workspace changes

### Phase B: Create Category Dialog

**Delivers:**
1. `CreateCategoryDialog` component (pattern: `CreateAccountDialog`)
2. Fields: name (text input), category type (select: Income / Expense)
3. Validation: name required, surfaces backend conflict error ("A [type] category named '[name]' already exists")
4. On success: closes dialog, refreshes category list
5. Accessible: focus management, keyboard navigation, escape to close

**Exit criteria:**
- User can create income and expense categories
- Duplicate name+type shows conflict error
- Empty name shows validation error
- Dialog closes on success and list updates

### Phase C: Edit Category Dialog

**Delivers:**
1. `EditCategoryDialog` component (pattern: `EditAccountDialog`)
2. Pre-populated with current category name
3. For system categories: name input is disabled with explanatory text ("System categories cannot be renamed")
4. For user categories: name is editable
5. Category type shown as read-only text (not editable — backend doesn't support type changes)
6. Validation: same as create (name required, conflict detection)
7. On success: closes dialog, refreshes category list

**Exit criteria:**
- User categories can be renamed
- System categories show disabled name field with explanation
- Conflict error surfaces on duplicate name
- Dialog closes on success and list updates

### Phase D: Delete Category with Confirmation

**Delivers:**
1. Delete button visible only on user categories (system categories: no delete affordance)
2. Clicking delete opens a `ConfirmDialog` with:
   - Category name
   - Transaction count for this category (fetched on dialog open via `listTransactions({ workspaceId, categoryId, limit: 1 })` reading `total_count`)
   - Warning text: "Deleting this category will uncategorize {N} transaction(s). This cannot be undone."
   - If 0 transactions: simpler message without the uncategorize warning
3. Confirm triggers `deleteCategory(id)`, refreshes list
4. Error handling for unexpected failures

**Exit criteria:**
- User categories can be deleted with confirmation
- Transaction count shown in confirmation dialog
- System categories have no delete button
- List refreshes after deletion

### Phase E: Tests and Documentation

**Delivers:**
1. Frontend tests for:
   - Categories page (list rendering, income/expense sections, loading/empty/error states, system badge)
   - CreateCategoryDialog (form submission, validation, conflict error, close on success)
   - EditCategoryDialog (pre-population, system category disabled state, rename, conflict)
   - Delete flow (confirmation dialog, transaction count display, delete execution)
2. Update `TASKS.md` — mark Sprint 7 phases complete
3. Update `CHANGELOG.md` — Sprint 7 entry
4. Update `README.md` — project status
5. Update `docs/milestones.md` — check Sprint 7 exit criteria
6. Create closeout section in this file

**Exit criteria:**
- All new frontend tests pass
- All existing tests continue to pass (310 frontend, 104+ Rust)
- `cargo test`, `npm test`, `npm run lint`, `npm run format:check`, `npm run build` all pass
- Documentation updated

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| N+1 query for transaction counts on list page | Deferred to delete dialog only (Phase D). If needed on list later, add a batch backend endpoint. |
| Category type immutability surprises users | Show type as read-only text in edit dialog with clear labeling. |
| Users confused about system vs. user categories | "System" badge on system categories; disabled edit/no delete affordances with explanatory text. |
| Deleting a category with many transactions | Confirmation dialog shows exact count; warn explicitly about uncategorization. |

---

## Dependencies

- Sprint 3 (Core Domain Entities) — category backend: **complete**
- Sprint 4 (Transaction Engine) — `listTransactions` with `categoryId` filter for transaction count: **complete**
- Sprint 5 (Accounts UI) — `WorkspaceContext`, UI primitives, page patterns: **complete**
- Sprint 6 (Transactions UI) — no dependency (Categories UI is independent of Transactions UI)

---

## Backend Changes

**None.** The category backend (migration, model, repository, commands, TypeScript wrappers) is fully implemented and tested from Sprint 3. Sprint 7 is a frontend-only sprint.

---

## Sprint 7 Closeout

**Completed:** 2026-10-19

### Delivered

All five phases (A through E) delivered as planned:

| Phase | Description | Status |
|---|---|---|
| A | Categories list page with income/expense sections, system badges, loading/empty/error states | Complete |
| B | Create category dialog with name/type fields, validation, conflict handling | Complete |
| C | Edit category dialog (system: name disabled; user: rename; type read-only) | Complete |
| D | Delete category with confirmation, transaction count warning, system protection | Complete |
| E | 27 new frontend tests, documentation updates | Complete |

### Files Created

- `src/pages/Categories.tsx` — full categories page (replaced placeholder)
- `src/pages/Categories.test.tsx` — 27 tests
- `src/components/categories/CreateCategoryDialog.tsx` — create dialog
- `src/components/categories/EditCategoryDialog.tsx` — edit dialog

### Test Summary

- 337 frontend tests across 18 test files, all passing
- 104+ Rust tests, all passing
- Lint, format, build all clean

### Deferred Items

- **Parent/subcategory hierarchy UI** — backend supports `parent_id` but no UI exposes it; no existing category uses `parent_id`
- **Transaction counts on list page** — counts are fetched only in the delete confirmation dialog to avoid N+1 queries on every page load
- **Category reordering, icons, colors, merging** — out of scope per plan

### What's Next

Sprint 8 (Dashboard) is the last sprint in Milestone 3. See `TASKS.md` for scope.
