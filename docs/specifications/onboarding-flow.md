# Onboarding Flow Specification

**Version:** 1.0
**Status:** Draft
**Sprint:** 0

---

## Purpose

This document defines the first-launch onboarding experience for Ledger Desktop. Onboarding should make users feel confident, informed, and productive within minutes.

---

## Onboarding Principles

1. Do not force payment before the user understands the product
2. Make the trial start feel like ownership, not restriction
3. Explain local-first and privacy benefits in plain language
4. Get the user to a working state quickly
5. Respect the user's time

---

## First-Launch Flow

### Step 1: Welcome

- Product name and tagline
- Brief value statement: "Private desktop finance software you own."

### Step 2: License or Trial

- Enter license key (for purchased users)
- Start 14-day trial (for new users)
- Link to purchase page
- Reassurance: "Your financial records stay on your computer."

### Step 3: App Security

- Create a local password or PIN
- Explain that this protects app access
- Option to skip (not recommended, but allowed)

### Step 4: Workspace Setup

- Choose workspace type: Personal or Business
- Enter workspace name
- Explain that additional workspaces can be created later

### Step 5: First Account

- Create first financial account (e.g., checking, savings, credit card)
- Enter account name, type, and starting balance
- Explain that more accounts can be added later

### Step 6: Optional CSV Import

- Offer to import a CSV file from the user's bank
- Show column mapping preview
- Option to skip and add transactions manually later

### Step 7: Dashboard Tour

- Brief tour of key areas: Dashboard, Accounts, Transactions, Reports
- Highlight where to find Settings and Help
- Complete onboarding

---

## Post-Onboarding State

After completing onboarding, the user should have:
- An active trial or activated license
- A workspace
- At least one account
- Optionally, imported transactions
- Understanding of where their data is stored

---

## Trial Experience

During the 14-day trial:
- Full access to all local features
- Trial countdown visible in Settings (not intrusive)
- Purchase prompts allowed but not aggressive
- No Plaid Bank Sync unless separately trialed

---

## Trial Expiration

When the trial expires:
- User can still open the app
- User can still view existing data
- User can still export data
- User can still back up data
- User cannot create new transactions, accounts, or invoices
- Clear prompt to purchase with link

The user's data is never held hostage.

---

## Returning User Flow

When a user who has already completed onboarding opens the app:
- Show lock screen (if password/PIN is set)
- After unlock, go directly to dashboard
- No re-onboarding unless the database is new

---

## Bank Sync Gate

If a user navigates to Bank Sync without a subscription:
- Explain that Bank Sync is optional and requires a subscription
- Explain why: "Plaid and secure relay infrastructure create ongoing costs"
- Offer: Subscribe, Learn More, Use CSV Import Instead, Add Manual Account
- The user's local data stays local regardless of subscription status
