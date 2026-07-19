# Sprint 5: Personal Finance UI — Implementation Plan

**Status:** Complete — Accounts UI (Phases A–B, minus permanent deletion)
**Date:** 2026-07-17 (closed 2026-07-18)

---

## Sprint 5 Closeout (2026-07-18)

This section is the authoritative record of what Sprint 5 actually delivered. It supersedes the scope described in the rest of this document (which originally planned Categories UI, Transactions UI, and a Dashboard as further phases of "Sprint 5" — see "Scope Change" below). The remaining sections of this file (Objective, Scope, Implementation Phases, Acceptance Criteria, etc.) are retained as the historical planning record and per-phase implementation notes, and are not rewritten.

### Objective (as delivered)

A user can manage the complete reversible lifecycle of locally stored financial accounts through the desktop UI: select or create a workspace, view all accounts with live balances, create new accounts, edit an account's name and institution, and archive or restore an account — all backed by local SQLite persistence that survives application restart, with no network dependency.

### Completed Scope

- **Workspace selection and initialization** — `WorkspaceContext` fetches workspaces on launch, prompts first-launch creation via `FirstWorkspaceSetup`, persists the active selection to `localStorage`, and seeds default categories on first workspace creation.
- **Account list** (`src/pages/Accounts.tsx`) — fetches via `listAccountsByWorkspace`, renders a semantic table (Account, Type, Balance, Status, Actions columns), sorted active-first then alphabetically within each group (client-side, since the backend does not guarantee ordering).
- **Account summaries** — three summary cards: Total Balance (active accounts only), Active Accounts count, Archived Accounts count, all derived reactively from the fetched account list.
- **Account creation** (`CreateAccountDialog`) — name (required), account type (required select), institution (optional); validates and trims client-side; refetches and closes on success.
- **Account editing** (`EditAccountDialog`) — name and institution are editable; account type is displayed read-only (see notes below); reopening for a different account never leaks stale form state.
- **Account archiving** — requires explicit confirmation via `ConfirmDialog`, naming the account and stating the action is reversible; non-destructive.
- **Account restoration** — executes directly with no confirmation (reversible, immediate); per-account in-flight tracking so restoring one account never disables another's control.
- **Persistence** — all mutations go through Rust/SQLite via typed Tauri commands; the frontend never touches SQLite directly; data survives application restart (verified by existing Rust integration tests; interactive restart verification could not be performed manually — see Lessons Learned).
- **Validation** — client-side validation mirrors backend rules (required/non-whitespace name, required type) without duplicating backend-only constraints (e.g., max length); backend validation remains authoritative.
- **Sanitized error handling** — all API failures are parsed via `parseCommandError` and displayed as plain-language messages; no Rust, SQLite, or Tauri internals are ever exposed to the user (verified by explicit tests in every mutation flow).
- **Accessibility** — every row action has an explicit accessible name (`aria-label`), dialogs have accessible titles and labeled fields, destructive-adjacent confirmation defaults focus to the safe Cancel action, loading/disabled state uses real semantics (not color alone), and focus returns to the triggering control after a dialog closes (via the native `<dialog>` element's built-in behavior).
- **Test coverage** — 111 frontend tests (Vitest + Testing Library) and 104 Rust tests (unchanged since Sprint 4 — no backend code was added during Sprint 5), covering every mutation's success, failure, and duplicate-submission-prevention paths, plus ordering, summary-count, and cross-account state-isolation behavior.

### Explicit Notes

- **Account deletion was not implemented.** No Delete action, confirmation dialog, or cascade-warning logic exists anywhere in the UI. This was verified by a dedicated test asserting no Delete action ever renders. It remains deferred to a future phase (see "What Sprint 5 Does Not Include" below).
- **New accounts currently begin with a zero balance** because `CreateAccountInput` (Rust and TypeScript) has no `balance` field — the repository sets `balance = 0` unconditionally on insert. The create form has no opening-balance field as a result; this was a discovery from inspecting the backend contract, not a UI omission.
- **Account type is not editable** because `UpdateAccountInput` (Rust and TypeScript) has no `account_type` field — only `name`, `institution_name`, and `is_active` can be changed after creation. The edit dialog displays the account type read-only, with a caption explaining it cannot be changed, rather than exposing an editable control that would silently no-op.
- **Institution clearing uses the existing explicit update contract.** The account update repository treats an omitted field as "preserve the existing value," not "clear it" (unlike create). The edit dialog therefore always sends the trimmed institution value as an explicit string (including `""` when cleared), never `undefined`, so clearing the field actually clears it.
- **Archived accounts remain visible** in the table (dimmed, badge-marked "Archived") rather than hidden — `list_accounts_by_workspace` returns them unfiltered, and no hide-archived toggle exists yet.
- **Account row actions remain explicit text actions** (Edit / Archive / Restore) rather than an icon-only or overflow ("⋯") menu, at the current product scale of three possible actions per row.
- **No generic account-form or table abstraction was introduced prematurely.** `CreateAccountDialog` and `EditAccountDialog` are separate, small, colocated components with genuinely different field sets and validation rules (see notes above) rather than a shared `AccountForm`; the accounts table is plain semantic HTML rather than a generic `Table` component (see "Documentation Conflicts" below — a `Table.tsx` primitive was never actually built, despite being listed in the Phase A notes).

### Out of Scope (confirmed)

Sprint 5 did **not** include: permanent account deletion, transaction UI, balance adjustments, reconciliation, imports, Plaid, budgets, reports, goals, or dashboard financial metrics. No code for any of these exists in the current tree.

### Review Notes (product review conclusions)

- The Accounts page looks appropriate for commercial desktop finance software — calm, compact, and information-dense without feeling cluttered.
- Current spacing and density are acceptable as-is.
- Summary cards are useful and should remain in their current form.
- Explicit row actions (not an overflow menu) are preferred at the current product scale (up to three actions per row).
- No Create/Edit dialog abstraction is warranted yet — the two dialogs' field sets have already diverged (account type is create-only) in a way that would make a shared abstraction more complex than the duplication it would remove.
- No blocking technical debt was identified.
- No additional polish phase is required before Sprint 6.

### Lessons Learned

- **Small implementation phases produced cleaner review checkpoints.** Splitting Accounts UI into B1 (read-only list), B2 (create), B3 (edit), and B4 (archive/restore) — each independently committed and verified — kept each review focused on one workflow's correctness rather than a large, hard-to-audit diff.
- **Manual native-app verification remains necessary because Claude cannot interact with the Tauri window.** Every phase's automated verification (tests, lint, build, `cargo check`/`test`, and a clean `tauri dev` launch-and-log check) was completed, but interactive click-through verification and restart-persistence checks in the actual native window were not performed in any phase — no tooling exists in this environment to drive a native Tauri/WebView window, unlike the Chrome-only browser automation tools available for web targets. This is a standing, recurring gap across every phase's review report and should be planned for explicitly (a human manual pass) before any phase is considered fully done in practice.
- **Repository-cleanliness checks (verifying branch, commit, and clean working tree before starting) prevented unrelated work from entering later commits.** Every phase began with `git status`/`git log` verification per the operating instructions, which caught the correct starting state each time and kept each commit scoped to exactly one phase's changes.
- **Backend contracts must be inspected before designing forms.** Phase B3 discovered that `UpdateAccountInput` has no `account_type` field and that the update repository's merge semantics differ from create's (omission preserves rather than clears). Both would have produced a broken or silently-wrong UI if the form had been designed from the plan's speculative field list instead of the actual Rust/TypeScript contract.
- **Shared-component accessibility defects should be fixed only when concrete use cases reveal them.** The `Dialog` component's hardcoded title `id` was invisible for three phases (only one dialog ever existed on the page at a time) and only became a real, concrete defect in Phase B3 when a second simultaneous dialog instance was introduced. It was fixed at that point — not speculatively hardened in Phase A against a scenario that didn't yet exist.

### Scope Change and Documentation Conflict — Resolved 2026-07-19

This document, as originally written, planned "Sprint 5: Personal Finance UI" to include Categories UI (Phase C), Transactions UI (Phase D), a Dashboard (Phase E), and a cross-cutting polish phase (Phase F) — see those sections below, which were never implemented. In practice, only Phase A (Foundation) and Phase B (Accounts UI, minus deletion) were built across four independently reviewed and committed sub-phases (B1–B4). This closeout formally narrows "Sprint 5, as delivered" to that actual scope.

This created a conflict with `docs/milestones.md` (v2.1 at the time), the authoritative roadmap document, which still defined:
- **Sprint 5: Personal Finance UI** — Accounts + Categories + Transactions + Dashboard (the original, broader scope)
- **Sprint 6: Budgets, Goals, and Reports**
- **Sprint 7: Security, Onboarding, and Business Finance**

`TASKS.md`'s Milestone 3 breakdown mirrored this same structure. Transactions UI planning had continued in a new document, `docs/sprint-notes/sprint-6.md`, titled "Sprint 6: Transactions UI," which directly conflicted with `docs/milestones.md`'s then-existing definition of Sprint 6 as "Budgets, Goals, and Reports." Categories UI and a Dashboard (originally Sprint 5 Phases C and E) were not addressed by `sprint-6.md` either, and remained unscheduled.

**Resolution:** The Product Owner resolved this conflict on 2026-07-19. Sprint 5 is confirmed as Accounts UI (complete, as delivered above). **Sprint 6 is Transactions UI** (ratifying `docs/sprint-notes/sprint-6.md` as the actual Sprint 6 plan). **Sprint 7 is Categories UI.** **Sprint 8 is Dashboard.** Budgets, Goals, and Reports — previously bundled as a single "Sprint 6" — move out of Milestone 3 entirely and will be replanned later as separate product domains, rather than as one immediate sprint. Security, Onboarding, and Business Finance content (previously Sprint 7) also moves out of Milestone 3's numbered sprints, since Sprint 7 is now Categories UI. See `docs/milestones.md`'s "Future Milestones (Unscheduled)" section, `TASKS.md`, and `docs/business/ROADMAP.md` for the reconciled, authoritative sprint sequence.

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

#### Phase A Implementation Notes (2026-07-16)

**Files created:**
- `src/contexts/workspaceContextDef.ts` — context type and context object (no components, satisfies react-refresh lint rule)
- `src/contexts/WorkspaceContext.tsx` — `WorkspaceProvider` only
- `src/hooks/useWorkspace.ts` — typed convenience hook
- `src/components/workspace/FirstWorkspaceSetup.tsx` — focused first-workspace creation screen
- `src/components/ui/Button.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx`, `FormField.tsx`
- `src/components/ui/Dialog.tsx`, `ConfirmDialog.tsx`
- `src/components/ui/EmptyState.tsx`, `LoadingSpinner.tsx`, `ErrorMessage.tsx`
- `src/components/ui/Card.tsx`, `Badge.tsx`, `Table.tsx`, `AmountInput.tsx`, `DateInput.tsx`
- `src/pages/Categories.tsx` — placeholder
- Test files: `WorkspaceContext.test.tsx`, `Button.test.tsx`, `Dialog.test.tsx`, `ConfirmDialog.test.tsx`, `EmptyState.test.tsx`

**Files modified:**
- `src/App.tsx` — WorkspaceProvider wrapper, AppRouter component, Categories route
- `src/components/layout/Sidebar.tsx` — Categories nav, workspace indicator, accessible nav
- `src/components/layout/AppShell.tsx` — Categories page title
- `src/index.css` — dialog backdrop and border reset

**Assumptions documented:**
- Workspace selection is persisted to `localStorage` (key: `ledger_current_workspace_id`). No database schema change needed. This is non-invasive and survives app restarts. If multi-device sync is added later (Milestone 5), this preference would need to be re-evaluated.
- `createInitialWorkspace` defaults to type `"personal"` and currency `"USD"`. These can be made configurable in the Settings page (Phase F or later).
- Workspace selector (for multiple workspaces) is not implemented in Phase A — with one workspace, it's not needed. If multiple workspaces are common, a selector dropdown can be added to the sidebar header in Phase F.

**Technical decisions:**
- Used native `<dialog>` element for `Dialog` component: handles focus trapping, modal backdrop, and cancel event (Escape). Added document-level keydown fallback for jsdom test compatibility.
- Context definition separated from provider into `workspaceContextDef.ts` to satisfy `react-refresh/only-export-components` ESLint rule (react-hooks v7).
- WorkspaceContext effect uses Promise chains (not async/await) to avoid `react-hooks/set-state-in-effect` lint error (setState calls are in `.then()`/`.catch()`/`.finally()` callbacks, not synchronously in the effect body).
- Ref updated via dedicated `useEffect` (no deps) rather than during render, per `react-hooks/refs` rule.

**Test results:** 42/42 tests pass. `npm run lint` clean. `npm run build` succeeds. `cargo check` and 104 Rust tests pass (unchanged).

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

7. **Archive/Restore**
   - Toggle via `updateAccount(id, undefined, undefined, !isActive)`
   - Inactive accounts shown dimmed, marked "Archived", with a Restore action
   - Archive **requires explicit confirmation** (superseded during Phase B4 implementation — the original "No confirmation needed for archive" note below was overridden by the Phase B4 task's explicit requirement that archive, unlike restore, requires a confirmation dialog naming the account, since it removes the account from active use even though it remains non-destructive and reversible)
   - Restore requires no confirmation (reversible, non-destructive, immediate)

8. **Delete Account**
   - Confirmation dialog with explicit cascade warning:
     - If account has transactions: "This will permanently delete [account name] and all [N] transactions. This cannot be undone. Consider archiving instead."
     - Include an "Archive Instead" button as alternative
     - If account has no transactions: "Delete [account name]? This cannot be undone."
   - To get transaction count: call `listTransactions({ workspace_id, account_id, limit: 1 })` and read `total_count`
   - On confirm: call `deleteAccount(id)`, refetch list

**Verification:** User can create, view, edit, archive/unarchive, and delete accounts. Balances display correctly. Cascade warning appears for accounts with transactions.

#### Phase B1 Implementation Notes (2026-07-16)

Read-only accounts list (item 4) implemented and committed. See commit `df416d6`.

#### Phase B2 Implementation Notes (2026-07-17)

Create Account workflow (item 5) implemented. Items 6–8 (edit, archive/unarchive, delete) are **not** implemented in this phase — deferred to Phase B3.

**Files created:**
- `src/lib/accountTypes.ts` — shared `ACCOUNT_TYPE_LABELS`, `formatAccountType`, `ACCOUNT_TYPE_OPTIONS`, used by both the accounts table and the create dialog
- `src/components/accounts/CreateAccountDialog.tsx` — colocated create-account dialog
- `src/components/accounts/CreateAccountDialog.test.tsx`

**Files modified:**
- `src/pages/Accounts.tsx` — header "New Account" action, empty-state action and production copy, dialog wiring, background-refresh loading state that avoids replacing an already-rendered table
- `src/pages/Accounts.test.tsx` — updated copy assertions, added header/empty-state/create-workflow tests

**Backend Change Rule check:** No backend gap encountered. `CreateAccountInput` (Rust and TypeScript) has no `balance` field — new accounts always start at `balance = 0`, set by the repository, not the caller. Per the plan ("If opening balance is not supported by the create API, omit the field rather than inventing backend behavior"), the create form has no balance/opening-balance field. `currency` is accepted by the API but always passed as `undefined` from the form (no currency selector), so the backend defaults it to the workspace's currency — this matches the plan's "optional, defaults to workspace currency" without adding a selector control.

**Fields implemented:** Account Name (required), Account Type (required select, options from `ACCOUNT_TYPE_OPTIONS`), Institution (optional).

**Validation:** Name required and not whitespace-only (trimmed before validation and submission); account type required. Mirrors backend rules (`AccountRepository::create` rejects empty/whitespace-only names) without duplicating backend length limits.

**Monetary parsing:** Not applicable — no balance field exists on the create form (see Backend Change Rule check above).

**Post-create refresh:** Reuses the existing B1 retry mechanism (`retryToken` state bump) rather than a new fetch abstraction. The full-page loading spinner is now gated on `loading && accounts.length === 0`, so a post-create refresh never replaces an already-visible table with a spinner.

**Dialog defect found and fixed (in this component, not in the shared `Dialog`):** Native `<dialog>` `showModal()` focuses the first focusable descendant, which was the header's close (×) button, not the name field. Fixed with a small effect that focuses the name input by id after open — no change to the shared `Dialog` component was needed.

**Verification:** `npm run test` (71/71 passing, 16 new), `npm run lint`, `npm run format:check`, `npm run build`, `cargo check`, `cargo test` (104/104 passing, unchanged) all pass. `npm run dev` (`tauri dev`) compiles and launches the desktop binary cleanly with no runtime errors in the log. Interactive manual verification (clicking through the create-account flow in the native window, confirming persistence across restart) was **not** performed — no tooling is available to drive a native Tauri/WebView window (unlike the Chrome-only browser automation tools). This is a known verification gap; see the Phase B2 review report for details.

#### Phase B3 Implementation Notes (2026-07-17)

Edit Account workflow (item 6) implemented. Items 7–8 (archive/unarchive, delete) are **not** implemented in this phase — deferred to Phase B4+.

**Files created:**
- `src/components/accounts/EditAccountDialog.tsx` — colocated edit-account dialog
- `src/components/accounts/EditAccountDialog.test.tsx`

**Files modified:**
- `src/pages/Accounts.tsx` — Actions column with a per-row "Edit [name]" button, `editingAccount`/`showEditDialog` state, dialog wiring
- `src/pages/Accounts.test.tsx` — new Actions-column and edit-workflow tests; scoped several existing/new queries to the specific dialog (see Dialog defect below)
- `src/components/ui/Dialog.tsx` — unique title id via `useId()` (see Dialog defect below)

**Backend Change Rule check:** No backend gap encountered, but a genuine contract mismatch with the plan's speculative field list was found during inspection. `UpdateAccountInput` (Rust and TypeScript) has fields `name?`, `institution_name?`, `is_active?` only — **no `account_type` field exists**. The `update_account` Tauri command and the `updateAccount` TS wrapper (`updateAccount(id, name?, institutionName?, isActive?)` — positional, not an options object) confirm this. Per "do not expose fields unsupported by the update API," the edit dialog displays Account Type as a disabled, non-submitted field (populated from the account, labeled "Account type cannot be changed after creation") rather than as an editable control that would silently no-op. This matches the plan's own Phase B item 6, which lists only name and institution as pre-populated/editable fields.

**Update repository merge semantics (a second finding from inspection):** `AccountRepository::update` treats an omitted (`None`) field as "preserve the existing stored value," not "clear it" — unlike `create`, which has no such merge step. Concretely: `institution_name: None => existing.institution_name`. This means the create dialog's pattern of mapping a blank field to `undefined` would be wrong for edit — sending `undefined` for a cleared institution field would silently leave the old value in place. The edit dialog therefore always sends the trimmed institution string explicitly (including `""` when the user clears it), never `undefined`, so clearing actually clears. One residual nuance: the repository stores the cleared value as a literal empty string, not SQL `NULL` (there is no way through the current API to null out an already-set `institution_name`). This is not a functional problem — the table's display check (`account.institution_name && (...)`) treats `""` and `null` identically — so no backend change was made per the Backend Change Rule.

**Fields implemented:** Account Name (required, editable), Account Type (read-only display, not submitted — see above), Institution (optional, editable).

**Validation:** Name required and not whitespace-only (trimmed before validation and submission), mirroring `AccountRepository::update`'s own trim-and-reject-empty rule. Account Type has no active validation since it is fixed and always populated from the existing account.

**Dialog defect found and fixed (in the shared `Dialog` component, not this feature's own component):** `Dialog.tsx` hardcoded `id="dialog-title"` on its heading and referenced it via a matching hardcoded `aria-labelledby`. This was invisible while only one `Dialog` instance ever existed on a page (Sprint 5 Phase A/B1/B2). With the Edit dialog added, the Accounts page now always mounts two `Dialog` instances at once (Create and Edit, each individually toggling its own `open` prop, matching the existing B2 pattern) — producing two elements with the same `id` and an ambiguous `aria-labelledby` target, an invalid-HTML and real accessibility defect once two dialogs coexist. Fixed by generating the title id via `useId()` per `Dialog` instance. This also incidentally surfaced that this project's jsdom/Testing Library test environment does not treat a closed (no `open` attribute) native `<dialog>`'s contents as excluded from text/label queries (even though real Chromium hides them via `display: none`), so several page-level tests needed their queries scoped to the specific open dialog (via `within(screen.getByRole("dialog", { name: ... }))`) to avoid matching the other, closed dialog's identically-labeled fields. One pre-existing Phase B2 test (`displays human-readable account types and formatted balances`) was already coincidentally relying on this same ambiguity resolving in its favor due to assertion timing; it was fixed to scope its query to the table row rather than weakened.

**Verification:** `npm run test` (92/92 passing, 21 new), `npm run lint`, `npm run format:check`, `npm run build`, `cargo check`, `cargo test` (104/104 passing, unchanged — confirms no backend code was touched) all pass. `npm run dev` (`tauri dev`) compiles and launches the desktop binary cleanly with no runtime errors in the log. As with Phase B2, interactive manual verification (clicking through the edit-account flow in the native window, confirming persistence across restart) was **not** performed — no tooling is available to drive a native Tauri/WebView window. This is a known, recurring verification gap; see the Phase B3 review report for details.

#### Phase B4 Implementation Notes (2026-07-17)

Archive/Unarchive lifecycle (item 7) implemented as **Archive and Restore**. Item 8 (Delete Account with cascade warning) is **not** implemented in this phase and remains deferred — no Delete action, confirmation, or cascade-count logic exists anywhere in the UI yet.

**Files modified:**
- `src/pages/Accounts.tsx` — Archive/Restore row actions (conditionally rendered based on `is_active`), archive confirmation state, restore per-account in-flight state, page-level restore error display
- `src/pages/Accounts.test.tsx` — 24 new tests: action visibility, archive confirmation flow, restore flow, ordering transitions, summary-count updates
- `src/components/ui/ConfirmDialog.tsx` — added an optional `error?: string` prop (see below)
- `src/components/ui/ConfirmDialog.test.tsx` — 2 new tests for the error prop

**Backend Change Rule check:** No backend gap encountered, and this was the expected outcome per this plan's own Domain Behavior Reference (see "Account Archive (is_active)" above): `UpdateAccountInput` already accepts `is_active: Option<bool>`, `update_account` already passes it through, and the TS `updateAccount` wrapper already accepts `isActive?: boolean`. No dedicated archive/restore commands were created — both actions call the existing `updateAccount(id, undefined, undefined, isActive)`, passing `undefined` for name and institution so the repository's preserve-on-omit merge semantics (discovered in Phase B3) leave those fields untouched. `list_accounts_by_workspace` has no `is_active` filter, so archived accounts continue to be returned and rendered (dimmed, badge-marked) exactly as B1 already implemented.

**Archive confirmation:** Uses the shared `ConfirmDialog` with title "Archive account?", confirm label "Archive Account", and message copy naming the account and explicitly stating history is preserved and the account is restorable — no alarmist/destructive language. `ConfirmDialog`'s existing `loading` prop already disabled both buttons and set `autoFocus` on Cancel, satisfying "cancel is the safe default" and "cannot be submitted twice" without new focus code. A defensive in-handler guard (`if (archiving || !archiveTarget) return`) backs this up.

**`ConfirmDialog` extended (not a defect, a genuine missing capability needed here):** Before this phase, `ConfirmDialog` had zero real consumers, so there was no way to surface a failed-confirm error inside the dialog (a hard requirement: "API errors appear inside the confirmation dialog," "failed archive leaves the dialog open"). Added an optional `error?: string` prop rendering the existing shared `ErrorMessage` component beneath the message text. This is additive and backward compatible — no existing usage or test needed to change.

**Restore behavior:** Executes directly on click, no confirmation, per the plan. In-flight state is tracked as `restoringIds: Set<number>` (not a single id), specifically so that restoring one archived account never disables another account's Restore button — satisfying "do not disable unrelated rows." Restore failures show a sanitized page-level `ErrorMessage` above the table (not `PageErrorState`, which would replace the whole page) and clear on the next restore attempt or success.

**Mutation-state design:** Five explicit `useState` values on the `Accounts` page (`archiveTarget`, `archiving`, `archiveError`, `restoringIds`, `restoreError`) — no generic mutation abstraction, no global state, no new dependencies, matching every other B1–B3 mutation (create, edit) already on this page.

**Refresh and ordering:** Both actions call the existing `retryToken` refetch mechanism (no manual row mutation) — canonical backend data always wins. The existing B1 `sortAccounts` (active-first, then alphabetical) is untouched and correctly moves an archived account into the archived group, or a restored account back into the active group, purely as a side effect of the refetched `is_active` value — no ordering logic changes were needed.

**Verification:** `npm run test` (111/111 passing, 19 new in `Accounts.test.tsx` archive/restore suites + 5 more across visibility/no-delete tests + 2 in `ConfirmDialog.test.tsx`), `npm run lint`, `npm run format:check`, `npm run build`, `cargo check`, `cargo test` (104/104 passing, unchanged — confirms no backend code was touched) all pass. `npm run dev` (`tauri dev`) compiles and launches the desktop binary cleanly with no runtime errors in the log. As with Phase B2/B3, interactive manual verification (clicking through archive/restore in the native window, confirming state survives a restart) was **not** performed — no tooling is available to drive a native Tauri/WebView window. This is a known, recurring verification gap; see the Phase B4 review report for details.

---

### Phase C: Categories UI

> **Not implemented under Sprint 5.** See "Scope Change and Documentation Conflict" above — remains unscheduled.

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

> **Not implemented under Sprint 5.** Superseded by `docs/sprint-notes/sprint-6.md` — see "Scope Change and Documentation Conflict" above for the numbering conflict this creates with `docs/milestones.md`.

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

> **Not implemented under Sprint 5.** See "Scope Change and Documentation Conflict" above — remains unscheduled.

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

> **Superseded by the "Sprint 5 Closeout" section above**, which covers the documentation-update items (30) for the scope actually delivered. The remaining items (26–29, 31) described tests and manual verification for Categories/Transactions/Dashboard, which were not built — see "Scope Change and Documentation Conflict" above.

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
6. User can archive an account (set `is_active = false`) — non-destructive, reversible — **complete (Phase B4)**
7. User can unarchive (restore) an account (set `is_active = true`) — **complete (Phase B4)**
8. User can delete an account with explicit cascade warning showing transaction count — **not implemented; deferred beyond Phase B4**
9. Account deletion confirmation offers "Archive Instead" as an alternative — **not implemented; deferred beyond Phase B4**
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
