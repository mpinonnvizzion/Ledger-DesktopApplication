# ADR 0006: One-Time Purchase With Optional Subscriptions

**Status:** Accepted
**Date:** 2026-07-07

## Context

Most modern finance applications use mandatory subscription models. Ledger Desktop's product strategy is to differentiate by offering a one-time purchase for the core application, reserving subscriptions only for services that create recurring operational costs.

The business model, pricing, and product guardrails documents all establish that:
- The core app is a one-time purchase
- Subscriptions exist only for recurring-cost services
- Core financial management features are never subscription-gated
- The business model should feel fair and transparent

## Decision

Ledger Desktop will be sold as a one-time purchase. Optional subscriptions will exist only for services that incur recurring third-party or infrastructure costs.

**One-time purchase includes:**
All local features — workspaces, accounts, transactions, categories, budgets, goals, reports, CSV import/export, backup/restore, invoicing, clients, vendors, receipts, AP/AR, settings, and local app lock.

**Subscription-gated (Bank Sync Add-On):**
Plaid bank synchronization, which requires ongoing Plaid API costs and cloud relay infrastructure.

**Future subscription candidates (only if recurring costs exist):**
- Cloud backup
- Cloud sync
- AI-assisted services using external model APIs

**Target pricing (planning anchor, not final):**
- Core app: $79 one-time purchase
- Bank Sync: $7/month or $70/year
- 14-day full-feature trial

## Consequences

- Customers feel ownership, not rental
- The business model is a product differentiator and trust signal
- Plaid costs are covered by subscription revenue rather than baked into the purchase price
- Revenue per customer is lower than subscription competitors but more predictable per sale
- Major version upgrades (e.g., 1.x → 2.0) may be paid to fund ongoing development
- The business must achieve sustainable unit economics without forced subscriptions
