# App Scope Specification

**Version:** 1.0
**Status:** Draft
**Sprint:** 0

---

## Purpose

This document defines what Ledger Desktop includes and excludes at launch (Version 1.0) and in future releases. It serves as the scope boundary for development decisions.

---

## Product Definition

Ledger Desktop is a commercial, local-first desktop finance application for individuals, freelancers, and small businesses. It is not SaaS. User financial data is stored locally by default. The core app works offline. Subscriptions exist only for recurring-cost services.

---

## Version 1.0 Scope

### Included in v1.0

**Data Foundation**
- Local SQLite database
- Multi-workspace support (personal and business)
- Accounts (checking, savings, credit card, cash, investment, loan, other)
- Transactions with date, amount, description, category, notes
- Categories with hierarchy (income, expense)
- Data persistence across app restarts

**Daily Financial Workflow**
- Dashboard with summary widgets
- Account list and detail views
- Transaction list with search, sort, and filter
- Transaction create, edit, delete
- Category assignment
- Quick entry for common transactions

**Import and Export**
- CSV import with column mapping and preview
- Duplicate detection during import
- CSV export
- Manual database backup
- Restore workflow documentation

**Planning and Reporting**
- Monthly budgets
- Budget progress tracking
- Savings goals
- Spending by category report
- Income vs. expense report
- Month comparison view

**Settings and Security**
- Application settings
- Local password/PIN protection
- App lock screen
- First-launch onboarding

**Commercial**
- License activation (Keygen or equivalent)
- 14-day full-feature trial
- License status display
- Device activation (up to 3 devices)

**Distribution**
- macOS installer (.dmg)
- Windows installer (.msi/.exe)
- Auto-update mechanism
- Code signing (target)

### May be included in v1.0 (depending on complexity)

- Budgets and goals
- Invoicing with line items
- Receipts attached to transactions
- Client and vendor management
- Accounts payable / accounts receivable
- Plaid bank synchronization

### Explicitly excluded from v1.0

- Payroll
- Tax filing
- Accountant portal
- Inventory management
- Crypto or stock trading
- Payment processing
- Enterprise approval workflows
- Multi-user permissions
- Full double-entry accounting
- Public API
- Mobile app
- Cloud sync
- Cloud backup
- AI finance coaching
- Social finance features

---

## Future Version Candidates

### Version 1.1
- Plaid bank sync (if not in 1.0)
- Recurring transactions
- Rules-based categorization
- Improved reports
- Invoice templates
- Import presets

### Version 2.0
- Optional encrypted cloud backup
- Optional multi-device sync
- Mobile companion app
- Advanced automation
- AI-assisted categorization
- Plugin system

---

## Scope Decision Framework

Before adding a feature to any version, ask:

1. Does it solve a real problem for the target customer?
2. Does it preserve local-first and offline-first operation?
3. Does it maintain simplicity?
4. Can it be supported long-term?
5. Is it documented?

If any answer is no, defer or redesign the feature.
