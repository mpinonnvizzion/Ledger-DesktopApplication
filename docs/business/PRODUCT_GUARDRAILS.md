# Product Guardrails

**Version:** 1.0
**Status:** Draft
**Owner:** Product Owner

---

# Purpose

This document defines the non-negotiable product guardrails for Ledger Desktop.

Guardrails exist to protect the product from drifting away from its mission as it grows.

Ledger should evolve, but it should not lose the principles that make it distinct.

Every feature request, sprint, architecture decision, pricing decision, and roadmap change should be evaluated against these guardrails.

---

# Core Product Identity

Ledger is a commercial desktop finance application.

It is:

* Local-first
* Offline-first
* Privacy-first
* Desktop-first
* Ownership-first
* Built for individuals, freelancers, and small businesses
* Sold as a one-time purchase for the core application
* Supported by optional subscriptions only for recurring-cost services

Ledger is not a SaaS platform.

Ledger is not an enterprise accounting system.

Ledger is not a cloud-first personal finance app.

Ledger is not a mandatory subscription product.

---

# Guardrail 1: Local-First by Default

User financial data should be stored locally by default.

The user should understand where their data lives and how to back it up, restore it, export it, and move it.

Ledger should never require proprietary cloud storage for core financial management.

## Allowed

* Local SQLite database
* Manual backups
* Local exports
* Optional encrypted cloud backup in the future
* Optional encrypted cloud sync in the future

## Not Allowed

* Cloud-only data storage
* Mandatory hosted accounts for local features
* Making user data inaccessible without an online service
* Locking exports behind a subscription

---

# Guardrail 2: Offline-First Core Functionality

Ledger's core financial workflows must work without an internet connection.

Users should be able to open the app, view records, create transactions, edit categories, review budgets, and export data while offline.

## Allowed

* Online license revalidation with reasonable grace periods
* Optional Plaid sync when online
* Optional update checks
* Optional connected services

## Not Allowed

* Requiring internet access to use core records
* Blocking access to local data because a network request fails
* Making daily finance workflows dependent on remote APIs

---

# Guardrail 3: User Ownership Comes First

Users must feel that they own both the application and their financial records.

Ledger should never treat user data as hostage to a business model.

## Required

* Export options
* Backup options
* Clear storage location documentation
* Clear subscription cancellation behavior
* Continued access to historical local data

## Not Allowed

* Locking local data after subscription cancellation
* Disabling exports after trial expiration
* Removing access to records because a license server is unavailable
* Creating artificial dependency on Ledger-controlled infrastructure

---

# Guardrail 4: Subscriptions Only for Recurring-Cost Services

Subscriptions should pay for services, not ownership.

The core application should be purchased once.

A subscription is acceptable only when the feature creates ongoing third-party or infrastructure costs.

## Allowed Subscription Features

* Plaid bank synchronization
* Future encrypted cloud backup
* Future encrypted cloud sync
* Future collaborative workspaces
* Future AI-assisted services
* Future hosted automation services

## Not Allowed as Subscription-Only Core Features

* Transactions
* Accounts
* Categories
* Budgets
* Goals
* Reports
* CSV import
* CSV export
* Backup
* Restore
* Invoices
* Clients
* Vendors
* Receipts
* AP/AR
* Local database access

---

# Guardrail 5: No Artificial Feature Gating

Feature gating should be honest.

Ledger may separate personal and business license tiers later, but it should not artificially cripple the product to force upgrades.

## Allowed

* Trial limits
* Device activation limits
* Plaid subscription gating
* Business license for commercial use
* Paid major version upgrades

## Not Allowed

* Locking basic reports behind a subscription
* Limiting local transaction history to force payment
* Preventing export to create retention
* Removing purchased features later
* Creating confusing upgrade pressure

---

# Guardrail 6: Privacy Is a Product Feature

Ledger should collect the minimum information necessary to license, update, support, and improve the product.

Privacy should be explained clearly in plain language.

## Required

* Clear privacy documentation
* Minimal telemetry
* No unnecessary account creation
* No advertising trackers inside the desktop app
* Clear explanation of what Plaid requires
* Clear explanation of what data leaves the device

## Not Allowed

* Selling customer financial data
* Advertising inside the app
* Hidden tracking
* Uploading financial data by default
* Using customer data for unrelated business purposes

---

# Guardrail 7: Financial Data Integrity Is More Important Than Speed

Ledger handles sensitive financial records.

Data correctness matters more than fast feature delivery.

## Required

* Migrations must be safe
* Import flows must be validated
* Duplicate detection must be careful
* Destructive actions must be confirmed
* Backups must be encouraged
* Sync conflicts must be handled intentionally

## Not Allowed

* Rushed migrations
* Silent data deletion
* Unclear import behavior
* Automatic destructive actions without confirmation
* Sync logic that can overwrite user records without review

---

# Guardrail 8: Simplicity Over Feature Bloat

Ledger should become powerful without becoming overwhelming.

Every feature must earn its place.

## Required Before Adding a Feature

Ask:

1. Does this solve a real problem for the target customer?
2. Does this strengthen the core product?
3. Can it be maintained long term?
4. Does it fit Ledger's local-first model?
5. Does it make the app harder to understand?

## Not Allowed

* Adding features only because competitors have them
* Enterprise workflows before small business workflows are excellent
* Complex settings for rare use cases
* UI clutter that reduces confidence
* Features that cannot be supported properly

---

# Guardrail 9: Do Not Become Full Enterprise Accounting Software

Ledger may support lightweight business finance, but it should not become QuickBooks, Xero, or an ERP.

## Allowed

* Business workspaces
* Clients
* Vendors
* Invoices
* Receipts
* AP/AR
* Basic business reports
* Simple profit and loss views

## Deferred or Not Allowed Early

* Payroll
* Tax filing
* Accountant portal
* Inventory management
* Multi-user approval workflows
* Full double-entry accounting
* Audit trails for regulated enterprises
* Department-level accounting
* Enterprise permissions

---

# Guardrail 10: Manual Workflows Must Remain Excellent

Plaid is optional.

The product must still be valuable for users who never connect a bank account.

## Required

* Manual transactions
* CSV import
* CSV export
* Import mapping
* Duplicate detection
* Manual account balance management
* Clear transaction editing
* Useful reports without bank sync

## Not Allowed

* Treating manual users as second-class customers
* Designing the app so Plaid is required for usefulness
* Making CSV import fragile or hidden
* Over-prioritizing bank sync before local workflows are excellent

---

# Guardrail 11: Commercial Quality Is Required

Ledger is intended to be sold.

It should feel like a serious commercial product.

## Required

* Professional onboarding
* Clear error messages
* Stable installers
* Signed builds
* Auto-update strategy
* Documentation
* Support workflow
* Release notes
* Backup guidance
* Predictable UX

## Not Allowed

* Hobby-project polish
* Confusing installation
* Unclear pricing
* Unclear license behavior
* Broken update paths
* Incomplete documentation for critical workflows

---

# Guardrail 12: Desktop Experience Should Feel Native and Fast

Ledger should feel like a proper desktop application, not a slow web app in a window.

## Required

* Fast startup
* Responsive navigation
* Keyboard-friendly workflows
* Efficient search
* Large dataset performance
* Native-feeling menus where appropriate
* Clean window behavior

## Not Allowed

* Heavy unnecessary animations
* Slow dashboard rendering
* Laggy transaction tables
* UI patterns that feel mobile-first on desktop
* Overuse of web-app conventions that hurt desktop usability

---

# Guardrail 13: Customer Trust Beats Short-Term Revenue

Ledger should optimize for long-term trust.

A customer should feel safe buying, using, renewing, upgrading, and recommending Ledger.

## Required

* Clear pricing
* Clear refund policy
* Clear subscription cancellation behavior
* Clear privacy language
* Honest limitations
* No dark patterns

## Not Allowed

* Hiding cancellation
* Confusing subscription terms
* Misleading “free” claims
* Forced upsells during critical workflows
* Removing access to purchased functionality
* Prioritizing revenue extraction over product trust

---

# Guardrail 14: The Existing Ledger App Is Reference Only

The current Ledger application may inform features, workflows, and business logic.

It should not dictate the new architecture.

## Allowed

* Studying existing features
* Reusing product lessons
* Referencing UI patterns
* Comparing workflows
* Learning from previous data structures

## Not Allowed

* Modifying the current production app directly
* Treating old architecture as final
* Copying technical decisions without review
* Migrating code blindly
* Breaking the user's current working Ledger setup

---

# Guardrail 15: Every Major Decision Must Be Documented

Ledger should remain documentation-first.

## Required

Major decisions should update:

* PRD
* Architecture
* Tasks
* Changelog
* Relevant specification
* Relevant ADR
* Sprint notes

## Not Allowed

* Undocumented architecture changes
* Implementing features without specifications
* Silent changes to business model
* Sprint work without review
* Code changes that contradict documentation

---

# Feature Approval Checklist

Before approving a feature, answer:

1. Who is this feature for?
2. What problem does it solve?
3. Is it required for version 1.0?
4. Does it preserve local-first operation?
5. Does it preserve offline-first core functionality?
6. Does it protect user ownership?
7. Does it introduce recurring costs?
8. Does it belong in the core app or optional subscription?
9. Does it increase support burden?
10. Can it be maintained long term?
11. Does it improve trust?
12. Does it align with the PRD?

If the answer is unclear, the feature should be documented further before implementation.

---

# Final Principle

Ledger should grow carefully.

The product should become more capable over time, but never at the cost of trust, ownership, privacy, data integrity, or simplicity.

A smaller product that users trust is better than a larger product they doubt.
