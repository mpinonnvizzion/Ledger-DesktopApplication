# Commercial Model Specification

**Version:** 1.0
**Status:** Draft
**Sprint:** 0

---

## Purpose

This document specifies the commercial model for Ledger Desktop, consolidating decisions from the Business Model, Pricing and Packaging, and Licensing and Activation documents.

---

## Commercial Identity

Ledger Desktop is a commercial desktop application. It is not SaaS. It is not freemium. It is professional software sold as a one-time purchase with optional subscription add-ons for recurring-cost services.

---

## Pricing Structure

### Core Application

| Item | Model | Target Price |
|------|-------|-------------|
| Ledger Desktop | One-time purchase | $79 |

Includes all local features: workspaces, accounts, transactions, categories, budgets, goals, reports, CSV import/export, backup/restore, invoicing, clients, vendors, receipts, AP/AR, settings, local app lock.

### Bank Sync Add-On

| Item | Model | Target Price |
|------|-------|-------------|
| Bank Sync (monthly) | Subscription | $7/month |
| Bank Sync (annual) | Subscription | $70/year |

Includes Plaid bank connections (up to 5 institutions), transaction sync, balance refresh.

### Trial

| Item | Duration |
|------|----------|
| Full-feature trial | 14 days |

Trial includes all local features. Trial excludes Plaid Bank Sync.

---

## License Model

- Perpetual license for the purchased major version (e.g., Ledger 1.x)
- Up to 3 device activations per license
- Minor updates included (1.0.x, 1.1, 1.2, etc.)
- Major upgrades (2.0) may be paid with existing customer discount
- License key issued after Stripe purchase
- Activation via Keygen or equivalent provider

---

## License States

| State | Behavior |
|-------|----------|
| Trial Active | Full local access, countdown in Settings |
| Trial Expired | View/export data only, no new records |
| Activated | Full local access, no subscription required |
| Activated + Bank Sync | Full access + Plaid sync enabled |
| Bank Sync Expired | Core app continues, sync stops, local data stays |
| Validation Pending (offline) | App continues with grace period |
| License Invalid/Revoked | Clear messaging, export still allowed |

---

## Offline Grace Policy

- License validates during activation
- Periodic revalidation every 7 days when online
- If offline, app continues working
- After 7 days offline: gentle reminder
- After 30 days offline: stronger reminder
- Network failure is never treated as license failure
- Users are never locked out of local data due to network issues

---

## Payment Infrastructure

| Component | Provider |
|-----------|----------|
| Payments | Stripe |
| Licensing | Keygen or equivalent |
| Email delivery | TBD |

### Purchase Flow

1. Customer purchases via Stripe Checkout on website
2. Stripe webhook triggers license key creation
3. License key emailed to customer
4. Customer downloads app and activates with license key

### Bank Sync Subscription Flow

1. Customer subscribes via Stripe (from within app or website)
2. Stripe updates subscription status
3. License provider updates Bank Sync entitlement
4. App validates entitlement and enables sync

---

## Cancellation Behavior

When a user cancels Bank Sync:
- Automatic sync stops
- New bank connections are disabled
- Existing synced transactions remain available and editable
- Manual transactions continue working
- CSV import continues working
- Reports continue working
- User can resubscribe later

Cancellation never deletes local financial data.

---

## Refund Policy

- Core app: 30-day refund window
- Refund may disable the license
- Export access remains available even after refund
- Subscription refunds handled separately

---

## Pricing Communication

The pricing page must clearly explain:
- What is included in the one-time purchase
- What requires a subscription and why
- What happens if a subscription is canceled
- Whether data remains accessible
- Device activation limits
- Trial and refund policies

---

## Guardrails

- Core financial features are never subscription-only
- No artificial feature crippling to force upgrades
- No dark patterns in pricing or subscription management
- No forced cloud account for core features
- Users always retain access to their local data
- Export is never gated behind payment
