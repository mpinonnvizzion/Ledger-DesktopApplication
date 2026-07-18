# Ledger Desktop — Tasks and Sprint Tracking

**Milestone Roadmap:** [docs/milestones.md](docs/milestones.md)

---

## Milestone 1: Application Foundation (Complete)

Covers Sprint 0 and Sprint 1. See [milestone details](docs/milestones.md#milestone-1-application-foundation).

### Phase -1: Business and Product Design (Completed)

All Phase -1 documents are complete and serve as the source of truth for product direction.

- [x] Vision document (`docs/business/VISION.md`)
- [x] Target Customer document (`docs/business/TARGET_CUSTOMER.md`)
- [x] Business Model document (`docs/business/BUSINESS_MODEL.md`)
- [x] Product Strategy document (`docs/business/PRODUCT_STRATEGY.md`)
- [x] Competitor Analysis document (`docs/business/COMPETITOR_ANALYSIS.md`)
- [x] Roadmap document (`docs/business/ROADMAP.md`)
- [x] Product Guardrails document (`docs/business/PRODUCT_GUARDRAILS.md`)
- [x] Pricing and Packaging document (`docs/business/PRICING_AND_PACKAGING.md`)
- [x] Licensing and Activation document (`docs/business/LICENSING_AND_ACTIVATION.md`)
- [x] Release Strategy document (`docs/business/RELEASE_STRATEGY.md`)
- [x] Product Requirements Document (`docs/product/PRODUCT_REQUIREMENTS.md`)
- [x] Ledger v3 architecture reference (`docs/reference/Ledger_v3_Desktop_Architecture.docx`)

### Sprint 0: Documentation and Architecture Foundation (Completed)

**Objective:** Prepare the repository for disciplined product development. Documentation only — no application code.

- [x] Root documents (README, PROJECT, ARCHITECTURE, TASKS, CLAUDE, CHANGELOG)
- [x] Folder structure (docs/adr, docs/specifications, docs/sprint-notes)
- [x] 7 Architecture Decision Records (ADR 0001–0007)
- [x] 7 Specification documents
- [x] Sprint 0 notes
- [x] Business document filename normalization and UTF-8 encoding fix

### Sprint 1: Project Foundation (Completed)

**Objective:** Establish the desktop application foundation. After Sprint 1, a developer can launch the Tauri desktop window, see a React frontend rendered inside it, navigate between placeholder pages, and invoke a Rust command from the frontend.

**Implementation Plan:** [docs/sprint-notes/sprint-1.md](docs/sprint-notes/sprint-1.md)

### Phase A: Project Bootstrap
- [x] Initialize Tauri 2 project with React + TypeScript + Vite
- [x] Configure `tauri.conf.json` (app name, bundle ID, window size)
- [x] Verify bare Tauri window opens with default content
- [x] Clean boilerplate, set up blank `App.tsx`

### Phase B: Frontend Foundation
- [x] Install and configure Tailwind CSS v4
- [x] Define initial design tokens (colors, font stack)
- [x] Set up TypeScript path aliases (`@/components`, `@/pages`, `@/lib`)
- [x] Create folder structure (`src/api/`, `src/components/`, `src/pages/`, `src/hooks/`, `src/lib/`)
- [x] Install React Router with hash-based routing
- [x] Create four placeholder pages (Dashboard, Accounts, Transactions, Settings)
- [x] Build app shell layout (sidebar navigation + header + content area)
- [x] Wire sidebar navigation to routes

### Phase C: Rust Command Boundary
- [x] Create `src-tauri/src/commands/` directory
- [x] Implement `greet` Tauri command in Rust
- [x] Register command in `lib.rs`
- [x] Create typed `src/api/client.ts` invoke wrapper
- [x] Call greet from Settings page and display result

### Phase D: Developer Tooling
- [x] Install and configure ESLint (TypeScript + React)
- [x] Install and configure Prettier
- [x] Resolve ESLint/Prettier conflicts (`eslint-config-prettier`)
- [x] Configure `rustfmt.toml` in `src-tauri/`
- [x] Add npm scripts (dev, build, lint, lint:fix, format, format:check, test, test:watch)

### Phase E: Testing Foundation
- [x] Install and configure Vitest for frontend
- [x] Write one frontend test (component render or utility)
- [x] Write one Rust test (greet command logic)
- [x] Verify all test commands pass

### Phase F: Finalization
- [x] Update `.gitignore` for full project
- [x] Run full verification (dev, build, lint, format:check, test, cargo test)
- [x] Update TASKS.md, CHANGELOG.md, ARCHITECTURE.md, README.md
- [x] Finalize sprint-1 notes

### Out of Scope
- Account/transaction/category management (Sprint 2-3)
- SQLite database setup or schema (Sprint 2)
- Reports, budgets, goals (Sprint 5)
- Onboarding, app lock, authentication (Sprint 6)
- Invoicing, clients, vendors (Sprint 7)
- Licensing, Stripe payments (Sprint 8)
- Auto-updater, code signing, installers (Sprint 9)
- Plaid bank sync (Sprint 10)
- Cloud services of any kind

**Exit Criteria:** The app launches locally, the desktop shell opens, the frontend renders inside Tauri with sidebar navigation to four placeholder pages, a Rust command is callable from the frontend, linting/formatting/tests pass, and the development workflow is repeatable.

---

## Milestone 2: Local Data Platform (Complete)

Covers Sprints 2, 3, 4. See [milestone details](docs/milestones.md#milestone-2-local-data-platform).

### Architecture Phase 1: Local Data Platform Documentation (Complete)

**Objective:** Create implementation-ready architecture documentation for Sprints 2–4.

**Architecture Documents:** [docs/architecture/](docs/architecture/)

- [x] Database architecture (`docs/architecture/database.md`)
- [x] Repository architecture (`docs/architecture/repositories.md`)
- [x] Tauri command architecture (`docs/architecture/tauri-commands.md`)
- [x] State management architecture (`docs/architecture/state-management.md`)
- [x] Folder structure architecture (`docs/architecture/folder-structure.md`)
- [x] Error handling architecture (`docs/architecture/error-handling.md`)
- [x] Backup and restore architecture (`docs/architecture/backup-and-restore.md`)
- [x] Updated ARCHITECTURE.md, PROJECT.md, TASKS.md, CHANGELOG.md

### Sprint 2: Database Foundation (Complete)

**Objective:** Implement the local database foundation. After Sprint 2, the application creates and manages a local SQLite database with WAL mode, foreign key enforcement, and a forward-only migration system.

**Implementation Plan:** [docs/sprint-notes/sprint-2.md](docs/sprint-notes/sprint-2.md)
**Architecture Guide:** [docs/architecture/database.md](docs/architecture/database.md)

#### Phase A: SQLite Dependency and Project Organization
- [x] Add `rusqlite` crate with `bundled` feature
- [x] Create `src-tauri/src/db/` module (connection.rs, migration.rs)
- [x] Create `src-tauri/src/error.rs` (DomainError, CommandError)
- [x] Create `src-tauri/src/state.rs` (AppState)
- [x] Create `src-tauri/migrations/` directory
- [x] Update `lib.rs` module declarations

#### Phase B: Database Service and Connection Management
- [x] Implement connection open with directory creation
- [x] Configure WAL mode, foreign keys, busy timeout
- [x] Implement WAL checkpoint utility (backup foundation)
- [x] Implement error types and conversions
- [x] Register AppState as Tauri managed state
- [x] Wire database initialization into Tauri setup hook

#### Phase C: Migration Framework
- [x] Implement forward-only migration runner
- [x] Implement migration tracking table (`_migrations`)
- [x] Implement version-ahead detection
- [x] Embed migrations via `include_str!()`
- [x] Create `0001_initial_schema.sql` (app_settings table)
- [x] Wire migrations into startup sequence

#### Phase D: Health Validation and Testing
- [x] Implement `db_info` Tauri command
- [x] Move `greet` to `commands/system.rs`
- [x] Unit tests for migration runner (5 tests)
- [x] Unit tests for connection lifecycle (5 tests)
- [x] Integration tests for persistence and state (3 tests)

#### Phase E: Documentation and Finalization
- [x] Update CHANGELOG.md
- [x] Update ARCHITECTURE.md status
- [x] Finalize sprint-2 notes
- [x] Run full verification (cargo test, npm test, npm build, npm lint, npm format:check)

---

### Sprint 3: Core Domain Entities (Complete)

**Objective:** Define and implement the core domain entities behind a repository abstraction. After Sprint 3, workspaces, accounts, and categories can be created, read, updated, and deleted through Tauri commands backed by repositories over SQLite.

**Implementation Plan:** [docs/sprint-notes/sprint-3.md](docs/sprint-notes/sprint-3.md)

#### Phase A: Domain Model Types
- [x] Create `models/` module (mod.rs, workspace.rs, account.rs, category.rs)
- [x] Define workspace types (Workspace, CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceType)
- [x] Define account types (Account, CreateAccountInput, UpdateAccountInput, AccountType)
- [x] Define category types (Category, CreateCategoryInput, UpdateCategoryInput, CategoryType)

#### Phase B: Database Migrations
- [x] Create `0002_workspaces.sql` migration
- [x] Create `0003_accounts.sql` migration with FK to workspaces
- [x] Create `0004_categories.sql` migration with FK to workspaces and self-referential FK
- [x] Register migrations 0002–0004 in migration runner

#### Phase C: Extended Error Types
- [x] Add `NotFound`, `Validation(String)`, `Conflict(String)` to `DomainError`
- [x] Update `From<rusqlite::Error>` to map `QueryReturnedNoRows` to `NotFound`
- [x] Update `From<DomainError> for CommandError` for new variants

#### Phase D: Repository Layer
- [x] Create `repositories/` module (mod.rs, workspace.rs, account.rs, category.rs)
- [x] Implement `WorkspaceRepository` (CRUD + validation)
- [x] Implement `AccountRepository` (CRUD + list_by_workspace + validation)
- [x] Implement `CategoryRepository` (CRUD + list_by_workspace + seed_defaults + validation)

#### Phase E: Tauri Commands and Frontend Types
- [x] Create workspace Tauri commands (create, get, list, update, delete)
- [x] Create account Tauri commands (create, get, list_by_workspace, update, delete)
- [x] Create category Tauri commands (create, get, list_by_workspace, update, delete, seed_defaults)
- [x] Register all commands in `lib.rs`
- [x] Create TypeScript API wrappers (workspaces.ts, accounts.ts, categories.ts)
- [x] Create TypeScript domain types (src/types/domain.ts)
- [x] Create frontend error helper (src/lib/errors.ts)
- [x] Create amount formatting utility (src/lib/format.ts)

#### Phase F: Testing
- [x] Workspace repository tests (10 tests)
- [x] Account repository tests (11 tests)
- [x] Category repository tests (14 tests)
- [x] Foreign key and cascade tests (included in repository tests)
- [x] Migration tests updated for 4 migrations
- [x] Frontend formatting tests (8 tests)

#### Phase G: Documentation and Finalization
- [x] Update CHANGELOG.md
- [x] Update ARCHITECTURE.md (v1.3, "Sprint 3 Complete")
- [x] Update README.md (repository structure)
- [x] Finalize sprint-3 notes
- [x] Run full verification (cargo test, npm test, npm build, npm lint, npm format:check)

---

### Sprint 4: Transaction Engine (Complete)

**Objective:** Build the transaction engine and complete Milestone 2. After Sprint 4, income and expense transactions can be created, read, updated, deleted, searched, and filtered through Tauri commands. A programmatic batch-create path exists for future import workflows. Performance is validated against representative dataset sizes.

**Implementation Plan:** [docs/sprint-notes/sprint-4.md](docs/sprint-notes/sprint-4.md)

#### Phase A: Transaction Architecture and Domain Types
- [x] Create ADR 0009 (cached account balance strategy) — before repository code
- [x] Create `src-tauri/src/models/transaction.rs` (TransactionStatus, TransactionSource, Direction enums; Transaction entity; Create/Update input structs; TransactionQuery; TransactionListResult)
- [x] Update `models/mod.rs` to export transaction module
- [x] Verify compilation with `cargo check`

#### Phase B: Database Migration
- [x] Create `src-tauri/migrations/0005_transactions.sql` (table with amount_minor, FKs, CHECK(amount_minor != 0), 4 indexes — no transaction_type column, no import_session_id column)
- [x] Register migration 0005 in `db/migration.rs`
- [x] Verify migration applies (cargo test — migration tests pass, schema version = 5)

#### Phase C: Repository and Validation
- [x] Create `src-tauri/src/repositories/transaction.rs`
- [x] Implement `create` with full validation and atomic balance update
- [x] Implement `get_by_id`
- [x] Implement `update` with balance adjustment (reverses old effect, applies new — handles amount and account changes)
- [x] Implement `delete` with balance reversal
- [x] Implement `list` with dynamic filtering (account, category, date range, direction, text search, amount range), pagination, deterministic ordering
- [x] Implement `create_batch` (import foundation — atomic all-or-nothing bulk insert with same validation as single-create)
- [x] Implement `verify_balance` and `rebuild_balance` utilities
- [x] Update `repositories/mod.rs`

#### Phase D: Tauri Commands and TypeScript
- [x] Create `src-tauri/src/commands/transaction.rs` (9 commands)
- [x] Update `commands/mod.rs` and register commands in `lib.rs`
- [x] Add transaction types to `src/types/domain.ts` (no TransactionType — direction derived from amount sign)
- [x] Create `src/api/transactions.ts` with typed invoke wrappers
- [x] Verify `cargo check` and `npm run build`

#### Phase E: Testing and Performance
- [x] Transaction repository unit tests (~34 tests: CRUD, validation, balance atomicity, search, pagination, batch)
- [x] Foreign key and cascade tests (4 tests)
- [x] Migration tests (4 tests — including schema absence checks for type/import_session columns)
- [x] Performance tests with documented timings and EXPLAIN QUERY PLAN index verification (10k/50k/100k datasets)
- [x] All Sprint 2 and Sprint 3 tests continue to pass

#### Phase F: Documentation and Milestone Verification
- [x] Update CHANGELOG.md
- [x] Update ARCHITECTURE.md (v1.4, "Sprint 4 Complete — Transaction Engine", "Milestone 2 Complete")
- [x] Update README.md
- [x] Finalize sprint-4 notes (Status → Complete)
- [x] Verify all Milestone 2 exit criteria
- [x] Run full verification (cargo test, npm test, npm build, npm lint, npm format:check, npm run dev)

---

## Milestone 3: Core Finance Features (In Progress)

Covers Sprints 5, 6, 7. See [milestone details](docs/milestones.md#milestone-3-core-finance-features).

### Sprint 5: Personal Finance UI (Planned)

**Objective:** Transform the completed local data platform into the first usable personal finance application. Connect existing repositories and Tauri commands to the desktop UI. No new finance engine functionality unless a genuine capability gap is discovered (see Backend Change Rule in sprint-5.md).

**Implementation Plan:** [docs/sprint-notes/sprint-5.md](docs/sprint-notes/sprint-5.md)

#### Phase A: Foundation — Context, Primitives, and Layout ✅ Complete
- [x] Create WorkspaceContext (first-launch workspace creation, default category seeding)
- [x] Build UI primitives: Button, Input, Select, Textarea, FormField, Dialog, ConfirmDialog, Table, EmptyState, LoadingSpinner, ErrorMessage, Card, Badge, AmountInput, DateInput
- [x] Add Categories route and sidebar navigation entry
- [x] Refine sidebar icons, layout, and workspace indicator in sidebar
- [x] WorkspaceProvider wraps app; AppRouter handles loading/error/no-workspace states
- [x] FirstWorkspaceSetup focused creation screen
- [x] Context definition separated from provider component (workspaceContextDef.ts)
- [x] 33 new frontend tests (42 total — WorkspaceContext: 8, Button: 7, Dialog: 6, ConfirmDialog: 6, EmptyState: 6)

#### Phase B: Accounts UI
- [x] Accounts list page with balances, loading/empty/error states (Phase B1)
- [x] Create account dialog with validation (Phase B2)
- [x] Edit account dialog (name, institution) (Phase B3)
- [x] Archive/restore toggle (uses existing `is_active` field via `updateAccount` — non-destructive, reversible) (Phase B4)
- [ ] Delete account with cascade warning (shows transaction count, offers "Archive Instead" alternative) — **deferred, not part of Phase B4**

#### Phase C: Categories UI
- [ ] Categories page with income/expense sections
- [ ] Create category dialog with conflict handling
- [ ] Edit category dialog (system categories: name disabled)
- [ ] Delete category with confirmation (user categories: warns about uncategorized transactions; system categories: disabled)

#### Phase D: Transactions UI
- [ ] Transaction table with pagination (backend default ordering: date DESC, id DESC)
- [ ] Filtering: account, category, direction, date range
- [ ] Search by description (debounced)
- [ ] Create transaction dialog (date, description, amount, direction toggle, account, category, notes)
- [ ] Edit transaction dialog
- [ ] Delete transaction with confirmation
- [ ] Keyboard shortcuts (Ctrl/Cmd+N, Escape, Enter)

#### Phase E: Dashboard
- [ ] Total balance card (sum of active account balances from accounts list)
- [ ] Account count card
- [ ] Monthly income card (500-row limitation documented if exceeded)
- [ ] Monthly expenses card (500-row limitation documented if exceeded)
- [ ] Recent transactions list (5–10 items)
- [ ] Empty state for new users

#### Phase F: Polish, Testing, and Documentation
- [ ] Empty states on all pages
- [ ] Loading and error states
- [ ] Frontend component tests (15–25 new tests)
- [ ] Manual workflow verification (documented — includes cascade warning, persistence, dashboard accuracy)
- [ ] Update CHANGELOG.md
- [ ] Update ARCHITECTURE.md (v1.5, "Sprint 5 Complete — Personal Finance UI")
- [ ] Update README.md
- [ ] Finalize sprint-5 notes
- [ ] Run full verification (cargo check, cargo test, npm test, npm build, npm lint, npm format:check, npm run dev, tauri:build)

---

### Sprint 6: Budgets, Goals, and Reports (Planned)

**Objective:** Help users understand and plan their finances.

- [ ] Monthly budget creation and editing
- [ ] Budget progress tracking
- [ ] Savings goals
- [ ] Spending by category report
- [ ] Income vs. expense report
- [ ] Month comparison view
- [ ] Basic profit/loss for business workspaces
- [ ] Dashboard report widgets
- [ ] CSV import UI (column mapping, preview, file picker)
- [ ] CSV export

---

### Sprint 7: Security, Onboarding, and Business Finance (Planned)

**Objective:** Make Ledger feel safe and professional, and add freelancer/small business workflows.

- [ ] First-launch onboarding flow
- [ ] Local password/PIN setup
- [ ] App unlock screen
- [ ] Auto-lock setting
- [ ] Local database security design
- [ ] Keychain integration research
- [ ] Backup reminder and privacy explanation
- [ ] Settings foundation
- [ ] Client management
- [ ] Vendor management
- [ ] Invoice creation with line items
- [ ] Invoice status tracking
- [ ] Invoice PDF/export
- [ ] Receipt attachment on transactions
- [ ] Accounts payable tracking
- [ ] Accounts receivable tracking
- [ ] Business workspace reports

---

## Milestone 4: Commercial Readiness (Planned)

Covers Sprints 8, 9, 11, 12. See [milestone details](docs/milestones.md#milestone-4-commercial-readiness).

### Sprint 8: Commercial Readiness (Planned)

**Objective:** Prepare Ledger for paid distribution.

- [ ] License activation flow (Keygen or equivalent)
- [ ] Trial mode (14-day full-feature)
- [ ] License status UI in Settings
- [ ] Device activation policy (3 devices)
- [ ] Stripe purchase flow documentation
- [ ] Update policy documentation
- [ ] Terms, privacy, and support documentation
- [ ] Release notes structure

---

### Sprint 9: Installer, Updates, and Distribution (Planned)

**Objective:** Make Ledger installable and updateable.

- [ ] macOS build (.dmg)
- [ ] Windows build (.msi/.exe)
- [ ] Code signing research and setup
- [ ] macOS notarization
- [ ] Auto-update system (Tauri updater)
- [ ] Release artifact generation
- [ ] GitHub Actions build pipeline
- [ ] Crash/error reporting strategy
- [ ] Private beta distribution process
- [ ] Release checklist

---

### Sprint 11: Beta Hardening (Planned)

**Objective:** Prepare for external beta users.

- [ ] Data integrity testing
- [ ] Import edge case testing
- [ ] Large dataset performance testing
- [ ] Error handling review
- [ ] Backup/restore testing
- [ ] Installer testing on clean machines
- [ ] Update flow testing
- [ ] License edge case testing
- [ ] UX polish pass
- [ ] Documentation polish

---

### Sprint 12: Public Launch Preparation (Planned)

**Objective:** Prepare for initial public sale.

- [ ] Landing page
- [ ] Pricing page
- [ ] Download page
- [ ] Purchase flow (Stripe Checkout)
- [ ] License email delivery
- [ ] Documentation site
- [ ] Privacy policy
- [ ] Terms of use
- [ ] Refund policy
- [ ] Support workflow
- [ ] Public release checklist
- [ ] Launch announcement

---

## Milestone 5: Optional Connected Services (Planned)

Covers Sprint 10. See [milestone details](docs/milestones.md#milestone-5-optional-connected-services).

### Sprint 10: Plaid Relay and Bank Sync (Planned)

**Objective:** Add optional subscription-based bank synchronization.

- [ ] Cloud relay service implementation
- [ ] Plaid Link token flow
- [ ] Public token exchange
- [ ] Transaction sync
- [ ] Balance refresh
- [ ] Subscription entitlement validation
- [ ] Connected accounts UI
- [ ] Sync status display
- [ ] Institution repair flow
- [ ] Plaid error handling
- [ ] Plaid sandbox testing
