# Roadmap

**Version:** 1.0
**Status:** Draft
**Owner:** Product Owner

---

# Purpose

This document defines Ledger Desktop's product roadmap.

The roadmap exists to prevent feature creep and keep development aligned with the product vision.

Ledger is a commercial desktop finance application. It is local-first, offline-first, privacy-first, and sold as a one-time purchase with optional subscription services only where recurring operating costs exist.

The roadmap should prioritize a reliable local finance foundation before advanced integrations, automation, or connected services.

---

# Roadmap Philosophy

Ledger should grow in deliberate layers.

A narrow, polished, reliable product is better than a broad, fragile product.

Every phase should strengthen the foundation before expanding scope.

The development order should be:

1. Business and product definition
2. Documentation and architecture
3. Local data foundation
4. Core desktop finance workflows
5. Commercial readiness
6. Optional connected services
7. Advanced automation and expansion

---

# Product Layers

Ledger should be built in the following layers:

## Layer 1: Local Finance Foundation

The application must first become excellent at storing, organizing, importing, editing, backing up, and exporting financial data locally.

This is the most important layer.

## Layer 2: Daily Finance Workflow

The application should then become useful for routine financial management.

Users should be able to quickly review accounts, transactions, categories, budgets, and reports.

## Layer 3: Planning and Reporting

Ledger should help users understand trends, plan budgets, track goals, and make better financial decisions.

## Layer 4: Lightweight Business Finance

Ledger should support freelancers and small businesses with invoices, clients, vendors, receipts, AP/AR, and business reports.

## Layer 5: Commercial Desktop Product

Ledger should become ready for paid distribution with licensing, trials, updates, installers, support, and documentation.

## Layer 6: Optional Connected Services

Plaid bank synchronization and future cloud services should enhance the product without defining it.

---

# Phase -1: Business and Product Design

## Objective

Define the business, product strategy, customer, positioning, and roadmap before engineering begins.

## Scope

* Vision
* Target customer
* Product requirements
* Business model
* Product strategy
* Competitor analysis
* Roadmap
* Product guardrails
* Pricing and packaging
* Licensing and activation
* Release strategy

## Out of Scope

* Application code
* Database schema implementation
* Tauri initialization
* Stripe implementation
* Plaid implementation
* UI development

## Exit Criteria

Phase -1 is complete when the product has a clear business and strategic foundation.

The team should be able to answer:

* Who is Ledger for?
* Why does Ledger exist?
* How does Ledger make money?
* What makes Ledger different?
* What belongs in version 1.0?
* What should be deferred?
* What product principles must not be violated?

---

# Sprint 0: Documentation and Architecture Foundation

## Objective

Prepare the repository for disciplined product development.

Sprint 0 is documentation only.

## Scope

* `README.md`
* `PROJECT.md`
* `ARCHITECTURE.md`
* `TASKS.md`
* `CLAUDE.md`
* `CHANGELOG.md`
* ADR folder
* Specification folder
* Sprint notes folder
* Business documentation folder
* Product documentation folder
* Initial architecture decisions

## Architecture Direction

Ledger Desktop should follow the target architecture already defined in the architecture specification:

* Tauri desktop application
* React frontend
* SQLite local database
* Local-first storage
* Optional Plaid cloud relay
* Stripe payment flow
* License activation
* macOS and Windows distribution

The existing Ledger app should be treated as a reference implementation, not the codebase to modify directly.

## Out of Scope

* No application code
* No Tauri initialization
* No database migrations
* No Docker services
* No Plaid implementation
* No Stripe implementation

## Exit Criteria

Sprint 0 is complete when the repository clearly documents:

* What Ledger is
* What Ledger is not
* Architecture direction
* Development process
* Sprint process
* Claude Code rules
* Product guardrails
* Initial backlog
* ADR structure

---

# Sprint 1: Project Foundation

## Objective

Initialize the new Ledger Desktop application structure.

## Scope

* Create Tauri project
* Set up React
* Set up TypeScript
* Set up Vite
* Set up Tailwind CSS
* Establish folder structure
* Add basic app shell
* Add placeholder navigation
* Add development scripts
* Add linting and formatting
* Add initial testing structure

## Out of Scope

* Production database schema
* Plaid
* Stripe
* Licensing
* Invoicing
* Reports
* Advanced UI

## Exit Criteria

Sprint 1 is complete when:

* The app launches locally.
* The desktop shell opens successfully.
* The frontend renders inside Tauri.
* Basic routing exists.
* The project structure matches the documented architecture.
* The development workflow is repeatable.

---

# Sprint 2: Database Foundation

## Objective

Set up the local database infrastructure that every data feature depends on.

## Scope

* SQLite integration in the Rust backend
* Database initialization on first launch
* Migration system for schema evolution
* Database service abstraction layer
* Database file location documentation
* Backup and export foundation
* Version management for schema tracking
* Data persistence verification across app restarts

## Out of Scope

* Domain entity definitions (Sprint 3)
* Repository pattern (Sprint 3)
* Transaction engine (Sprint 4)
* Plaid sync
* Encryption
* Invoicing
* Reports
* UI polish

## Exit Criteria

Sprint 2 is complete when:

* Ledger can create and open a local SQLite database.
* Migrations run reliably on first launch and on schema changes.
* Database service abstraction isolates SQLite from the rest of the backend.
* Data persists after app restart.
* Database file location is documented.
* Backup/export design is documented.

---

# Sprint 3: Core Domain Entities

## Objective

Define and implement the core domain entities behind a repository abstraction.

## Scope

* Core domain entity definitions (workspaces, accounts, categories)
* Repository pattern for data access
* Account CRUD operations via Tauri commands
* Category CRUD with seed/default data
* Validation layer for domain entities
* Local persistence architecture documentation
* Foreign key behavior documented and tested

## Out of Scope

* Transaction engine (Sprint 4)
* Dashboard or summary UI
* Plaid
* Licensing
* Stripe
* Receipts
* Invoicing
* AP/AR
* Reports

## Exit Criteria

Sprint 3 is complete when:

* Workspaces, accounts, and categories can be created, read, updated, and deleted via Tauri commands.
* Repository pattern provides a clean boundary between domain logic and storage.
* Domain entity validation prevents invalid data from reaching the database.
* Foreign key constraints are enforced and tested.
* Seed/default categories are available on first launch.

---

# Sprint 4: Transaction Engine

## Objective

Build the transaction engine with search, filtering, and import foundation.

## Scope

* Transaction CRUD operations via Tauri commands
* Transaction search capabilities
* Transaction filtering (date, category, amount, account)
* Import foundation (data layer for future CSV import UI)
* Data integrity validation and constraints
* Performance validation with representative datasets

## Out of Scope

* CSV import UI (column mapping, preview, file picker)
* Auto-categorization rules
* Dashboard or report UI
* Cloud backup
* Cloud sync

## Exit Criteria

Sprint 4 is complete when:

* Transactions can be created, read, updated, and deleted via Tauri commands.
* Transactions can be searched and filtered by date, category, amount, and account.
* Import data path exists for programmatic transaction creation.
* Data integrity constraints are enforced.
* Performance is validated against representative dataset sizes.

---

# Sprint 5: Accounts UI (Complete)

## Objective

Transform the completed local data platform into the first usable personal finance application, starting with account management. Connect existing repositories and Tauri commands to the desktop UI.

## Scope (as delivered)

* Workspace initialization and context
* Account UI (list, create, edit, archive/restore — permanent delete deferred)
* Empty states, loading states, error states, confirmation dialogs

## Out of Scope

* Categories UI (Sprint 7)
* Transactions UI (Sprint 6)
* Dashboard (Sprint 8)
* Budgets, goals, reports (Future — see below)
* CSV import
* Onboarding wizard, app lock (Future — see below)
* Plaid, licensing, cloud sync

## Exit Criteria

Sprint 5 is complete when:

* Users can create workspaces and manage the reversible account lifecycle through the desktop UI.
* Data persists after closing and reopening the application.
* Destructive-adjacent actions (archive) have confirmation dialogs with clear consequence descriptions.
* No budgets, goals, reports, or charts exist.

See `docs/sprint-notes/sprint-5.md` for the full closeout record, including why Categories, Transactions, and Dashboard were narrowed out of this sprint's actual delivery.

---

# Sprint 6: Transactions UI

## Objective

A user can view, create, edit, and safely delete locally stored financial transactions across their accounts, with account balances updating automatically.

## Scope

* Transaction table: list, create, edit, delete
* Single-account filter and basic Previous/Next pagination
* Amount entry via a direction toggle (Income/Expense) plus a positive-amount input

## Out of Scope

* Full multi-field filtering (category, date range, direction) and text search — candidates for a later review phase
* Keyboard shortcuts
* Budgets, goals, reports (Future — see below)
* Dashboard (Sprint 8)
* CSV import, Plaid, licensing, cloud sync

## Exit Criteria

Sprint 6 is complete when:

* Users can create, view, edit, and delete transactions through the desktop UI.
* Account balances update automatically after every transaction change.
* Data persists after closing and reopening the application.

See `docs/sprint-notes/sprint-6.md` for the full implementation plan.

---

# Sprint 7: Categories UI

## Objective

A user can manage the categories used to organize transactions, with system categories protected from renaming or deletion.

## Scope

* Categories page listing categories grouped by income/expense type
* Create category dialog with duplicate-name conflict handling
* Edit category dialog (system categories: name disabled)
* Delete category with confirmation (user categories: warns about uncategorized transactions; system categories: deletion disabled)

## Out of Scope

* Dashboard (Sprint 8)
* Budgets, goals, reports (Future — see below)
* Plaid, licensing, cloud sync

## Exit Criteria

Sprint 7 is complete when:

* Users can view categories grouped by income and expense type.
* Users can create, edit, and delete user-created categories.
* System categories cannot be renamed or deleted (backend enforces, UI reflects it).

A detailed implementation plan (`docs/sprint-notes/sprint-7.md`) will be written before this sprint begins, per the Documentation First rule.

---

# Sprint 8: Dashboard

## Objective

A user gets an at-a-glance summary of their finances on launch.

## Scope

* Total balance card (sum of active account balances)
* Active account count card
* Monthly income and monthly expenses cards (500-row limitation documented if exceeded)
* Recent transactions list
* Empty state for new users

## Out of Scope

* Budgets, goals, reports, charts (Future — see below)
* Plaid, licensing, cloud sync

## Exit Criteria

Sprint 8 is complete when:

* Dashboard displays total balance, account count, and monthly income/expense totals.
* Dashboard displays recent transactions.
* New users see an appropriate empty state.

A detailed implementation plan (`docs/sprint-notes/sprint-8.md`) will be written before this sprint begins, per the Documentation First rule.

---

# Future: Unscheduled Product Domains

The domains below follow Sprint 8 but do not yet have assigned sprint numbers or a committed detailed schedule, per the Product Owner decision of 2026-07-19. Budgets, Goals, and Reports were previously bundled as a single sprint; they are now separate future domains to be replanned individually rather than treated as one immediate sprint. See [docs/milestones.md](../milestones.md#future-milestones-unscheduled) for the authoritative version of this list.

## Future: Budgets

Monthly budget creation, editing, and progress tracking.

## Future: Goals

Savings goals.

## Future: Reports

Spending-by-category report, income-vs-expense report, month comparison view, basic profit/loss for business workspaces, dashboard report widgets, CSV import/export.

## Future: Security & Onboarding

First-launch onboarding flow, local password/PIN setup, app unlock screen, auto-lock setting, local database security design, keychain integration research, backup reminder, privacy explanation screen, settings foundation.

## Future: Business Finance

Client management, vendor management, invoice creation with line items, invoice status tracking, invoice PDF/export, receipt attachment on transactions, accounts payable tracking, accounts receivable tracking, business workspace reports.

## Future: Commercial Readiness

License activation flow, trial mode, license status UI, device activation policy, Stripe purchase flow documentation, Keygen or equivalent licensing integration, update policy documentation, terms/privacy/support documentation, release notes structure.

## Future: Installer, Updates, and Distribution

macOS build, Windows build, installer generation, code signing research and setup, auto-update system, release artifacts, GitHub Actions build pipeline, crash/error reporting strategy, private beta distribution process.

## Future: Beta Hardening

Data integrity testing, import edge cases, large dataset testing, error handling, backup/restore testing, installer testing, update testing, license edge cases, Plaid sandbox testing, UX polish, documentation polish.

## Future: Public Launch Preparation

Landing page, pricing page, download page, purchase flow, license email flow, documentation site, privacy policy, terms of use, refund policy, support workflow, public release checklist, launch announcement.

## Future: Optional Connected Services (Plaid Bank Sync)

Plaid architecture finalization, cloud relay implementation, Link token flow, token exchange flow, transactions sync, balance refresh, subscription entitlement checks, connected accounts UI, sync status, institution repair flow, Plaid error handling.

## Sequencing

Ordering among these domains is not yet finalized as a formal sprint sequence. The one fixed constraint carried over from prior planning: **Optional Connected Services (Plaid) remains positioned after commercial readiness** — the local product must be excellent without bank sync before Plaid is introduced.

---

# Version 1.0 Target Scope

Version 1.0 should include:

* Desktop app for macOS and Windows
* Local SQLite database
* Workspaces
* Accounts
* Transactions
* Categories
* Dashboard
* CSV import
* CSV export
* Budgets
* Goals
* Basic reports
* Backup/restore workflow
* Settings
* Local app lock
* License activation
* Trial mode
* Installers
* Auto-update mechanism
* Basic documentation

Version 1.0 may include, depending on complexity:

* Invoicing
* Receipts
* Clients/vendors
* AP/AR
* Plaid bank sync

These may also be deferred to version 1.1 if needed.

---

# Version 1.1 Candidate Scope

Version 1.1 may include:

* Plaid bank sync if not included in 1.0
* Improved reports
* Recurring transactions
* Rules-based categorization
* Receipt improvements
* Invoice templates
* Better dashboard customization
* Import presets
* More export options

---

# Version 2.0 Candidate Scope

Version 2.0 may include:

* Cloud backup
* Optional encrypted cloud sync
* Multi-device sync
* Mobile companion app
* Collaboration for business workspaces
* Advanced automation
* AI-assisted categorization
* Advanced forecasting
* Plugin system

These features should only be pursued if they can preserve Ledger's local-first philosophy.

---

# Explicitly Deferred Features

The following should not be included in the initial release:

* Payroll
* Tax filing
* Accountant portal
* Inventory management
* Crypto trading
* Stock trading
* Payment processing
* Enterprise approval workflows
* Multi-user permissions
* Full double-entry accounting
* Public API
* Mobile app
* Cloud-first storage
* Advertisements
* Social finance features

---

# Roadmap Guardrails

The roadmap should always preserve:

* Local-first data ownership
* Offline-first core functionality
* One-time purchase for the core app
* Optional subscriptions only for recurring-cost services
* No artificial subscription gating
* No forced cloud account for core use
* No enterprise feature creep
* No rushed releases that risk user data integrity

---

# Final Roadmap Principle

Ledger should not become impressive by being large.

Ledger should become valuable by being trusted.

Every sprint should make Ledger more reliable, more understandable, and more useful to the users it was designed to serve.
