# Licensing and Activation

**Version:** 1.0
**Status:** Draft
**Owner:** Product Owner

---

# Purpose

This document defines Ledger Desktop's licensing and activation model.

Ledger is a commercial desktop application sold as a one-time purchase, with optional subscription services only for recurring-cost features such as Plaid bank synchronization.

The licensing system should protect the business without punishing legitimate customers.

The activation experience should reinforce Ledger's values:

* Ownership
* Privacy
* Trust
* Fair pricing
* Offline-first usage
* Long-term reliability

---

# Licensing Philosophy

Ledger's licensing model should be fair, clear, and respectful.

Customers who purchase Ledger should feel that they own the software they bought.

Licensing should prevent casual abuse, but it should not make honest users feel treated like criminals.

The license system should never hold a user's local financial data hostage.

---

# Core Licensing Model

Ledger uses a perpetual license model for the core desktop application.

A customer purchases Ledger once and receives a license key.

That license key activates the purchased major version of the application.

Example:

```text
Ledger 1.x license
```

The license allows the customer to use Ledger 1.x permanently, subject to the license terms.

---

# Optional Subscription Entitlements

Some features may require an active subscription entitlement.

The first subscription entitlement is:

```text
Bank Sync Add-On
```

This enables Plaid-powered bank synchronization.

Subscription entitlements are separate from the core Ledger Desktop license.

A user may have:

* Trial access only
* Activated core license only
* Activated core license plus Bank Sync subscription
* Expired trial
* Expired Bank Sync subscription
* Revoked or invalid license

Each state should be handled clearly in the app.

---

# License Provider

Ledger should use a dedicated licensing provider.

Potential providers:

* Keygen
* LicenseSeat
* Lemon Squeezy licensing
* Paddle licensing
* Custom licensing service later

## Preferred Direction

Use Keygen or an equivalent provider that supports:

* License keys
* Device activation
* Machine fingerprints
* Entitlements
* Stripe integration
* Webhook support
* Offline validation strategy
* Customer portal or API-driven device management

The licensing provider should reduce the need to build custom license infrastructure early.

---

# Stripe Relationship

Stripe should handle payments.

The license provider should handle license state.

## Purchase Flow

1. Customer purchases Ledger through Stripe Checkout.
2. Stripe payment succeeds.
3. Stripe webhook notifies the license provider or backend automation.
4. License key is created.
5. License key is emailed to the customer.
6. Customer downloads Ledger.
7. Customer activates Ledger inside the app.

## Bank Sync Flow

1. Customer opens Bank Sync in Ledger.
2. Ledger explains that Bank Sync requires a subscription.
3. Customer subscribes through Stripe.
4. Stripe updates the subscription.
5. License provider updates the Bank Sync entitlement.
6. Ledger enables Bank Sync after entitlement validation.

---

# Activation Flow

Activation should happen during first launch or after trial conversion.

## Activation Steps

1. User opens Ledger.
2. User enters license key.
3. Ledger sends license key and device fingerprint to the licensing provider.
4. Licensing provider validates the license.
5. Licensing provider binds the device if activation is allowed.
6. Ledger stores activation status locally.
7. User continues into onboarding or the dashboard.

## Activation Success

When activation succeeds, Ledger should show a clear confirmation:

```text
Ledger is activated on this device.
```

The user should be able to see license status in Settings.

---

# Device Activation Policy

Ledger should allow a reasonable number of device activations.

## Recommended Launch Policy

```text
Up to 3 activated devices per license
```

This supports normal customer usage:

* Main desktop
* Laptop
* Replacement computer

The limit discourages casual sharing without being overly restrictive.

---

# Device Fingerprinting

Device binding should use a privacy-conscious machine fingerprint.

The fingerprint should be stable enough to recognize a device but should avoid collecting unnecessary personal information.

## Fingerprint May Include

* OS type
* Machine identifier provided by the OS
* Hardware-derived identifier where appropriate
* App-specific generated device ID

## Fingerprint Should Avoid

* Exact location
* Personal files
* Browser history
* Installed app list
* Sensitive hardware details beyond what is required
* Financial data

The app should not send local financial records during license activation.

---

# Device Deactivation

Customers should be able to deactivate old devices.

## Preferred Options

* Customer portal deactivation
* Support-assisted reset
* In-app deactivation when the device is available

## Required Policy

If a user replaces a computer, they should not be permanently blocked from using the software they purchased.

Device management should be strict enough to prevent abuse but flexible enough to handle normal life events.

---

# Trial Model

Ledger should offer a full-feature trial.

## Recommended Trial

```text
14-day full-feature trial
```

The trial should allow users to evaluate the actual product.

## Trial Includes

* Workspaces
* Accounts
* Transactions
* Categories
* Budgets
* Goals
* Reports
* CSV import
* CSV export
* Backup and restore
* Receipts
* Invoicing
* Local settings

## Trial Excludes

* Production Plaid Bank Sync unless a separate Bank Sync trial is created
* Paid connected services
* Features that create third-party costs

---

# Trial Start

The trial may begin when:

* The app is first launched, or
* The user creates the first local database, or
* The user explicitly starts the trial

## Recommended Direction

Start the trial when the user creates the first Ledger database or completes first-launch onboarding.

This avoids wasting trial time before the user has actually started using the product.

---

# Trial Expiration Behavior

When the trial expires, Ledger should encourage purchase without holding data hostage.

## After Trial Expiration

Allowed:

* Open the app
* View existing data
* Export data
* Back up data
* Enter a license key
* Purchase Ledger

Restricted:

* Creating new transactions
* Creating new accounts
* Creating new invoices
* Importing new data
* Using advanced editing workflows

## Required Trust Rule

A trial user must still be able to export their data after the trial expires.

This reinforces Ledger's ownership philosophy.

---

# License States

Ledger should explicitly model license states.

## State: Trial Active

User is within the trial period.

Behavior:

* Full local app access
* Trial countdown visible in Settings
* Purchase prompts allowed but not intrusive

## State: Trial Expired

Trial has ended and no license is activated.

Behavior:

* Existing data viewable
* Export allowed
* Backup allowed
* Editing restricted
* Activation prompt shown

## State: Activated

Core app license is valid.

Behavior:

* Full local app access
* No subscription required for core features
* License status visible in Settings

## State: Activated With Bank Sync

Core app license is valid and Bank Sync entitlement is active.

Behavior:

* Full local app access
* Plaid sync enabled
* Connected accounts enabled
* Sync status visible

## State: Bank Sync Expired

Core app license is valid but Bank Sync subscription is inactive.

Behavior:

* Core app continues working
* Automatic bank sync stops
* Existing synced transactions remain available
* Manual entry continues
* CSV import continues
* User may resubscribe

## State: License Validation Pending

The app cannot reach the licensing provider.

Behavior:

* App continues working during grace period
* User sees non-blocking warning only if needed
* Core data remains accessible

## State: License Invalid or Revoked

License has been rejected by the provider.

Behavior should depend on reason.

Possible reasons:

* Refund processed
* Chargeback
* Abuse
* Manually revoked license
* License key typo
* Device limit exceeded

The app should provide clear messaging and a support path.

---

# Offline Grace Policy

Ledger must support offline usage.

A local-first app should not become unusable because the user is traveling, offline, or temporarily unable to contact a license server.

## Recommended Policy

* License validates during activation.
* Ledger periodically revalidates when online.
* If offline, Ledger continues working.
* After 7 days without validation, Ledger may show a gentle reminder.
* After 30 days without validation, Ledger may show a stronger reminder.
* Ledger should not immediately lock users out of their data.

## Important Rule

Network failure should not be treated as license failure.

---

# Revalidation Frequency

Ledger should periodically revalidate the license.

## Recommended Frequency

```text
Every 7 days when online
```

Revalidation should happen quietly in the background.

If validation fails due to network issues, the app should continue operating under the offline grace policy.

If validation fails because the license is revoked, the app should explain the problem clearly.

---

# Subscription Entitlement Validation

Bank Sync requires active entitlement validation.

## Bank Sync Validation

Ledger should check Bank Sync entitlement:

* When opening Connected Accounts
* Before starting Plaid Link
* Before running sync
* On app launch if connected accounts exist
* Periodically while online

## If Entitlement Is Active

* Bank Sync UI is enabled
* Sync can run
* Balance refresh can run
* New institutions can be connected within plan limits

## If Entitlement Is Expired

* Sync stops
* New bank connections are blocked
* Existing connections are visible but inactive
* Existing local data remains accessible
* User is prompted to resubscribe

---

# Bank Sync Cancellation Behavior

If a user cancels Bank Sync:

* Automatic transaction sync stops.
* Balance refresh stops.
* New Plaid connections are disabled.
* Existing Plaid-linked accounts remain visible.
* Existing synced transactions remain available.
* Previously imported data remains editable.
* Manual transactions remain available.
* CSV import remains available.
* Reports continue working.
* User can resubscribe later.

Cancellation should never delete local financial data.

---

# Device Limit Exceeded

If a customer reaches the device activation limit, the app should explain the issue clearly.

## Suggested Message

```text
This license has reached its device activation limit.

You can deactivate an old device from your customer portal or contact support for help.
```

## Allowed Actions

* Open customer portal
* Contact support
* Enter a different license key
* Continue in read/export mode if appropriate

---

# License Transfer

Ledger should support reasonable license transfers.

Examples:

* New computer
* Reinstalled operating system
* Lost device
* Hardware replacement

## Preferred Policy

Allow users to deactivate old devices through a portal.

If the old device is unavailable, support can reset activations within reasonable limits.

---

# Refund and Chargeback Behavior

Refunds and chargebacks should update license state.

## Refund

If a refund is processed:

* License may be disabled.
* App should enter a restricted state.
* User should retain data export access.

## Chargeback

If a chargeback occurs:

* License may be revoked.
* App should show clear license issue messaging.
* Export access should remain available.

Even in refund or chargeback cases, Ledger should avoid trapping user data.

---

# Privacy Requirements

License activation should not transmit financial data.

## License Validation May Send

* License key
* Device fingerprint
* App version
* OS platform
* Activation timestamp
* Entitlement request metadata

## License Validation Should Not Send

* Transactions
* Account balances
* Categories
* Budgets
* Invoices
* Receipts
* Client/vendor records
* Local database contents
* Imported files

This distinction should be documented in the privacy policy.

---

# Local License Cache

Ledger should store license status locally.

## Local Cache May Include

* License key or secure license token
* Activation ID
* Device ID
* License state
* Last validation date
* Trial start date
* Trial expiration date
* Entitlement status
* Last entitlement check date

Sensitive values should be stored securely where possible.

---

# Security Requirements

License data should be protected from casual tampering.

## Required

* Store sensitive activation tokens securely
* Avoid plain-text secrets when possible
* Validate license state through provider APIs
* Sign or verify local license cache if feasible
* Prevent obvious local date manipulation abuse
* Avoid storing Plaid secrets in license files

## Not Required at Launch

* Perfect piracy prevention
* Heavy DRM
* Kernel-level protections
* Intrusive background services

The goal is reasonable protection, not hostile DRM.

---

# User Experience Requirements

Licensing should be understandable.

## License UI Should Show

* License status
* License type
* Activated device count if available
* Trial days remaining
* Bank Sync subscription status
* Renewal or billing link
* Support link
* License key entry option
* Deactivate this device option if supported

## License UI Should Avoid

* Fear-based warnings
* Confusing legal language
* Aggressive upsells
* Blocking messages when not required
* Hiding cancellation or billing links

---

# First-Launch Activation Placement

Ledger should not force users through payment friction before they understand the product.

## Recommended First-Launch Flow

1. Welcome
2. Start trial or enter license key
3. Create local password/PIN
4. Choose app mode
5. Create first workspace
6. Add first account
7. Optional CSV import
8. Dashboard tour

This allows both trial users and paid users to start cleanly.

---

# License Activation Screen Requirements

The activation screen should include:

* License key field
* Activate button
* Start trial option
* Purchase link
* Privacy reassurance
* Support link

## Suggested Reassurance Copy

```text
Ledger validates your license key and device activation status. Your financial records stay on your computer.
```

---

# Bank Sync Gate Requirements

When a user reaches a Bank Sync feature without an active entitlement, the app should explain the reason clearly.

## Suggested Copy

```text
Bank Sync is optional and requires a subscription because it uses Plaid and secure relay infrastructure.

Your Ledger data stays local. If you do not subscribe, you can still use manual transactions and CSV import.
```

## Required Actions

* Subscribe
* Learn more
* Continue with manual account
* Import CSV instead

---

# Failure Handling

License and subscription failures should be clear and recoverable.

## Common Failure Cases

* Invalid license key
* Already activated on too many devices
* Network unavailable
* License provider unavailable
* Expired trial
* Expired subscription
* Payment failed
* Subscription canceled
* License revoked
* App clock appears incorrect

## Error Message Requirements

Messages should explain:

* What happened
* What the user can still do
* How to fix it
* Whether data is safe

Avoid vague messages such as:

```text
Activation failed.
```

Prefer:

```text
Ledger could not reach the license server. You can continue using the app during the offline grace period. We will try again when you are online.
```

---

# Support Requirements

Licensing support workflows should be planned early.

## Support Scenarios

* Lost license key
* New computer
* Device limit reached
* License email not received
* Payment succeeded but license missing
* Trial reset request
* Refund request
* Bank Sync entitlement not showing
* Subscription canceled accidentally
* Activation blocked after reinstall

## Required Support Tools

At minimum, support should be able to:

* Look up customer by email
* Resend license key
* Reset device activations
* Confirm subscription status
* Confirm purchase status
* Revoke license after refund
* Manually grant entitlement if needed

---

# Commercial Infrastructure Dependencies

Licensing depends on:

* Stripe
* License provider
* Email delivery
* Customer portal
* Support inbox
* App update system
* Website purchase flow
* Privacy policy
* Terms of use
* Refund policy

These dependencies should be documented before public launch.

---

# Out of Scope for Initial Launch

The initial licensing system should not include:

* Enterprise license servers
* Floating seats
* Team administration
* SSO
* Organization-wide device management
* Complex role permissions
* Offline license files for enterprises
* Reseller licensing
* App store licensing
* Hardware dongles
* Intrusive DRM

These features are unnecessary for the initial target customer.

---

# Acceptance Criteria

Licensing and activation are ready when:

* A user can start a trial.
* A user can enter a license key.
* A valid license activates the device.
* An invalid license shows a clear error.
* Device limits are enforced reasonably.
* Offline use works during grace period.
* Trial expiration is handled without trapping data.
* Bank Sync entitlement can be checked.
* Expired Bank Sync disables sync only.
* Existing local data remains accessible.
* License status is visible in Settings.
* Support paths exist for common licensing problems.
* Privacy documentation explains what license validation sends.

---

# Guardrails

Ledger licensing should always preserve:

* Customer ownership
* Local data access
* Export access
* Offline-first usage
* Clear pricing
* Fair device limits
* No hostile DRM
* No financial data sent during activation
* No subscription requirement for core local features
* No lockout from local records due to network failure

---

# Final Principle

Licensing should protect Ledger as a business without undermining Ledger as a product.

A customer should feel that activation confirms ownership, not that it takes control away from them.
