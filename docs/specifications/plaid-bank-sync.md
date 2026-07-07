# Plaid Bank Sync Specification

**Version:** 1.0
**Status:** Draft
**Sprint:** 0

---

## Purpose

This document specifies the Plaid bank synchronization feature for Ledger Desktop. Bank Sync is an optional, subscription-gated add-on. It is not required for core financial management.

---

## Overview

Plaid Bank Sync allows users with an active subscription to connect bank accounts and automatically import transactions and balances. The feature uses Plaid's API through a cloud relay service because Plaid API secrets must not be stored in the desktop application.

See [ADR 0005](../adr/0005-plaid-requires-cloud-relay.md).

---

## Architecture

```
Desktop App                 Cloud Relay              Plaid API
    │                           │                       │
    │── Request Link token ────▶│                       │
    │◀── Return Link token ─────│                       │
    │                           │                       │
    │── Open Plaid Link ───────────────────────────────▶│
    │◀── Return public token ──────────────────────────│
    │                           │                       │
    │── Send public token ─────▶│── Exchange token ────▶│
    │                           │◀── Access token ──────│
    │◀── Confirm connection ────│                       │
    │                           │                       │
    │── Request sync ──────────▶│── Fetch transactions ▶│
    │                           │◀── Return data ───────│
    │◀── Return transactions ───│                       │
    │                           │                       │
    │   (store locally)         │                       │
```

### Cloud Relay Responsibilities

- Store and protect Plaid API credentials (client ID, secret)
- Create Link tokens for the desktop app
- Exchange public tokens for access tokens after Link flow
- Store access tokens securely
- Proxy transaction sync requests to Plaid
- Proxy balance refresh requests to Plaid
- Validate Bank Sync subscription entitlement before each operation
- Handle Plaid webhooks (item updates, errors)

### Desktop App Responsibilities

- Render Plaid Link in a webview using the Link token
- Send public token to relay after successful Link flow
- Request transaction sync from relay
- Store synced transactions in local SQLite database
- Display connected account status and last sync time
- Handle sync errors and show institution repair flows
- Manage connected account UI (list, status, disconnect)

---

## Subscription Gating

Bank Sync requires an active subscription entitlement.

**Before each operation, the relay validates:**
- User has an active Bank Sync subscription
- Subscription is not expired or cancelled
- Institution count is within plan limits (default: 5)

**If entitlement is inactive:**
- Sync requests are rejected
- New connections are blocked
- Existing local data remains accessible
- User is prompted to resubscribe

---

## Sync Behavior

### Transaction Sync

- Sync pulls transactions from Plaid for connected accounts
- New transactions are added to the local database
- Existing transactions are updated if Plaid reports changes
- Duplicate detection prevents re-importing transactions
- Synced transactions are marked with source = "plaid"

### Balance Refresh

- Balance data is fetched from Plaid on sync
- Local account balance is updated to reflect bank balance
- Users can see last-refreshed timestamp

### Sync Frequency

- Sync can be triggered manually by the user
- Automatic sync on app launch (if online and entitled)
- Periodic background sync while app is open (configurable)

---

## Institution Management

- Users can connect up to 5 institutions (default limit)
- Each institution may provide multiple accounts
- Institution repair flow for expired or broken connections
- Disconnect option removes the Plaid connection (local data remains)

---

## Error Handling

| Error | Behavior |
|-------|----------|
| Network unavailable | Show offline message, skip sync |
| Relay unavailable | Show service message, skip sync |
| Plaid API error | Show error with retry option |
| Institution requires reauth | Show repair flow |
| Subscription expired | Show resubscribe prompt |
| Rate limit | Back off and retry later |

---

## Data Ownership

- All synced transaction data is stored locally in the SQLite database
- If Bank Sync subscription is cancelled, previously synced data remains
- Synced transactions are editable like any other transaction
- Users can export synced data via CSV
- Disconnecting a Plaid institution does not delete local transactions

---

## Privacy

- Plaid API credentials are never stored in the desktop app
- The relay acts as a secure proxy between the desktop app and Plaid
- The relay should not store user financial data longer than necessary for transit
- The desktop app stores synced data locally only
- Privacy documentation should explain what Plaid requires and what data flows through the relay

---

## Implementation Timeline

Plaid Bank Sync is planned for Sprint 10, after the local product foundation is stable (Sprints 1-9). The local product must be excellent without bank sync before Plaid is introduced.

---

## Out of Scope

- Plaid investments API
- Plaid identity verification
- Plaid payment initiation
- Real-time transaction streaming
- Multi-relay failover
- Self-hosted relay option
