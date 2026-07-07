# Pricing and Packaging

**Version:** 1.0
**Status:** Draft
**Owner:** Product Owner

---

# Purpose

This document defines Ledger Desktop's pricing and packaging strategy.

Ledger is a commercial desktop finance application sold as a one-time purchase, with optional subscriptions only for services that create recurring operating costs.

The goal is to create a pricing model that is:

* Fair to customers
* Sustainable for the business
* Easy to understand
* Aligned with Ledger's local-first philosophy
* Strong enough to support long-term product development

Pricing should reinforce customer trust rather than create confusion.

---

# Core Pricing Philosophy

Ledger should be priced as professional desktop software.

The product should not compete by being the cheapest finance application.

Ledger should compete by being:

* Trustworthy
* Private
* Local-first
* Offline-capable
* Professionally built
* Fairly priced
* Easy to own

The core customer promise is:

> Buy the app. Own the app. Subscribe only if you want connected services.

This pricing philosophy aligns with the target architecture: a local desktop application with optional Plaid bank synchronization through a lightweight cloud relay.

---

# Packaging Principles

Ledger's packaging should follow these principles:

1. The core application is a one-time purchase.
2. The core application should remain useful without any subscription.
3. Subscriptions should only apply to recurring-cost services.
4. Users should never lose access to their local data.
5. Pricing should be simple enough to understand in under one minute.
6. Feature gates should feel fair, not manipulative.
7. Upgrade paths should be clear before purchase.
8. Existing users should be treated respectfully.

---

# Recommended Initial Package Structure

Ledger should launch with a simple package structure.

## Package 1: Ledger Desktop

The main desktop application.

### Pricing Model

One-time purchase.

### Includes

* Local desktop application
* Local database
* Workspaces
* Accounts
* Transactions
* Categories
* Budgets
* Goals
* Reports
* Calendar
* Receipts
* Clients
* Vendors
* Invoicing
* Accounts payable
* Accounts receivable
* CSV import
* CSV export
* Backup and restore
* Settings
* Local app lock
* All non-connected local features included in the purchased version

### Does Not Require

* Subscription
* Cloud account
* Bank connection
* Online access for daily use

### Strategic Purpose

This is the core product.

It must be strong enough that a customer who never subscribes still feels they purchased complete, valuable software.

---

## Package 2: Bank Sync Add-On

Optional subscription for users who want automatic bank synchronization.

### Pricing Model

Monthly or annual subscription.

### Includes

* Plaid bank connections
* Transaction synchronization
* Balance refreshes
* Institution management
* Connection repair flows
* Subscription entitlement validation
* Defined institution limit

### Does Not Include

* Access to local data
* Core transaction management
* Core reporting
* Core budgeting
* Core invoices
* Core exports

### Strategic Purpose

This package funds ongoing Plaid and relay infrastructure costs.

Bank Sync should be positioned as convenience, not as the foundation of Ledger.

---

# Initial Pricing Direction

Final prices should be validated later, but the initial direction should be:

## Ledger Desktop Core License

Potential price range:

```text id="imhqsq"
$49–$99 one-time purchase
```

This range positions Ledger as serious software while remaining accessible to individuals, freelancers, and small businesses.

A lower price may increase conversions, but it may also weaken perceived value and make support unsustainable.

A higher price may better reflect professional quality, but it raises expectations for polish, documentation, onboarding, and support.

---

## Bank Sync Add-On

Potential monthly range:

```text id="3xah6w"
$5–$10/month
```

Potential annual range:

```text id="h9t72w"
$50–$100/year
```

The annual plan should offer a discount compared to monthly billing.

Bank Sync pricing must account for:

* Plaid costs
* Payment processing fees
* Cloud relay costs
* License entitlement checks
* Support burden
* Failed connection support
* Margin for future development

---

# Recommended Launch Pricing Hypothesis

The initial pricing hypothesis should be:

```text id="fjs4cl"
Ledger Desktop: $79 one-time purchase
Bank Sync Add-On: $7/month or $70/year
```

This is not final pricing.

It is a planning anchor for business modeling, website copy, licensing design, Stripe setup, and customer research.

---

# Trial Packaging

Ledger should offer a trial to reduce purchase friction.

## Recommended Trial

```text id="34d57d"
14-day full-feature trial
```

### Trial Includes

* Full local app access
* Manual transactions
* CSV import
* Budgets
* Reports
* Invoicing
* Backup/export
* Local data ownership

### Trial Excludes

* Plaid bank sync unless separately trialed
* Production subscription services

### Trial Expiration Behavior

When the trial expires:

* The user should not be able to continue creating new records without purchasing.
* The user should still be able to open the app.
* The user should still be able to export their data.
* The user should be clearly prompted to purchase.
* The app should not feel like it is holding data hostage.

This protects trust while still encouraging purchase.

---

# Free Tier Decision

Ledger should not launch with a permanent free tier.

## Reason

A free tier can create:

* Higher support burden
* Lower conversion pressure
* More complexity in licensing
* Confusion between trial and ownership
* Incentive to artificially limit features

## Preferred Alternative

Use a time-limited full trial.

This lets users evaluate the real product without permanently splitting the codebase into free and paid experiences.

---

# Personal vs Business Packaging

Ledger may eventually support separate personal and business licenses, but the launch product should avoid unnecessary packaging complexity.

## Launch Recommendation

Use one core license:

```text id="7q8jph"
Ledger Desktop
```

This license should allow both personal and light business use.

## Future Packaging Option

Later, Ledger may introduce:

```text id="co5ryg"
Ledger Personal
Ledger Business
```

Only introduce this if there is a clear business reason, such as:

* Different support expectations
* Higher business willingness to pay
* Business-only features
* Priority support
* Higher device limits
* Commercial terms

Avoid creating artificial business gates too early.

---

# Device Packaging

The core license should include a reasonable device limit.

## Recommended Launch Policy

```text id="fttqxi"
Up to 3 activated devices per license
```

This supports common real-world usage:

* Desktop computer
* Laptop
* Replacement machine

The limit helps reduce casual sharing without punishing legitimate users.

---

# Household or Family License

A family license may be considered later.

## Do Not Prioritize at Launch

Reasons:

* Adds licensing complexity
* Requires household definition
* May confuse positioning
* Could reduce revenue without strong benefit

## Future Possibility

```text id="2bozix"
Ledger Family: one household, up to 5 devices
```

This should be deferred until customer demand is clear.

---

# Business License

A business license may be introduced later if needed.

## Possible Future Business License Includes

* Commercial use rights
* Higher device limit
* Priority support
* Business workspace templates
* Advanced invoice templates
* Expanded export/reporting options

## Guardrail

Do not lock essential local business features behind a recurring subscription.

If business packaging exists, it should be a license tier, not a forced SaaS model.

---

# Student or Educational Pricing

Ledger may eventually offer student pricing.

## Launch Recommendation

Do not implement student pricing at launch.

Reasons:

* Verification complexity
* Lower revenue
* Added support overhead
* Not central to the beachhead market

## Future Option

A discounted student license may make sense after the product and support model are mature.

---

# Upgrade Packaging

Ledger should use a major-version upgrade model.

## Recommended Policy

```text id="gdobzp"
Ledger 1.x purchase includes all Ledger 1.x updates.
Ledger 2.0 may be a paid upgrade.
Existing users may receive discounted upgrade pricing.
```

This supports long-term development without forcing a mandatory subscription.

---

# Minor Updates

Minor updates should be included with the purchased major version.

Examples:

* Bug fixes
* Security updates
* Compatibility fixes
* Performance improvements
* Small feature improvements
* Import/export improvements
* UI refinements

---

# Major Upgrades

Major upgrades may be paid.

Examples of major-version justification:

* Significant new product domains
* Major architecture improvements
* New platform support
* Major reporting engine
* Optional cloud sync architecture
* Large automation system
* Major UX redesign

Major upgrades should never be used as an excuse to abandon existing users unfairly.

---

# Subscription Packaging Rules

Optional subscriptions must follow clear rules.

## Allowed Subscription Packages

### Bank Sync

Recurring-cost service powered by Plaid.

### Future Cloud Backup

Recurring-cost service for encrypted off-device backup.

### Future Cloud Sync

Recurring-cost service for multi-device synchronization.

### Future AI Services

Recurring-cost service if external model APIs are used.

---

## Not Allowed as Subscription Packages

Ledger should not sell these as subscription-only packages:

* Budgeting subscription
* Reporting subscription
* Invoice subscription
* Export subscription
* Local backup subscription
* Transaction history subscription
* Workspace subscription for local-only usage
* Category management subscription
* Receipt attachment subscription

These are core application capabilities.

---

# Bank Sync Packaging Details

The Bank Sync Add-On should have clear limits.

## Initial Suggested Limit

```text id="h7lwl0"
Up to 5 connected institutions
```

This matches the intended architecture direction and helps control Plaid costs.

## Future Plan Options

If needed later:

```text id="sgap8q"
Bank Sync Basic: up to 5 institutions
Bank Sync Plus: up to 10 institutions
```

Do not introduce multiple bank sync tiers unless usage data proves it is necessary.

---

# Cancellation Policy

If a user cancels Bank Sync:

* Automatic sync stops.
* New bank transactions no longer import automatically.
* Existing synced data remains available.
* Existing synced transactions remain editable.
* Manual transactions continue working.
* CSV import continues working.
* Reports continue working.
* User can resubscribe later.

This policy should be explained clearly before subscription purchase.

---

# Refund Packaging

Ledger should use a customer-friendly refund policy.

## Core App Refund

Recommended:

```text id="rtj65y"
30-day refund window
```

This reduces purchase anxiety and supports trust.

## Subscription Refunds

Subscription refunds should be handled separately.

Possible policy:

* No automatic refund for partial months.
* Annual subscriptions may be refunded within a short window.
* Exceptions may be handled manually for failed bank sync cases.

The final refund policy should be simple, visible, and fair.

---

# Discount Strategy

Ledger should avoid heavy discounting at launch.

## Allowed Discounts

* Launch discount
* Upgrade discount
* Existing customer discount
* Limited beta-user discount

## Avoid

* Constant sales
* Deep discounting
* Countdown pressure
* Fake urgency
* Complex coupon systems

Discounting should not damage trust or cheapen the product.

---

# Beta Pricing

Private beta users may receive a special offer.

Potential options:

## Option A: Free Beta, Paid Launch

Beta testers use the app free during beta and receive a launch discount.

## Option B: Founder's License

Early users can buy at a lower lifetime price.

## Option C: Discounted Version 1 License

Beta users receive a discount on Ledger 1.0.

## Recommended Direction

Use a limited beta discount rather than a lifetime unlimited license.

This rewards early users without undermining the long-term business model.

---

# Pricing Communication

The pricing page should clearly explain:

* What is included in the one-time purchase.
* What requires a subscription.
* Why bank sync requires a subscription.
* What happens if a subscription is canceled.
* Whether data remains accessible.
* What updates are included.
* Device activation limits.
* Refund policy.
* Trial policy.

Avoid vague claims.

The pricing page should make the business model feel fair.

---

# Suggested Pricing Page Structure

## Section 1: Main Headline

```text id="a6lpcy"
Simple pricing. No mandatory subscription.
```

## Section 2: Core App

```text id="v9sxbl"
Ledger Desktop
One-time purchase
Private local finance software you own.
```

## Section 3: Optional Add-On

```text id="5la4g0"
Bank Sync
Optional subscription
Automatic bank connections for users who want them.
```

## Section 4: Plain-Language Explanation

```text id="6hhchv"
The core app works offline and stores your data locally. Bank Sync is optional because Plaid and secure relay infrastructure create ongoing costs.
```

## Section 5: Cancellation Reassurance

```text id="1u0p5v"
Cancel Bank Sync anytime. Your local records stay yours.
```

---

# Packaging Guardrails

Ledger pricing and packaging should always preserve:

* One-time purchase for the core application
* Optional subscriptions only for recurring-cost services
* No forced cloud account for core features
* No subscription requirement for local financial management
* No locked exports
* No dark patterns
* No artificial feature crippling
* No confusing tiers at launch
* No removal of purchased functionality

---

# Metrics to Validate Pricing

Important metrics include:

* Trial downloads
* Trial activation rate
* Trial-to-paid conversion rate
* Refund rate
* Average revenue per customer
* Bank Sync attach rate
* Monthly subscription churn
* Annual subscription conversion
* Support tickets per paid customer
* Support tickets per Bank Sync subscriber
* Upgrade conversion rate
* Customer satisfaction

Pricing should be adjusted based on evidence, not assumptions.

---

# Initial Recommendation

Launch with simple pricing:

```text id="k3ujjp"
Ledger Desktop
$79 one-time purchase

Bank Sync Add-On
$7/month or $70/year
```

Use a 14-day full-feature trial.

Include all local finance functionality in the core purchase.

Gate only Bank Sync and future recurring-cost services behind subscriptions.

This model is simple, fair, and aligned with Ledger's product philosophy.
