# Ledger Desktop — Project Definition

**Version:** 1.0
**Status:** Sprint 0 — Documentation Foundation

---

## What Is Ledger Desktop?

Ledger Desktop is a commercial desktop finance application for individuals, freelancers, and small businesses. It is local-first, offline-first, privacy-first, and sold as a one-time purchase with optional subscription services only where recurring operating costs exist.

Ledger Desktop is **not** SaaS. User financial data is stored locally by default. The core app works offline. Subscriptions exist only for recurring-cost services like Plaid bank synchronization.

---

## Product Identity

| Attribute | Value |
|-----------|-------|
| Product Type | Commercial desktop application |
| Data Storage | Local SQLite database |
| Internet Required? | No (core features work offline) |
| Purchase Model | One-time purchase |
| Subscriptions | Optional, only for recurring-cost services |
| Target Platforms | macOS, Windows |
| Target Customers | Individuals, freelancers, small businesses |

---

## Vision

Build the most trusted local-first personal finance application for individuals, freelancers, and small businesses. Every feature should help users better understand, organize, and manage their finances while respecting their privacy and ownership.

---

## What Ledger Desktop Will Not Become

- Software that requires a permanent internet connection
- Software that stores user financial data in proprietary cloud infrastructure by default
- Software that uses dark patterns to encourage subscriptions
- Software that gates essential financial management behind recurring payments
- Enterprise accounting software (no payroll, tax filing, ERP)
- A crypto or stock trading platform

---

## Core Product Domains

- Dashboard
- Accounts
- Transactions
- Categories
- Budgets
- Goals
- Reports
- Calendar
- Receipts
- Clients and Vendors
- Invoicing
- Accounts Payable / Accounts Receivable
- CSV Import / Export
- Multi-Workspace Management
- Settings and Licensing
- Bank Connections (optional, subscription-gated)

---

## Business Model Summary

| Component | Model |
|-----------|-------|
| Core Desktop App | One-time purchase (~$79) |
| Bank Sync Add-On | Monthly ($7/mo) or Annual ($70/yr) subscription |
| Future Cloud Services | Subscription only if recurring costs exist |
| Major Version Upgrades | Paid upgrade (e.g., 1.x → 2.0) |
| Minor Updates | Included with purchased major version |

---

## Existing Ledger App

The current Ledger application (v3) is reference material only. It informs product decisions but does not dictate architecture. The new Ledger Desktop is a clean-room implementation built on Tauri 2. See [ADR 0007](docs/adr/0007-existing-ledger-as-reference-only.md).

---

## Documentation Map

### Business Documents
- [Vision](docs/business/VISION.md)
- [Target Customer](docs/business/TARGET_CUSTOMER.md)
- [Business Model](docs/business/BUSINESS_MODEL.md)
- [Product Strategy](docs/business/PRODUCT_STRATEGY.md)
- [Competitor Analysis](docs/business/COMPETITOR_ANALYSIS.md)
- [Roadmap](docs/business/ROADMAP.md)
- [Product Guardrails](docs/business/PRODUCT_GUARDRAILS.md)
- [Pricing and Packaging](docs/business/PRICING_AND_PACKAGING.md)
- [Licensing and Activation](docs/business/LICENSING_AND_ACTIVATION.md)
- [Release Strategy](docs/business/RELEASE_STRATEGY.md)

### Product Documents
- [Product Requirements](docs/product/PRODUCT_REQUIREMENTS.md)

### Planning
- [Milestones](docs/milestones.md)
- [Tasks and Sprint Tracking](TASKS.md)

### Architecture
- [Architecture Overview](ARCHITECTURE.md)
- [Architecture Decision Records](docs/adr/)
- [Database Architecture](docs/architecture/database.md)
- [Repository Architecture](docs/architecture/repositories.md)
- [Tauri Command Architecture](docs/architecture/tauri-commands.md)
- [State Management](docs/architecture/state-management.md)
- [Folder Structure](docs/architecture/folder-structure.md)
- [Error Handling](docs/architecture/error-handling.md)
- [Backup and Restore](docs/architecture/backup-and-restore.md)

### Specifications
- [App Scope](docs/specifications/app-scope.md)
- [Data Model Overview](docs/specifications/data-model-overview.md)
- [Security Model](docs/specifications/security-model.md)
- [Onboarding Flow](docs/specifications/onboarding-flow.md)
- [Commercial Model](docs/specifications/commercial-model.md)
- [Plaid Bank Sync](docs/specifications/plaid-bank-sync.md)
- [Release and Distribution](docs/specifications/release-and-distribution.md)

### Reference
- [Ledger v3 Desktop Architecture](docs/reference/Ledger_v3_Desktop_Architecture.docx)
