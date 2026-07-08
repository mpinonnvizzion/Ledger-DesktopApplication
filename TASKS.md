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

## Milestone 2: Local Data Platform (Planned)

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

### Sprint 4: Transaction Engine (Planned)

**Objective:** Build the transaction engine with search, filtering, and import foundation.

- [ ] Transaction CRUD operations via Tauri commands
- [ ] Transaction search capabilities
- [ ] Transaction filtering (date, category, amount, account)
- [ ] Import foundation (data layer for future CSV import UI)
- [ ] Data integrity validation and constraints
- [ ] Performance validation with representative datasets
- [ ] Update CHANGELOG.md
- [ ] Write Sprint 4 notes

---

## Milestone 3: Core Finance Features (Planned)

Covers Sprints 5, 6, 7. See [milestone details](docs/milestones.md#milestone-3-core-finance-features).

### Sprint 5: Budgets, Goals, and Reports (Planned)

**Objective:** Help users understand and plan their finances.

- [ ] Monthly budget creation and editing
- [ ] Budget progress tracking
- [ ] Savings goals
- [ ] Spending by category report
- [ ] Income vs. expense report
- [ ] Month comparison view
- [ ] Basic profit/loss for business workspaces
- [ ] Dashboard report widgets

---

### Sprint 6: Local Security and Onboarding (Planned)

**Objective:** Make Ledger feel safe, professional, and ready for real user data.

- [ ] First-launch onboarding flow
- [ ] Local password/PIN setup
- [ ] App unlock screen
- [ ] Auto-lock setting
- [ ] Local database security design
- [ ] Keychain integration research
- [ ] Backup reminder
- [ ] Privacy explanation screen
- [ ] Settings foundation

---

### Sprint 7: Lightweight Business Finance (Planned)

**Objective:** Add freelancer and small business workflows.

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
