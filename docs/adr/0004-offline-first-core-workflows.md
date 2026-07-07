# ADR 0004: Offline-First Core Workflows

**Status:** Accepted
**Date:** 2026-07-07

## Context

Ledger Desktop is designed for users who value reliability and independence from cloud services. The product vision states that the application should remain fully functional without an internet connection and that internet connectivity should enhance the experience, not define it.

Many competing finance applications require constant connectivity for basic operations. This creates a dependency that conflicts with Ledger's positioning.

## Decision

All core financial management workflows in Ledger Desktop must function without an internet connection.

**Must work offline:**
- Opening the application
- Viewing all financial data (accounts, transactions, categories, budgets, reports)
- Creating, editing, and deleting transactions
- Managing accounts and categories
- Creating and reviewing budgets and goals
- Generating reports
- Importing CSV files
- Exporting data
- Backing up the database
- Creating invoices and managing clients/vendors

**May require internet (with graceful degradation):**
- Initial license activation
- Periodic license revalidation (7-day grace period when offline)
- Plaid bank synchronization (requires active subscription and connectivity)
- App update checks
- Stripe purchase and subscription management

## Consequences

- The core application is self-sufficient on the user's machine
- License validation uses a grace period rather than hard blocking on network failure
- Plaid sync is an enhancement, not a requirement for daily use
- The app must handle offline-to-online transitions gracefully
- Connected features must clearly communicate when they need internet
- Manual workflows (CSV import, manual transactions) remain first-class features
