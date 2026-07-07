# Ledger Desktop — Tasks and Sprint Tracking

---

## Phase -1: Business and Product Design (Completed)

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

---

## Sprint 0: Documentation and Architecture Foundation (Current)

**Objective:** Prepare the repository for disciplined product development. Documentation only — no application code.

### Root Documents
- [x] README.md
- [x] PROJECT.md
- [x] ARCHITECTURE.md
- [x] TASKS.md
- [x] CLAUDE.md
- [x] CHANGELOG.md

### Folder Structure
- [x] `docs/adr/`
- [x] `docs/specifications/`
- [x] `docs/sprint-notes/`
- [x] `docs/business/` (pre-existing)
- [x] `docs/product/` (pre-existing)
- [x] `docs/reference/` (pre-existing)

### Architecture Decision Records
- [x] ADR 0001: Documentation-first development process
- [x] ADR 0002: Desktop-first architecture (Tauri 2)
- [x] ADR 0003: Local-first data ownership (SQLite)
- [x] ADR 0004: Offline-first core workflows
- [x] ADR 0005: Plaid requires cloud relay
- [x] ADR 0006: One-time purchase with optional subscriptions
- [x] ADR 0007: Existing Ledger app as reference only

### Specifications
- [x] App Scope
- [x] Data Model Overview
- [x] Security Model
- [x] Onboarding Flow
- [x] Commercial Model
- [x] Plaid Bank Sync
- [x] Release and Distribution

### Sprint Notes
- [x] Sprint 0 notes

### Housekeeping
- [x] Normalize business document filenames
- [x] Verify consistency across all documents

---

## Sprint 1: Project Foundation (Planned)

**Objective:** Initialize the Ledger Desktop application structure.

- [ ] Create Tauri 2 project
- [ ] Set up React with TypeScript
- [ ] Set up Vite build system
- [ ] Set up Tailwind CSS
- [ ] Establish folder structure matching ARCHITECTURE.md
- [ ] Create basic app shell with window and title bar
- [ ] Add placeholder navigation (sidebar or top nav)
- [ ] Add development scripts (dev, build, lint, format)
- [ ] Add ESLint and Prettier configuration
- [ ] Add initial test structure (Vitest for frontend, Rust tests for backend)
- [ ] Verify app launches locally in Tauri
- [ ] Update CHANGELOG.md
- [ ] Write Sprint 1 notes

**Exit Criteria:** The app launches locally, the desktop shell opens, the frontend renders inside Tauri, basic routing exists, and the development workflow is repeatable.

---

## Sprint 2: Local Database Foundation (Planned)

**Objective:** Create the local data foundation.

- [ ] Set up SQLite with Rust backend
- [ ] Implement migration system
- [ ] Database initialization on first launch
- [ ] Workspace table and CRUD commands
- [ ] Account table and CRUD commands
- [ ] Category table with seed/defaults
- [ ] Transaction table and CRUD commands
- [ ] Basic Tauri command layer for data access
- [ ] Document database file location
- [ ] Design backup/export approach
- [ ] Verify data persists after app restart
- [ ] Test foreign key behavior
- [ ] Update CHANGELOG.md
- [ ] Write Sprint 2 notes

---

## Sprint 3: Core Finance Workflow (Planned)

**Objective:** Make Ledger useful for basic financial tracking.

- [ ] Dashboard shell with summary widgets
- [ ] Account list view
- [ ] Account detail view
- [ ] Transaction list with pagination
- [ ] Transaction create/edit/delete forms
- [ ] Category assignment on transactions
- [ ] Transaction filtering (date, category, amount, account)
- [ ] Transaction search
- [ ] Workspace switcher
- [ ] Manual account balance display
- [ ] Recent transactions widget on dashboard

---

## Sprint 4: CSV Import and Data Ownership (Planned)

**Objective:** Make Ledger practical for users who do not use bank sync.

- [ ] CSV import flow with file picker
- [ ] Column mapping UI
- [ ] Import preview before commit
- [ ] Duplicate detection
- [ ] Import session tracking
- [ ] Import error handling and validation
- [ ] CSV export
- [ ] Manual database backup workflow
- [ ] Data ownership documentation for users

---

## Sprint 5: Budgets, Goals, and Reports (Planned)

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

## Sprint 6: Local Security and Onboarding (Planned)

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

## Sprint 7: Lightweight Business Finance (Planned)

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

## Sprint 8: Commercial Readiness (Planned)

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

## Sprint 9: Installer, Updates, and Distribution (Planned)

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

## Sprint 10: Plaid Relay and Bank Sync (Planned)

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

---

## Sprint 11: Beta Hardening (Planned)

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

## Sprint 12: Public Launch Preparation (Planned)

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
