# Data Model Overview Specification

**Version:** 1.0
**Status:** Draft
**Sprint:** 0

---

## Purpose

This document provides a high-level overview of Ledger Desktop's data model. Detailed schema definitions will be created during Sprint 2 (Local Database Foundation).

---

## Storage

All user financial data is stored in a local SQLite database on the user's machine. The database is a single file managed by the Rust backend. The frontend never accesses SQLite directly.

Ledger Desktop is not SaaS. No financial data is stored on remote servers by default.

---

## Core Entities

### Workspace

A workspace is the top-level organizational unit. Users may have a personal workspace and one or more business workspaces.

Key attributes:
- Name
- Type (personal, business)
- Created date
- Settings (currency, date format)

### Account

A financial account within a workspace.

Key attributes:
- Name
- Type (checking, savings, credit card, cash, investment, loan, other)
- Currency
- Current balance
- Institution name (optional)
- Active/archived status
- Workspace reference

### Transaction

A single financial event.

Key attributes:
- Date
- Amount (positive for income, negative for expense, or use type flag)
- Description / payee
- Category reference
- Account reference
- Notes (optional)
- Cleared/reconciled status
- Source (manual, CSV import, Plaid sync)
- Import session reference (if imported)

### Category

A classification for transactions.

Key attributes:
- Name
- Type (income, expense)
- Parent category reference (for hierarchy)
- Icon or color (optional)
- System default vs. user-created flag

### Budget

A monthly spending target for a category or group of categories.

Key attributes:
- Category reference
- Month/year
- Budgeted amount
- Workspace reference

### Goal

A savings or financial target.

Key attributes:
- Name
- Target amount
- Current amount or linked account
- Target date (optional)
- Workspace reference

### Client

A customer or client for business workspaces.

Key attributes:
- Name
- Contact information
- Notes
- Workspace reference

### Vendor

A supplier or service provider for business workspaces.

Key attributes:
- Name
- Contact information
- Notes
- Workspace reference

### Invoice

A billing document for business workspaces.

Key attributes:
- Invoice number
- Client reference
- Issue date
- Due date
- Status (draft, sent, paid, overdue, cancelled)
- Line items (description, quantity, unit price, amount)
- Total amount
- Notes
- Workspace reference

### Receipt

An attachment linked to a transaction.

Key attributes:
- File path or embedded data
- Transaction reference
- Upload date
- Notes (optional)

### Import Session

A record of a CSV import operation.

Key attributes:
- File name
- Import date
- Account reference
- Row count (total, imported, skipped, duplicate)
- Column mapping used
- Status (completed, partial, failed)

### Connected Account (Plaid)

A bank connection for users with an active Bank Sync subscription.

Key attributes:
- Institution name
- Account name and mask
- Account type
- Plaid item ID (stored securely)
- Last sync date
- Sync status
- Account reference (linked local account)

---

## Relationships

```
Workspace
  ├── Account
  │     ├── Transaction
  │     │     ├── Category
  │     │     └── Receipt
  │     └── Connected Account (Plaid)
  ├── Category (hierarchy)
  ├── Budget
  ├── Goal
  ├── Client
  ├── Vendor
  └── Invoice
        └── Invoice Line Item
```

---

## Data Integrity Rules

- Transactions must reference a valid account
- Accounts must reference a valid workspace
- Deleting an account should warn about associated transactions
- Deleting a category should allow reassignment of transactions
- Import duplicate detection should use date + amount + description heuristics
- Plaid-synced transactions should be distinguishable from manual entries
- Database migrations must be safe and tested before release

---

## Backup and Export

- The SQLite database file can be copied directly as a backup
- The application should provide a backup workflow that copies the file to a user-chosen location
- CSV export should be available for transactions and reports
- Users should always be able to export their data, including after trial expiration

---

## Future Considerations

- Recurring transaction templates
- Transaction rules for auto-categorization
- Tags or labels on transactions
- Multi-currency support
- Attachment storage optimization
- Data migration from Ledger v3
