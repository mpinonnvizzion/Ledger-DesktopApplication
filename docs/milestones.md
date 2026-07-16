# Ledger Desktop — Project Milestones

**Version:** 2.1
**Last Updated:** 2026-07-07

---

## Purpose

This document defines high-level milestones for Ledger Desktop from project inception through public launch and beyond. Milestones group related sprints into coherent delivery phases, each with a clear objective, scope boundary, and exit criteria.

Milestones do not replace sprint-level planning. They provide a strategic view of progress and help prevent scope drift between phases.

---

## Product Principles (Reinforced)

Every milestone must preserve:

- **Local-first** — User financial data is stored locally by default
- **Offline-first** — Core financial workflows operate without internet
- **Privacy-first** — Minimal data collection, no ads, no tracking
- **Desktop-first** — Native desktop application, not a web app in a window
- **Not SaaS** — One-time purchase for the core app
- **Subscriptions only for recurring-cost services** — Bank sync requires Plaid API costs; the core app does not

These principles are non-negotiable across all milestones. See [ADR 0006](adr/0006-one-time-purchase-with-optional-subscriptions.md) and [Product Guardrails](business/PRODUCT_GUARDRAILS.md).

---

## Milestone Overview

| Milestone | Name | Sprints | Status |
|-----------|------|---------|--------|
| 1 | Application Foundation | 0, 1 | Complete |
| 2 | Local Data Platform | 2, 3, 4 | Complete |
| 3 | Core Finance Features | 5, 6, 7 | In Progress |
| 4 | Commercial Readiness | 8, 9, 11, 12 | Planned |
| 5 | Optional Connected Services | 10 | Planned |

---

## Milestone 1: Application Foundation

**Status:** Complete
**Sprints:** 0, 1
**Roadmap Layer:** Documentation and Architecture → Project Foundation

### Objective

Establish the documentation foundation, architecture decisions, development process, and a working Tauri 2 desktop application shell with React/TypeScript frontend, proof-of-concept Rust IPC, and repeatable development tooling.

### Scope

- Business and product documentation (Phase -1, completed prior)
- Repository structure, ADRs, specifications, sprint notes
- Root documents (README, PROJECT, ARCHITECTURE, TASKS, CLAUDE, CHANGELOG)
- Tauri 2 project initialization with React 19, TypeScript, Vite 7
- Tailwind CSS v4 with design token foundation
- App shell with sidebar navigation and header
- Four placeholder pages (Dashboard, Accounts, Transactions, Settings)
- Hash-based routing via React Router
- Rust `greet` command with typed TypeScript invoke wrapper
- ESLint, Prettier, Vitest, and Rust test infrastructure
- npm scripts for dev, build, lint, format, and test workflows

### Out of Scope

- SQLite database or any data persistence
- Account, transaction, category, or report features
- Plaid, Stripe, licensing, updater, or cloud services
- Production UI design
- Onboarding or security features

### Exit Criteria

- [x] `npm run dev` launches a Tauri desktop window showing the React frontend
- [x] Window title is "Ledger Desktop"
- [x] Sidebar displays navigation links for Dashboard, Accounts, Transactions, Settings
- [x] Each sidebar link navigates to its placeholder page
- [x] At least one page demonstrates a successful Tauri command invocation
- [x] `npm run lint`, `npm run format:check`, `npm run test`, and `cargo test` all pass
- [x] `npm run build` and `npm run tauri:build` complete without errors
- [x] Folder structure matches documented plan
- [x] No financial features, database schema, or production UI exist
- [x] Documentation foundation is complete (7 ADRs, 7 specifications, sprint notes)

### Dependent Sprints

- Sprint 0: Documentation and Architecture Foundation
- Sprint 1: Project Foundation

---

## Milestone 2: Local Data Platform

**Status:** Complete
**Sprints:** 2, 3, 4
**Roadmap Layer:** Local Finance Foundation

### Objective

Build the complete local persistence layer that every finance feature depends on. After this milestone, Ledger has a production-ready local data platform: SQLite database with migration system, well-defined domain entities behind a repository abstraction, a transaction engine with search and filtering, import foundations, and validated data integrity — all operating completely offline.

### Scope

**Sprint 2: Database Foundation**
- SQLite integration in the Rust backend
- Database initialization on first launch
- Migration system for schema evolution
- Database service abstraction layer
- Database file location documentation
- Backup and export foundation (approach documented, basic workflow available)
- Version management for schema tracking
- Data persistence verification across app restarts

**Sprint 3: Core Domain Entities**
- Core domain entity definitions (workspaces, accounts, categories)
- Repository pattern for data access
- Account CRUD operations via Tauri commands
- Category CRUD with seed/default data
- Validation layer for domain entities
- Local persistence architecture (frontend never touches SQLite directly)
- Foreign key behavior documented and tested

**Sprint 4: Transaction Engine**
- Transaction CRUD operations via Tauri commands
- Transaction search capabilities
- Transaction filtering (date, category, amount, account)
- Import foundation (data layer for future CSV import UI)
- Data integrity validation and constraints
- Performance validation with representative datasets

### Out of Scope

- Dashboard or any summary UI
- Reports, budgets, or goals
- CSV import UI (column mapping, preview, file picker)
- Plaid, Stripe, licensing, or cloud services
- Database encryption (deferred per security model specification)
- Onboarding, app lock, or security features
- Invoicing, clients, vendors, receipts
- Production UI for accounts, transactions, or categories

### Exit Criteria

- [ ] Ledger can create and open a local SQLite database
- [ ] Migrations run reliably on first launch and on schema changes
- [ ] Database service abstraction isolates SQLite from the rest of the backend
- [ ] Workspaces, accounts, and categories can be created, read, updated, and deleted via Tauri commands
- [ ] Transactions can be created, read, updated, and deleted via Tauri commands
- [ ] Transactions can be searched and filtered by date, category, amount, and account
- [ ] Repository pattern provides a clean boundary between domain logic and storage
- [ ] Domain entity validation prevents invalid data from reaching the database
- [ ] Import data path exists for programmatic transaction creation (foundation for CSV import)
- [ ] Data persists after app restart
- [ ] Foreign key constraints are enforced and tested
- [ ] Performance is validated against representative dataset sizes
- [ ] Database file location is documented
- [ ] Backup/export design is documented
- [ ] No dashboard, report, budget, goal, or UI feature code exists
- [ ] No Plaid, Stripe, licensing, or cloud code exists

### Dependent Sprints

- Sprint 2: Database Foundation
- Sprint 3: Core Domain Entities
- Sprint 4: Transaction Engine

---

## Milestone 3: Core Finance Features

**Status:** In Progress
**Sprints:** 5, 6, 7
**Roadmap Layer:** Personal Finance UI → Budgets and Reports → Security and Business Finance

### Objective

Transform the completed data platform into a fully usable offline personal finance application. After this milestone, a user can track finances end-to-end: view dashboards and reports, set budgets and goals, manage clients and invoices, and protect the app with a local PIN/password. The app is useful without any internet connection or subscription.

### Scope

**Sprint 5: Personal Finance UI**
- Workspace initialization and context management
- Account UI (list, create, edit, archive, delete with cascade warnings)
- Category management UI (list, create, edit, delete with system protection)
- Transaction UI (table, create, edit, delete, search, filter, pagination)
- Dashboard summary (total balance, account count, monthly income/expenses, recent transactions)
- Empty states, loading states, error states, confirmation dialogs
- Desktop keyboard shortcuts and responsive layout

**Sprint 6: Budgets, Goals, and Reports**
- Monthly budget creation and editing
- Budget progress tracking
- Savings goals
- Spending by category report
- Income vs. expense report
- Month comparison view
- Basic profit/loss for business workspaces
- Dashboard report widgets
- CSV import UI (column mapping, preview, file picker)
- CSV export

**Sprint 7: Security, Onboarding, and Business Finance**
- First-launch onboarding flow
- Local password/PIN setup
- App unlock screen
- Auto-lock setting
- Local database security design
- Keychain integration research
- Backup reminder and privacy explanation
- Settings foundation
- Client and vendor management
- Invoice creation with line items
- Invoice status tracking
- Invoice PDF/export
- Receipt attachment on transactions
- Accounts payable and receivable tracking
- Business workspace reports

### Out of Scope

- Licensing, activation, or trial mode (Sprint 8)
- Installer packaging and distribution
- Auto-updater or code signing
- Plaid bank sync or any cloud service
- Database encryption (deferred per security model)
- Payroll, tax filing, accountant portal, inventory
- Full double-entry accounting
- AI categorization or automation
- Public launch preparation

### Exit Criteria

- [ ] A user can manage workspaces, accounts, categories, and transactions through the desktop UI
- [ ] Account balances update after transaction changes
- [ ] Transactions can be searched, filtered, and paginated
- [ ] Dashboard displays summary data (balance, accounts, monthly totals, recent transactions)
- [ ] A user can create budgets and track progress
- [ ] A user can create savings goals
- [ ] A user can view spending by category and income vs. expense reports
- [ ] A user can protect the app with a local password/PIN
- [ ] First-launch onboarding guides new users
- [ ] Business users can manage clients, vendors, and invoices
- [ ] Receipt attachments work on transactions
- [ ] All core workflows function offline without internet
- [ ] No licensing, installer, updater, code signing, or distribution code exists
- [ ] No Plaid or cloud code exists

### Dependent Sprints

- Sprint 5: Personal Finance UI
- Sprint 6: Budgets, Goals, and Reports
- Sprint 7: Security, Onboarding, and Business Finance

### Notes

Sprint 5 was originally scoped as "Budgets, Goals, and Reports" but was repurposed to "Personal Finance UI" because the data platform requires a working UI before financial planning features can be layered on. Budgets, goals, and reports moved to Sprint 6. Security, onboarding, and business finance are combined in Sprint 7.

Sprint 7 items (invoicing, clients, vendors, onboarding, security) are a large scope. If Sprint 7 proves too large, it may be split or partially deferred to a post-launch version without blocking Milestone 4. This decision should be documented as an ADR if it occurs.

---

## Milestone 4: Commercial Readiness

**Status:** Planned
**Sprints:** 8, 9, 11, 12
**Roadmap Layer:** Commercial Desktop Product

### Objective

Prepare Ledger Desktop for commercial release. After this milestone, a customer can discover, purchase, download, install, and use Ledger Desktop. The application has licensing and activation, is packaged, signed, notarized (macOS), auto-updateable, beta-tested, and supported by published documentation including terms of use, privacy policy, refund policy, and a support workflow.

### Scope

**Sprint 8: Commercial Readiness**
- License activation flow (Keygen or equivalent)
- Trial mode (14-day full-feature)
- License status UI in Settings
- Device activation policy (3 devices)
- Stripe purchase flow documentation
- Update policy documentation
- Terms, privacy, and support documentation
- Release notes structure

**Sprint 9: Installer, Updates, and Distribution**
- macOS build (.dmg) with code signing and notarization
- Windows build (.msi/.exe) with code signing
- Auto-update system via Tauri updater
- Release artifact generation
- GitHub Actions build pipeline
- Crash/error reporting strategy
- Private beta distribution process
- Release checklist

**Sprint 11: Beta Hardening**
- Data integrity testing
- Import edge case testing
- Large dataset performance testing
- Error handling review
- Backup/restore testing
- Installer testing on clean machines
- Update flow testing
- License edge case testing
- UX polish pass
- Documentation polish

**Sprint 12: Public Launch Preparation**
- Landing page
- Pricing page
- Download page
- Purchase flow (Stripe Checkout)
- License email delivery
- Documentation site
- Privacy policy, terms of use, refund policy
- Support workflow
- Public release checklist
- Launch announcement

### Out of Scope

- Plaid bank sync or cloud relay
- New financial features beyond what Milestones 1–3 deliver
- App Store or Microsoft Store distribution
- Mobile applications
- Enterprise sales or multi-user permissions
- Cloud sync or cloud backup

### Exit Criteria

- [ ] Users can activate Ledger with a license key
- [ ] Trial mode works (14-day, full-feature, countdown visible)
- [ ] License status is visible in Settings
- [ ] macOS and Windows installers build and install correctly
- [ ] Code signing is in place (both platforms)
- [ ] Auto-update mechanism is functional and tested
- [ ] Private beta builds can be distributed securely
- [ ] Data integrity, import, backup, and update flows are tested
- [ ] A customer can purchase via Stripe and receive a license key
- [ ] Landing, pricing, and download pages exist
- [ ] Privacy policy, terms of use, and refund policy are published
- [ ] Support workflow is documented and functional
- [ ] Release checklist is completed
- [ ] Subscriptions are not required for any core financial feature

### Dependent Sprints

- Sprint 8: Commercial Readiness
- Sprint 9: Installer, Updates, and Distribution
- Sprint 11: Beta Hardening
- Sprint 12: Public Launch Preparation

### Notes

Sprint 10 (Plaid) is intentionally excluded from this milestone. The product launches as a fully functional local-first finance application without requiring bank sync. This aligns with the [Roadmap](business/ROADMAP.md) principle that "the local product must be excellent without bank sync before Plaid is introduced."

---

## Milestone 5: Optional Connected Services

**Status:** Planned
**Sprints:** 10
**Roadmap Layer:** Optional Connected Services

### Objective

Introduce optional, subscription-gated cloud-assisted services without compromising the local-first architecture. After this milestone, users with an active Bank Sync subscription can connect bank accounts, automatically import transactions, and refresh balances. The cloud relay architecture ensures Plaid API secrets never exist in the desktop application. Users without a subscription continue using Ledger without any degradation of core functionality.

The core product is complete before any connected services are introduced. Subscriptions exist only for recurring-cost services.

### Scope

**Sprint 10: Plaid Relay and Bank Sync**
- Cloud relay service implementation (stores Plaid API credentials securely)
- Plaid Link token flow (relay creates tokens, desktop renders Link in webview)
- Public token exchange via relay
- Transaction sync from Plaid to local SQLite
- Balance refresh
- Subscription entitlement validation before each sync operation
- Connected accounts UI (list, status, last sync, disconnect)
- Sync status display
- Institution repair flow for expired or broken connections
- Plaid error handling and retry behavior
- Plaid sandbox testing
- Connected-service documentation

### Out of Scope

- Full cloud sync or multi-device database sync
- Cloud backup
- AI categorization or automation
- Plaid investments API, identity verification, or payment initiation
- Real-time transaction streaming
- Self-hosted relay option
- New financial features or UI beyond bank sync
- Changes to the one-time purchase model for core features

### Exit Criteria

- [ ] Users with an active Bank Sync subscription can connect bank accounts via Plaid Link
- [ ] Transactions sync from Plaid to the local SQLite database
- [ ] Balances refresh from connected institutions
- [ ] Expired subscriptions stop future sync but preserve all local data
- [ ] New connections are blocked when subscription is inactive
- [ ] No Plaid API secrets exist in the desktop application binary
- [ ] Cloud relay validates subscription entitlement before each operation
- [ ] Institution repair flow handles broken connections
- [ ] Synced transactions are editable and exportable like any other transaction
- [ ] Cancelling Bank Sync never deletes local financial data
- [ ] Core app functionality is completely unaffected for non-subscribers

### Dependent Sprints

- Sprint 10: Plaid Relay and Bank Sync

### Notes

This milestone is intentionally positioned after public launch (Milestone 4). Bank Sync is the only planned subscription-gated service. The subscription exists because Plaid charges per-connection recurring fees — the subscription covers real operating costs, not artificial feature gating. See [ADR 0005](adr/0005-plaid-requires-cloud-relay.md), [ADR 0006](adr/0006-one-time-purchase-with-optional-subscriptions.md), and the [Plaid Bank Sync Specification](specifications/plaid-bank-sync.md).

Future connected services (cloud backup, multi-device sync) are version 2.0 candidates and are not part of any current milestone. If introduced, they must follow the same principle: subscriptions only where real recurring costs exist.

---

## Sprint-to-Milestone Mapping

| Sprint | Name | Milestone |
|--------|------|-----------|
| 0 | Documentation and Architecture Foundation | 1: Application Foundation |
| 1 | Project Foundation | 1: Application Foundation |
| 2 | Database Foundation | 2: Local Data Platform |
| 3 | Core Domain Entities | 2: Local Data Platform |
| 4 | Transaction Engine | 2: Local Data Platform |
| 5 | Personal Finance UI | 3: Core Finance Features |
| 6 | Budgets, Goals, and Reports | 3: Core Finance Features |
| 7 | Security, Onboarding, and Business Finance | 3: Core Finance Features |
| 8 | Commercial Readiness | 4: Commercial Readiness |
| 9 | Installer, Updates, and Distribution | 4: Commercial Readiness |
| 10 | Plaid Relay and Bank Sync | 5: Optional Connected Services |
| 11 | Beta Hardening | 4: Commercial Readiness |
| 12 | Public Launch Preparation | 4: Commercial Readiness |

### Sequencing Note

Sprint 10 (Plaid) is numbered between Sprint 9 and Sprint 11 in the original sprint plan, but it belongs to Milestone 5, which follows Milestone 4. The implementation order for Sprints 10, 11, and 12 should be determined during Milestone 4 planning. The product can launch without Plaid (Milestone 4 complete) and add bank sync afterward (Milestone 5).

---

## Milestone Dependencies

```
Milestone 1: Application Foundation (Complete)
    │
    ▼
Milestone 2: Local Data Platform
    │
    ▼
Milestone 3: Core Finance Features
    │
    ▼
Milestone 4: Commercial Readiness
    │
    ▼
Milestone 5: Optional Connected Services
```

Each milestone depends on the previous milestone being complete. No milestone should be started before its predecessor's exit criteria are met.
