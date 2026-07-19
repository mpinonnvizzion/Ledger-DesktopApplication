# Ledger Desktop — Project Milestones

**Version:** 2.2
**Last Updated:** 2026-07-19

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
| 3 | Core Finance Features | 5, 6, 7, 8 | In Progress |
| — | Future Milestones (Unscheduled) | Not yet numbered | Planned |

See "Future Milestones (Unscheduled)" below for the product domains that follow Milestone 3 (Budgets, Goals, Reports, Security & Onboarding, Business Finance, Commercial Readiness, Installer & Distribution, Beta Hardening, Public Launch, Optional Connected Services). These are intentionally not assigned sprint numbers yet — see the Sprint 6/7/8 renumbering decision recorded in Milestone 3's Notes below.

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

- [x] Ledger can create and open a local SQLite database
- [x] Migrations run reliably on first launch and on schema changes
- [x] Database service abstraction isolates SQLite from the rest of the backend
- [x] Workspaces, accounts, and categories can be created, read, updated, and deleted via Tauri commands
- [x] Transactions can be created, read, updated, and deleted via Tauri commands
- [x] Transactions can be searched and filtered by date, category, amount, and account
- [x] Repository pattern provides a clean boundary between domain logic and storage
- [x] Domain entity validation prevents invalid data from reaching the database
- [x] Import data path exists for programmatic transaction creation (foundation for CSV import)
- [x] Data persists after app restart
- [x] Foreign key constraints are enforced and tested
- [x] Performance is validated against representative dataset sizes
- [x] Database file location is documented
- [x] Backup/export design is documented
- [x] No dashboard, report, budget, goal, or UI feature code exists
- [x] No Plaid, Stripe, licensing, or cloud code exists

### Dependent Sprints

- Sprint 2: Database Foundation
- Sprint 3: Core Domain Entities
- Sprint 4: Transaction Engine

---

## Milestone 3: Core Finance Features

**Status:** In Progress
**Sprints:** 5, 6, 7, 8
**Roadmap Layer:** Daily Finance Workflow

### Objective

Transform the completed data platform into a fully usable offline personal finance application: manage accounts, record and browse transactions, organize categories, and see an at-a-glance dashboard — all offline, all local.

### Scope

**Sprint 5: Accounts UI (Complete)**
- Workspace initialization and context management
- Account UI: list, create, edit, archive/restore (permanent deletion deferred — see `docs/sprint-notes/sprint-5.md`)
- Empty, loading, and error states; confirmation dialogs for archive

**Sprint 6: Transactions UI**
- Transaction table: list, create, edit, delete
- Single-account filter and basic Previous/Next pagination
- Amount entry via a direction toggle (Income/Expense) plus a positive-amount input
- See `docs/sprint-notes/sprint-6.md` for the implementation plan

**Sprint 7: Categories UI**
- Categories page listing categories grouped by income/expense type
- Create category dialog with duplicate-name conflict handling
- Edit category dialog (system categories: name disabled)
- Delete category with confirmation (user categories: warns about uncategorized transactions; system categories: deletion disabled)

**Sprint 8: Dashboard**
- Total balance card (sum of active account balances)
- Active account count card
- Monthly income / monthly expenses cards (500-row limitation documented if exceeded, per the Known API Gap in `docs/sprint-notes/sprint-5.md`)
- Recent transactions list
- Empty state for new users

### Out of Scope

- Budgets, goals, reports, CSV import/export (moved out of Milestone 3 — see "Future Milestones" below)
- Security, onboarding, and app lock (moved out of Milestone 3)
- Client/vendor management, invoicing, AP/AR, business workspace reports (moved out of Milestone 3)
- Licensing, installer, updater, or distribution code
- Plaid bank sync or any cloud service
- Database encryption (deferred per security model)
- Full double-entry accounting

### Exit Criteria

- [x] A user can manage workspaces and the reversible account lifecycle through the desktop UI (Sprint 5)
- [ ] A user can create, view, edit, and delete transactions, with account balances updating automatically
- [ ] A user can manage categories (list, create, edit, delete) with system-category protections enforced
- [ ] Dashboard displays summary data (balance, accounts, monthly totals, recent transactions)
- [ ] All core workflows function offline without internet
- [ ] No budgets, goals, reports, business finance, security/onboarding, licensing, or cloud code exists

### Dependent Sprints

- Sprint 5: Accounts UI (Complete)
- Sprint 6: Transactions UI
- Sprint 7: Categories UI
- Sprint 8: Dashboard

### Notes

Sprint 5 was originally scoped as "Personal Finance UI" (Accounts + Categories + Transactions + Dashboard combined), but only the Accounts UI was actually delivered — see `docs/sprint-notes/sprint-5.md`'s closeout section for the full record of that narrowing.

This created a temporary conflict between the delivered scope and this document's sprint numbering, which was flagged (not resolved) in the Sprint 5 closeout and in `docs/sprint-notes/sprint-6.md`. On 2026-07-19 the Product Owner resolved that conflict with the following decision: Sprint 5 is confirmed as Accounts UI (complete); Sprint 6 is Transactions UI; Sprint 7 is Categories UI; Sprint 8 is Dashboard. Budgets, Goals, and Reports — previously bundled as a single "Sprint 6" — are moved out of Milestone 3 entirely and will be replanned later as separate product domains rather than one immediate sprint. This also displaces the prior Sprint 7 (Security, Onboarding, and Business Finance) and Sprint 8 (Commercial Readiness) content, since those sprint numbers are now used by Categories UI and Dashboard — see "Future Milestones (Unscheduled)" below for where that content now lives.

---

## Future Milestones (Unscheduled)

The following product domains follow Milestone 3 but do not yet have assigned sprint numbers or a committed detailed schedule. Each one was previously documented with more specific scope (in this file's prior revisions and in `docs/business/ROADMAP.md`); that scope is retained below as a placeholder so it isn't lost, but it should be treated as a starting point for replanning, not a ratified sprint plan. Detailed sprint-level plans (objective, phases, exit criteria) will be written when each domain is next picked up, per this project's [Documentation First](../CLAUDE.md) rule.

- **Future: Budgets** — Monthly budget creation, editing, and progress tracking.
- **Future: Goals** — Savings goals.
- **Future: Reports** — Spending-by-category report, income-vs-expense report, month comparison view, basic profit/loss for business workspaces, dashboard report widgets, CSV import/export.
- **Future: Security & Onboarding** — First-launch onboarding flow, local password/PIN setup, app unlock screen, auto-lock setting, local database security design, keychain integration research, backup reminder and privacy explanation, settings foundation.
- **Future: Business Finance** — Client and vendor management, invoice creation with line items, invoice status tracking, invoice PDF/export, receipt attachment on transactions, accounts payable/receivable tracking, business workspace reports.
- **Future: Commercial Readiness** — License activation flow, trial mode, license status UI, device activation policy, Stripe purchase flow documentation, update policy documentation, terms/privacy/support documentation, release notes structure.
- **Future: Installer, Updates, and Distribution** — macOS and Windows builds with code signing and notarization, auto-update system, release artifact generation, CI build pipeline, crash/error reporting strategy, private beta distribution process.
- **Future: Beta Hardening** — Data integrity, import edge case, large dataset, backup/restore, installer, update-flow, and license edge-case testing; UX and documentation polish.
- **Future: Public Launch Preparation** — Landing/pricing/download pages, Stripe Checkout purchase flow, license email delivery, documentation site, privacy policy, terms of use, refund policy, support workflow, public release checklist.
- **Future: Optional Connected Services (Plaid Bank Sync)** — Cloud relay service, Plaid Link token flow, transaction sync, balance refresh, subscription entitlement validation, connected accounts UI, institution repair flow.

### Sequencing

Ordering among these placeholders is not yet finalized as a formal sprint sequence. The one fixed constraint carried over from prior planning: **Optional Connected Services (Plaid) remains positioned after commercial readiness** — the local product must be excellent without bank sync before Plaid is introduced, per [ADR 0005](adr/0005-plaid-requires-cloud-relay.md), [ADR 0006](adr/0006-one-time-purchase-with-optional-subscriptions.md), and the [Roadmap](business/ROADMAP.md). Beyond that constraint, the Product Owner will assign sprint numbers and write detailed plans as each domain is next picked up.

---

## Milestone Dependencies

```
Milestone 1: Application Foundation (Complete)
    │
    ▼
Milestone 2: Local Data Platform (Complete)
    │
    ▼
Milestone 3: Core Finance Features (In Progress — Sprints 5-8)
    │
    ▼
Future Milestones (Unscheduled — see above)
```

Each milestone depends on the previous milestone being complete. No milestone should be started before its predecessor's exit criteria are met.
