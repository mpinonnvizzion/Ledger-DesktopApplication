# Release Strategy

**Version:** 1.0
**Status:** Draft
**Owner:** Product Owner

---

# Purpose

This document defines Ledger Desktop's release strategy.

Ledger is intended to become a commercial desktop finance application distributed directly to customers for macOS and Windows.

The release process must protect:

* Customer trust
* Financial data integrity
* Product quality
* Installation reliability
* Update reliability
* Commercial readiness

Ledger should not be publicly released until the core product is stable, documented, installable, updateable, and supportable.

---

# Release Philosophy

Ledger should release slowly, carefully, and deliberately.

Finance software handles sensitive data. A rushed release can damage trust permanently.

The goal is not to ship as fast as possible.

The goal is to ship software that customers can trust with their financial records.

A smaller, stable release is better than a broad, fragile release.

---

# Release Principles

Every release should follow these principles:

1. Protect user data above all else.
2. Never release known data-loss risks.
3. Prefer stability over feature volume.
4. Keep release notes clear.
5. Make rollback or recovery plans before release.
6. Test install, update, backup, restore, and import flows.
7. Communicate limitations honestly.
8. Do not surprise users with business model changes.
9. Do not remove purchased functionality.
10. Treat customer trust as the main release asset.

---

# Product Release Stages

Ledger should move through the following stages:

1. Internal Development
2. Internal Alpha
3. Private Beta
4. Public Beta
5. Version 1.0 Launch
6. Post-Launch Maintenance
7. Major Version Upgrades

Each stage should have clear entry and exit criteria.

---

# Stage 1: Internal Development

## Objective

Build the core application foundation.

## Audience

Product owner and development team only.

## Scope

* Local database
* App shell
* Core finance workflows
* CSV import/export
* Backup and restore design
* Basic reports
* Local settings
* Early onboarding
* Initial documentation

## Release Channel

No external distribution.

Builds may run locally from source.

## Exit Criteria

Internal Development is complete when:

* The app can run locally.
* Core data persists correctly.
* Workspaces, accounts, categories, and transactions work.
* CSV import works in a controlled test.
* Basic dashboard and reports exist.
* No obvious data-loss bugs are present.
* Development workflow is repeatable.

---

# Stage 2: Internal Alpha

## Objective

Use Ledger with realistic local finance data in controlled conditions.

## Audience

Product owner only, or a very small trusted group.

## Scope

* Manual finance tracking
* CSV import from real bank exports
* Account management
* Transaction editing
* Category workflows
* Backup and restore testing
* Basic performance testing
* Initial installer testing if available

## Release Channel

Manual builds or private unsigned builds.

## Important Restriction

Internal Alpha should not rely on customer data from outside the team.

## Exit Criteria

Internal Alpha is complete when:

* The app can handle realistic datasets.
* Common workflows are stable.
* Import behavior is predictable.
* Backup and restore are tested.
* App startup is reliable.
* Transaction search and filtering perform acceptably.
* Known issues are documented.
* There are no unresolved critical data integrity issues.

---

# Stage 3: Private Beta

## Objective

Test Ledger with a small group of trusted users before public release.

## Audience

Invite-only beta users.

Ideal beta users:

* Privacy-conscious personal finance users
* Freelancers
* Small business owners
* Users comfortable reporting bugs
* Users who understand beta risk

## Scope

Private Beta should test:

* Installation
* First launch
* Trial mode
* License activation if ready
* Local database creation
* Manual transactions
* CSV import
* Reports
* Backup/export
* Settings
* Basic onboarding
* Documentation clarity

## Release Channel

Private download links.

Builds should preferably be signed before broad private beta, especially on macOS and Windows.

## Required Documentation

Private Beta should include:

* Beta welcome guide
* Known issues
* Backup instructions
* Feedback instructions
* Support contact
* Data safety warning
* Release notes

## Required Warning

Beta users should be told:

```text id="3ehv0q"
Ledger is in beta. Back up your data regularly and do not rely on it as your only copy of important financial records.
```

## Exit Criteria

Private Beta is complete when:

* Installation works reliably.
* Users can complete onboarding.
* Users can import or manually create data.
* No critical data-loss bugs remain.
* Support issues are understood.
* Documentation covers common questions.
* License/trial behavior is stable if included.
* Backup/export workflows are reliable.
* The product feels stable enough for public evaluation.

---

# Stage 4: Public Beta

## Objective

Allow broader public testing while clearly communicating that Ledger is not final.

## Audience

Public early adopters.

## Scope

Public Beta may include:

* Public download page
* Trial activation
* Paid founder/beta license option
* Public changelog
* Known issues page
* Feedback form
* Support workflow
* Crash/error reporting if implemented
* Basic documentation site

## Commercial Policy

Public Beta may be free, discounted, or sold as an early-access license.

Preferred model:

```text id="8gdocc"
Discounted beta license with clear terms.
```

Avoid promising unlimited lifetime access unless intentionally chosen.

## Exit Criteria

Public Beta is complete when:

* The app has stable installers.
* License activation works.
* Update flow works.
* Common user paths are documented.
* Refund/support workflow exists.
* No critical bugs remain.
* Pricing and packaging are finalized.
* Privacy policy and terms are ready.
* Version 1.0 scope is frozen.

---

# Stage 5: Version 1.0 Launch

## Objective

Release Ledger as a paid commercial desktop application.

## Audience

General public.

## Version 1.0 Must Include

* Stable macOS build
* Stable Windows build
* Signed installers if feasible
* Local database
* Workspaces
* Accounts
* Transactions
* Categories
* Dashboard
* CSV import
* CSV export
* Backup/export workflow
* Basic reports
* Settings
* Onboarding
* Trial mode
* License activation
* Documentation
* Release notes
* Support workflow
* Privacy policy
* Terms of use
* Refund policy

## Version 1.0 May Include

Depending on readiness:

* Budgets
* Goals
* Receipts
* Clients
* Vendors
* Invoicing
* AP/AR
* Plaid Bank Sync

These features should only ship in 1.0 if they are stable and supportable.

## Version 1.0 Should Not Include

* Payroll
* Tax filing
* Inventory
* Accountant portal
* Enterprise permissions
* Cloud sync
* Mobile app
* AI finance coaching
* Public API
* Payment processing
* Crypto trading
* Full double-entry accounting

## Launch Criteria

Ledger is ready for Version 1.0 when:

* Installers work on supported platforms.
* App launch is reliable.
* Core workflows are stable.
* Data import/export is tested.
* Backups are documented.
* License activation works.
* Trial expiration works.
* Pricing page is clear.
* Support process is ready.
* Known issues are acceptable and documented.
* No critical data integrity risks remain.

---

# Stage 6: Post-Launch Maintenance

## Objective

Stabilize the product after public launch.

## Priority Order

Post-launch work should prioritize:

1. Data integrity issues
2. Crashes
3. Installation problems
4. License activation problems
5. Backup/restore problems
6. CSV import bugs
7. Update failures
8. Plaid sync problems if included
9. UX friction
10. New features

## Expected Release Types

### Patch Releases

Examples:

```text id="wjs08m"
1.0.1
1.0.2
1.0.3
```

Patch releases should focus on:

* Bug fixes
* Crash fixes
* Data integrity fixes
* Installer fixes
* Documentation corrections

### Minor Releases

Examples:

```text id="yfkj19"
1.1
1.2
1.3
```

Minor releases may include:

* New local features
* Report improvements
* Import improvements
* UX improvements
* Performance improvements
* Plaid improvements
* Business workflow improvements

### Major Releases

Examples:

```text id="oaaaqb"
2.0
3.0
```

Major releases may include:

* Major architecture changes
* Major new product domains
* Optional cloud sync
* Major UI redesign
* New platform support
* New commercial packaging

---

# Stage 7: Major Version Upgrades

## Objective

Support long-term development without forcing mandatory subscriptions.

Ledger should use a major-version upgrade model.

## Recommended Policy

```text id="a3zlj0"
Ledger 1.x users receive all 1.x updates.
Ledger 2.0 may be a paid upgrade.
Existing customers may receive discounted upgrade pricing.
```

## Requirements for Paid Major Upgrades

A paid major upgrade should provide meaningful value.

Examples:

* Major feature expansion
* Major performance improvement
* New platform support
* Optional cloud sync system
* Significant reporting engine upgrade
* Significant business workflow expansion

## Guardrail

Paid upgrades should not remove access to purchased versions.

Users who bought Ledger 1.x should be able to continue using Ledger 1.x, subject to compatibility and security realities.

---

# Release Channels

Ledger may eventually support multiple release channels.

## Stable

Default channel for customers.

Should receive only tested production releases.

## Beta

Optional channel for users who want early access.

Should include clear warnings.

## Internal

Development/testing builds only.

Should never be distributed publicly.

## Recommendation for Launch

Start with:

```text id="63hebs"
Internal
Private Beta
Stable
```

Add public beta or advanced channels only when needed.

---

# Version Numbering

Ledger should use semantic-style versioning.

Format:

```text id="dnoidb"
MAJOR.MINOR.PATCH
```

Examples:

```text id="rfro2h"
1.0.0
1.0.1
1.1.0
2.0.0
```

## Patch Version

Bug fixes and small corrections.

## Minor Version

Backward-compatible feature additions.

## Major Version

Significant product or architecture changes.

---

# Release Notes

Every release should have clear release notes.

## Release Notes Should Include

* Version number
* Release date
* New features
* Improvements
* Bug fixes
* Known issues
* Upgrade notes
* Backup recommendation when relevant

## Release Notes Should Avoid

* Vague claims
* Hidden breaking changes
* Marketing-only language
* Undocumented known issues

## Example Structure

```text id="byqh0x"
# Ledger 1.0.1

## Fixed
- Fixed an issue where imported CSV rows with blank descriptions could fail validation.
- Fixed incorrect account balance display after deleting a transaction.

## Improved
- Improved transaction search performance for large datasets.

## Known Issues
- Some banks export dates in formats that require manual mapping during CSV import.
```

---

# Changelog Policy

`CHANGELOG.md` should be updated for every meaningful release.

Use sections:

* Added
* Changed
* Fixed
* Removed
* Security
* Known Issues

Every Claude Code implementation sprint should update the changelog before review.

---

# Release Checklist

Every release should pass a checklist.

## General Checklist

* Version number updated
* Changelog updated
* Release notes written
* Documentation updated
* Tests run
* App launches successfully
* Installers build successfully
* No secrets included
* Known issues reviewed
* Backup warning included if needed

## Data Checklist

* Migrations tested
* Existing database opens
* New database creates correctly
* Backup works
* Export works
* Restore process documented
* Import tested with sample CSV files
* No known data-loss bugs

## Commercial Checklist

* License activation works
* Trial state works
* Expired trial behavior works
* Purchase link works
* Billing/subscription link works if applicable
* Refund/support policy is current
* Pricing copy is current

## Platform Checklist

* macOS build tested
* Windows build tested
* Install/uninstall tested
* App update tested
* App icon correct
* App metadata correct
* Code signing checked if applicable
* Notarization checked if applicable

## Documentation Checklist

* README updated
* User guide updated
* Known issues updated
* Support documentation updated
* Privacy policy updated if needed
* Terms updated if needed
* Release notes published

---

# Installer Strategy

Ledger should provide direct downloads.

## macOS

Target artifact:

```text id="3s8zcb"
.dmg
```

Future options:

```text id="2w2xyx"
.pkg
Mac App Store
```

## Windows

Target artifacts:

```text id="m6te1l"
.msi
.exe installer
```

Future option:

```text id="l63k2y"
Microsoft Store
```

## Launch Recommendation

Start with direct downloads from the Ledger website.

Avoid app stores at launch unless there is a clear strategic reason.

---

# Code Signing Strategy

Code signing is important for customer trust.

Ledger should plan for:

* Apple Developer ID signing
* macOS notarization
* Windows code signing certificate
* Signed update artifacts
* Secure build pipeline

Unsigned builds may be acceptable for early internal testing but should not be the public launch standard.

The original desktop architecture specification correctly identifies code signing and notarization as part of commercial distribution readiness.

---

# Auto-Update Strategy

Ledger should support app updates.

The architecture direction already identifies Tauri's updater system as the likely update mechanism.

## Update Requirements

* Updates should be signed.
* Users should be notified before installing.
* Release notes should be visible.
* Updates should not silently risk user data.
* Database migrations should run safely.
* Failed updates should not corrupt local data.

## Update Frequency

Recommended check frequency:

```text id="tdv2pl"
On app launch and once every 24 hours while running.
```

## User Experience

The update flow should be calm and clear.

Example:

```text id="kwujcx"
Ledger 1.0.2 is available.

This update includes bug fixes and import improvements.

Update now or remind me later.
```

---

# Database Migration Release Policy

Migrations are high risk because they affect user financial records.

## Requirements

Before any release with migrations:

* Migration tested on empty database
* Migration tested on realistic database
* Migration tested on older version database
* Backup recommended before migration
* Migration rollback/recovery strategy considered
* Migration failure behavior documented

## Guardrail

Never ship a migration that can silently destroy user data.

---

# Plaid Release Strategy

Plaid should not be released until the local product is stable.

Bank Sync introduces:

* Third-party API complexity
* Subscription entitlement checks
* Support burden
* Sync reconciliation risk
* OAuth edge cases
* Customer trust risk

## Plaid Should Require

* Stable local transaction model
* Stable account model
* Duplicate detection
* Sync status UI
* Error handling
* Subscription entitlement checks
* Token security
* Clear cancellation behavior
* Plaid sandbox testing
* Production approval process

## Plaid Beta

Plaid should go through its own private beta before being included in a public stable release.

---

# Public Launch Requirements

Ledger should not publicly launch until the following exist:

## Product

* Stable core app
* Clear onboarding
* Core workflows complete
* Backup/export ready
* Trial mode ready
* License activation ready

## Commercial

* Pricing page
* Purchase flow
* License email flow
* Refund policy
* Support inbox
* Customer documentation

## Legal/Trust

* Privacy policy
* Terms of use
* Data ownership explanation
* Plaid explanation if applicable
* Security documentation

## Distribution

* macOS build
* Windows build
* Installer instructions
* Update strategy
* Release notes

---

# Support Readiness

Before launch, support must be able to handle:

* Installation issues
* Activation issues
* Lost license keys
* Device limit problems
* Trial expiration questions
* CSV import problems
* Backup/restore questions
* Refund requests
* Bank Sync issues if applicable
* Data location questions

Support documentation should exist before broad public release.

---

# Known Issues Policy

Known issues should be documented honestly.

A known issue can ship only if:

* It does not risk data loss.
* It does not break core workflows.
* There is a workaround.
* It is documented.
* It is acceptable for the release stage.

Known data-loss issues should block release.

---

# Rollback and Recovery Policy

Desktop apps are harder to roll back than web apps.

Ledger should plan recovery carefully.

## Required

* Backups before risky migrations
* Clear support path
* Previous installer availability when appropriate
* Migration failure handling
* Data export path
* Recovery documentation

## Important Rule

A failed update should not leave the user's financial data inaccessible.

---

# Telemetry and Error Reporting

Ledger should be cautious with telemetry.

## Allowed

* Optional crash reports
* Optional diagnostic logs
* User-initiated support bundle
* App version
* OS version
* Error type

## Not Allowed Without Explicit Consent

* Financial transaction data
* Account balances
* Imported CSV contents
* Personal financial categories
* Invoice contents
* Receipt images
* Client/vendor records

Telemetry must align with Ledger's privacy-first positioning.

---

# Private Beta Feedback Process

Private beta feedback should be structured.

## Feedback Categories

* Install problems
* Activation problems
* Data import issues
* Workflow confusion
* Missing documentation
* Bugs
* Performance issues
* Feature requests
* Trust/privacy concerns

## Feedback Review

Feedback should be reviewed and categorized before changing the roadmap.

Do not let every beta request become a feature.

Feature requests should be evaluated against the PRD and product guardrails.

---

# Launch Messaging

Launch messaging should be narrow and clear.

Recommended positioning:

```text id="pkph23"
Private desktop finance software you own.
```

Supporting message:

```text id="2hmmsm"
Manage personal and business finances locally, with optional bank sync only if you want it.
```

Avoid broad claims such as:

```text id="fsz2p0"
The ultimate finance app.
```

or:

```text id="uipab8"
All-in-one money platform.
```

Ledger wins through trust and clarity, not hype.

---

# Release Risks

## Risk: Data Loss

Highest severity.

Mitigation:

* Strong migration testing
* Backup reminders
* Import previews
* Data validation
* Recovery plans

## Risk: Broken Installers

Mitigation:

* Platform testing
* Signed builds
* Clear install docs
* Private beta testing

## Risk: Licensing Failure

Mitigation:

* Offline grace
* Clear error messages
* Support reset process
* Export access preserved

## Risk: Plaid Sync Bugs

Mitigation:

* Defer Plaid until local model is stable
* Sandbox testing
* Sync logs
* Duplicate detection
* Private Plaid beta

## Risk: Support Overload

Mitigation:

* Better onboarding
* Strong documentation
* Known issues page
* Clear import guides
* Simple pricing

## Risk: Launching Too Broad

Mitigation:

* Freeze 1.0 scope
* Defer advanced features
* Prioritize stability
* Avoid competitor-driven feature creep

---

# Release Guardrails

Ledger releases should always preserve:

* Data integrity
* Local data access
* Export access
* Backup path
* Clear license behavior
* Clear subscription behavior
* No forced cloud dependency
* No hidden data collection
* No rushed migrations
* No undocumented breaking changes
* No public release with known critical bugs

---

# Final Release Principle

Ledger should earn trust one release at a time.

A release is successful when users feel more confident using Ledger after installing it.

The goal is not simply to ship.

The goal is to become dependable.
