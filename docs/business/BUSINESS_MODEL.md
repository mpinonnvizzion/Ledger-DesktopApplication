# Business Model

**Version:** 1.0  
**Status:** Draft  
**Owner:** Product Owner

---

# Purpose

This document defines how Ledger Desktop becomes a sustainable commercial software product.

Ledger is not a SaaS product. It is a desktop finance application sold as a one-time purchase, with optional subscription services only where ongoing infrastructure or third-party costs exist.

The business model should reinforce Ledger's core values:

- User ownership
- Privacy
- Fair pricing
- Long-term trust
- Sustainability

---

# Business Model Summary

Ledger will be sold as commercial desktop software.

The core application is purchased once and remains usable permanently.

Optional subscriptions may be offered for services that create ongoing costs, such as Plaid bank synchronization.

Core financial management features should not require a recurring subscription.

---

# Revenue Streams

Ledger has two primary revenue streams:

## 1. One-Time Desktop License

Customers purchase Ledger Desktop once.

This includes the full local application:

- Accounts
- Transactions
- Categories
- Budgets
- Goals
- Reports
- Calendar
- Receipts
- Clients
- Vendors
- Invoicing
- Accounts Payable
- Accounts Receivable
- CSV Import
- Multi-workspace support
- Backup and export
- Local database ownership

This purchase gives users the right to use the purchased major version permanently.

---

## 2. Optional Subscription Services

Subscriptions are only appropriate for features that create recurring operational costs.

Examples:

- Plaid bank synchronization
- Future cloud backup
- Future cloud sync
- Future collaborative workspaces
- Future AI-assisted services

Subscriptions should enhance the product, not define it.

A user who never subscribes should still have a complete and valuable desktop finance application.

---

# Subscription Philosophy

Subscriptions should pay for services, not ownership.

Ledger should never require a subscription for:

- Creating transactions
- Managing accounts
- Categorizing expenses
- Creating budgets
- Viewing reports
- Importing CSV files
- Creating invoices
- Managing clients or vendors
- Accessing local data
- Exporting user data
- Using previously purchased features

If a customer cancels a subscription, they should lose only the ongoing connected service.

They should not lose access to their historical data or core application features.

---

# Plaid Subscription Model

Plaid bank synchronization should be subscription-gated because it creates recurring costs.

The subscription may include:

- Bank account connections
- Transaction synchronization
- Balance refreshes
- Institution management
- Plaid item repair flows
- Up to a defined number of connected institutions

If the subscription expires:

- Automatic sync stops.
- Existing synced transactions remain available.
- Existing local data remains editable.
- Manual transactions and CSV import continue to work.
- The user may resubscribe later to resume sync.

This policy should be clearly communicated in the product and marketing site.

---

# Pricing Philosophy

Ledger should be priced as professional commercial software.

The goal is not to be the cheapest finance app.

The goal is to be a trustworthy, polished, sustainable alternative to cloud-first subscription finance software.

Pricing should support:

- Continued development
- Customer support
- Code signing costs
- Payment processing fees
- Licensing infrastructure
- Update infrastructure
- Plaid relay maintenance
- Documentation
- Long-term product quality

Underpricing creates long-term risk by making support and maintenance unsustainable.

---

# Initial Pricing Direction

Exact pricing should be finalized later, but the model should follow this direction:

## Core Application

One-time purchase.

Potential range:

```text
$49–$99
```

This should be positioned as a fair price for professional desktop software.

## Plaid Bank Sync Add-On

Monthly or annual subscription.

Potential range:

```text
$5–$10/month
```

or

```text
$50–$100/year
```

Pricing must account for Plaid costs, payment fees, relay infrastructure, customer support, and margin.

## Future Major Version Upgrade

Optional paid upgrade.

Example:

```text
Ledger 1.x purchase includes all 1.x updates.
Ledger 2.0 may require a paid upgrade.
Existing users may receive upgrade discounts.
```

This avoids forcing a SaaS model while still creating long-term revenue.

---

# License Types

Ledger may support multiple license types.

## Personal License

For individuals using Ledger for personal finances.

Potential rules:

- One purchaser
- Limited number of device activations
- Personal use only

## Business License

For freelancers or small businesses.

Potential rules:

- Commercial use allowed
- Higher device limit
- Business workspace support
- Priority support may be offered later

## Family License

Optional future license.

Potential rules:

- Household use
- Shared license for multiple devices
- Not for business use

These license types should remain simple at launch.

---

# Device Activation

Ledger should use license activation with reasonable device limits.

Possible launch policy:

```text
Up to 2 or 3 activated devices per license.
```

Device binding helps prevent casual license sharing without punishing legitimate customers.

Users should be able to deactivate old devices through a customer portal or support flow.

---

# Offline Grace Policy

Ledger should not punish customers for temporary lack of internet access.

Suggested policy:

- License is validated during activation.
- License is periodically rechecked when online.
- If offline, the app continues working.
- After an extended offline period, the app may show a reminder.
- The app should not immediately lock users out of local data.

A customer should never feel that Ledger is holding their financial records hostage.

---

# Trial Policy

Ledger may offer a trial to reduce purchase friction.

Potential options:

## Option A: Time-Limited Trial

Example:

```text
14-day free trial
```

Pros:

- Easy to understand.
- Lets users evaluate the app fully.

Cons:

- Requires license/trial tracking.
- May create support edge cases.

## Option B: Feature-Limited Trial

Example:

```text
Free trial with limited number of transactions or accounts.
```

Pros:

- Lets users test indefinitely.

Cons:

- Can feel artificial.
- Conflicts with the fair pricing philosophy if not handled carefully.

## Preferred Direction

A time-limited full-feature trial is likely the cleanest option.

Trial users should be able to export their data even if they do not purchase.

---

# Refund Policy

Ledger should have a clear and fair refund policy.

Suggested policy:

```text
30-day refund window for the core application.
```

Refunds help reduce purchase anxiety and reinforce trust.

The policy should be visible before purchase.

Subscription refunds should follow a separate policy based on billing period and usage.

---

# Update Policy

Ledger should provide updates in a predictable way.

## Minor Updates

Included with the purchased major version.

Examples:

- Bug fixes
- Security fixes
- Performance improvements
- Small feature improvements
- Compatibility updates

## Major Updates

May be paid upgrades.

Example:

```text
Ledger 1.x users receive all 1.x updates.
Ledger 2.0 may be a paid upgrade.
```

Existing customers may receive discounted upgrade pricing.

This model supports long-term development without forcing a mandatory subscription.

---

# Support Model

Support should begin simple and scale over time.

Initial support channels:

- Documentation
- FAQ
- Email support
- Known issues page
- Release notes

Future support options:

- Priority support for business licenses
- Help center
- Community forum
- In-app diagnostics export

Because finance software can create complex support issues, strong documentation should be treated as a business requirement.

---

# Customer Trust Rules

Ledger should never:

- Sell customer financial data.
- Display advertisements.
- Force cloud storage.
- Require a subscription for core features.
- Lock users out of local records.
- Remove purchased functionality.
- Hide pricing terms.
- Use dark patterns to push subscriptions.
- Make cancellation intentionally difficult.

Trust is a competitive advantage and should be protected.

---

# Data Ownership Policy

Customers own their data.

Ledger should support:

- Local database storage
- Manual backup
- Restore
- CSV export
- Report export
- Future full data export
- Clear documentation on where data is stored

Users should be able to leave Ledger without losing access to their financial records.

---

# Payment Flow

The intended payment flow:

1. User visits the Ledger website.
2. User purchases Ledger through Stripe Checkout.
3. Stripe confirms payment.
4. License provider creates a license key.
5. User receives the license key by email.
6. User downloads Ledger.
7. User activates Ledger on first launch.
8. Ledger validates the license and binds the device.

For Plaid subscriptions:

1. User opens Bank Sync or Connected Accounts.
2. Ledger explains the subscription requirement.
3. User subscribes through Stripe.
4. License entitlement is updated.
5. Ledger enables bank sync features.

---

# Commercial Infrastructure

Ledger may require the following commercial services:

- Stripe for payments
- Keygen or equivalent for licensing
- Plaid for bank data
- Cloudflare Worker or Vercel Edge Function for Plaid relay
- Tauri updater infrastructure
- Code signing certificates
- Website hosting
- Email delivery for license communication

These costs must be considered when setting pricing.

---

# Cost Considerations

The business model must account for:

- Stripe processing fees
- Plaid usage costs
- License provider costs
- Code signing certificates
- Hosting
- Domain registration
- Email service
- Support time
- Development time
- Refunds and chargebacks
- Taxes and accounting

Pricing must support the real cost of operating a software business.

---

# Metrics to Track

Important business metrics include:

- Website visitors
- Trial downloads
- Trial activations
- Trial-to-paid conversion rate
- Core license sales
- Average revenue per customer
- Plaid subscription attach rate
- Subscription churn
- Refund rate
- Support tickets per customer
- Crash reports
- Upgrade conversion rate
- Customer satisfaction

Metrics should be used to improve the product, not to manipulate users.

---

# Strategic Risks

## Risk: Underpricing

If Ledger is priced too low, the business may not support long-term development and support.

Mitigation:

Position Ledger as professional software and price accordingly.

---

## Risk: Subscription Confusion

Users may misunderstand Ledger as a SaaS product.

Mitigation:

Clearly communicate that the core app is a one-time purchase and subscriptions are optional.

---

## Risk: Plaid Costs

Plaid may become expensive if usage grows.

Mitigation:

Price subscriptions carefully and limit connected institutions per plan.

---

## Risk: Licensing Friction

License activation can frustrate legitimate users.

Mitigation:

Use reasonable device limits, clear messaging, and easy device management.

---

## Risk: Support Burden

Finance software can generate many support requests.

Mitigation:

Invest early in onboarding, documentation, import validation, backups, and clear error messages.

---

# Business Model Guardrails

Ledger's business model should always preserve:

- One-time purchase for the core app.
- Optional subscription only for recurring-cost services.
- Full local access to user data.
- No forced cloud account for core usage.
- No advertisements.
- No selling customer data.
- Clear pricing.
- Clear cancellation.
- Clear export options.
- Fair treatment of customers.

---

# Long-Term Business Objective

Ledger should become a sustainable independent software business built on customer trust.

The goal is not to maximize recurring revenue at any cost.

The goal is to build a product customers are happy to buy, continue using, and recommend because it respects their ownership, privacy, and time.
