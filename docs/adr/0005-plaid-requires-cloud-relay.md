# ADR 0005: Plaid Requires a Cloud Relay Service

**Status:** Accepted
**Date:** 2026-07-07

## Context

Plaid is the industry-standard service for bank account aggregation. Ledger Desktop plans to offer optional bank synchronization as a subscription add-on.

Plaid integration requires API credentials (client ID and secret) to communicate with the Plaid API. These credentials must be kept confidential.

A desktop application binary can be reverse-engineered. Storing Plaid API secrets in the desktop app would expose them to extraction, which would be a security and compliance violation.

## Decision

Plaid bank synchronization will be routed through a lightweight cloud relay service. Plaid API secrets will never be stored in the Ledger Desktop application binary.

**Cloud Relay Responsibilities:**
- Store and protect Plaid API credentials
- Create Link tokens for the desktop app
- Exchange public tokens for access tokens
- Proxy transaction sync and balance refresh requests
- Validate the user's Bank Sync subscription entitlement before each operation

**Desktop App Responsibilities:**
- Render Plaid Link in a webview using the Link token from the relay
- Send the public token to the relay after successful Link flow
- Receive synced transactions from the relay and store them locally
- Display connected account status and sync history
- Handle sync errors and institution repair flows

## Consequences

- Plaid secrets are secure on the server, not in the desktop binary
- Bank Sync requires internet connectivity (expected for bank sync)
- Bank Sync requires an active subscription (funds relay infrastructure)
- The relay service is a small operational cost that justifies the subscription model
- The relay must be reliable and well-monitored
- If the relay is unavailable, bank sync pauses but local data remains accessible
- Previously synced data is always available locally regardless of relay or subscription status
