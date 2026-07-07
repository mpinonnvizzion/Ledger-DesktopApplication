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

# Sprint 5: Budgets, Goals, and Reports

## Objective

Help users understand and plan their finances.

## Scope

* Monthly budgets
* Budget progress
* Goals
* Spending by category
* Income vs expense report
* Month comparison
* Basic profit/loss view for business workspaces
* Dashboard report widgets

## Out of Scope

* Advanced forecasting
* Tax reporting
* Investment analysis
* AI insights
* Cloud sync

## Exit Criteria

Sprint 5 is complete when:

* Users can create budgets.
* Users can track budget progress.
* Users can create savings goals.
* Users can view basic reports.
* Business users can see simple income/expense summaries.

---

# Sprint 6: Local Security and Onboarding

## Objective

Make Ledger feel safe, professional, and ready for real user data.

## Scope

* First-launch onboarding
* Local password or PIN
* App unlock screen
* Auto-lock setting
* Local database security design
* Keychain integration research
* Backup reminder
* Privacy explanation
* Settings foundation

## Out of Scope

* Plaid token encryption
* License activation
* Stripe
* Production code signing

## Exit Criteria

Sprint 6 is complete when:

* New users have a guided first-launch experience.
* Users can protect the app with a password or PIN.
* Users understand that their data is local.
* Users can configure basic app settings.
* Security limitations are documented honestly.

---

# Sprint 7: Lightweight Business Finance

## Objective

Add the business workflows needed by freelancers and small businesses.

## Scope

* Clients
* Vendors
* Invoices
* Invoice line items
* Invoice status
* Basic invoice PDF/export
* Receipts
* Accounts payable
* Accounts receivable
* Business workspace reports

## Out of Scope

* Payroll
* Tax filing
* Accountant portal
* Payment processing
* Inventory
* Full double-entry accounting

## Exit Criteria

Sprint 7 is complete when:

* Business users can manage clients and vendors.
* Business users can create invoices.
* Business users can track receivables and payables.
* Receipts can be attached to transactions.
* Business workspaces feel distinct from personal workspaces.

---

# Sprint 8: Commercial Readiness

## Objective

Prepare Ledger to become a paid desktop product.

## Scope

* License activation flow
* Trial mode
* License status UI
* Device activation policy
* Stripe purchase flow documentation
* Keygen or equivalent licensing integration
* Update policy documentation
* Terms/privacy/support documentation
* Release notes structure

## Out of Scope

* Plaid sync
* Cloud backup
* Cloud sync
* Advanced subscriptions

## Exit Criteria

Sprint 8 is complete when:

* Users can activate Ledger with a license key.
* Trial behavior is defined and implemented.
* License status is visible in settings.
* The app can distinguish trial, activated, and expired trial states.
* Commercial documentation is ready for a private beta.

---

# Sprint 9: Installer, Updates, and Distribution

## Objective

Make Ledger installable and updateable on target platforms.

## Scope

* macOS build
* Windows build
* Installer generation
* Code signing research and setup
* Auto-update system
* Release artifacts
* GitHub Actions build pipeline
* Crash/error reporting strategy
* Private beta distribution process

## Out of Scope

* Public launch
* App Store distribution
* Microsoft Store distribution
* Mobile apps

## Exit Criteria

Sprint 9 is complete when:

* Ledger can be built for macOS and Windows.
* Installers are produced.
* Update mechanism is documented and tested.
* Private beta builds can be distributed safely.
* Release checklist exists.

---

# Sprint 10: Plaid Relay and Bank Sync

## Objective

Add optional subscription-based bank synchronization.

## Scope

* Plaid architecture finalization
* Cloud relay implementation
* Link token flow
* Token exchange flow
* Transactions sync
* Balance refresh
* Subscription entitlement checks
* Connected accounts UI
* Sync status
* Institution repair flow
* Plaid error handling

## Out of Scope

* Full cloud sync
* Multi-device database sync
* AI categorization
* Payment processing for invoices

## Exit Criteria

Sprint 10 is complete when:

* Users with an active bank sync subscription can connect accounts.
* Transactions can sync from Plaid.
* Balances can refresh.
* Expired subscriptions stop future sync.
* Previously synced data remains accessible.
* No Plaid secrets are stored inside the desktop app.

---

# Sprint 11: Beta Hardening

## Objective

Prepare Ledger for external beta users.

## Scope

* Data integrity testing
* Import edge cases
* Large dataset testing
* Error handling
* Backup/restore testing
* Installer testing
* Update testing
* License edge cases
* Plaid sandbox testing
* UX polish
* Documentation polish

## Out of Scope

* New major features
* Cloud sync
* Mobile
* Payroll
* Enterprise features

## Exit Criteria

Sprint 11 is complete when:

* Ledger is stable enough for private beta.
* Known risks are documented.
* Critical workflows are tested.
* Data loss risks are minimized.
* Support documentation exists.

---

# Sprint 12: Public Launch Preparation

## Objective

Prepare Ledger for initial public sale.

## Scope

* Landing page
* Pricing page
* Download page
* Purchase flow
* License email flow
* Documentation site
* Privacy policy
* Terms of use
* Refund policy
* Support workflow
* Public release checklist
* Launch announcement

## Out of Scope

* Feature expansion
* Mobile app
* Cloud sync
* Enterprise sales

## Exit Criteria

Sprint 12 is complete when:

* A customer can discover Ledger.
* A customer can buy Ledger.
* A customer can download Ledger.
* A customer can activate Ledger.
* A customer can use Ledger safely.
* A customer can get support.
* Ledger is ready for public launch.

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
