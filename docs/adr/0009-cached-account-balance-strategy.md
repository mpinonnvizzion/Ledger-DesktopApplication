# ADR 0009: Cached Account Balance with Transactional Updates

**Status:** Accepted
**Date:** 2026-07-16

## Context

Account balances must be available for display on dashboards, account lists, and transaction views. A balance is the sum of all transaction amounts belonging to an account.

Two fundamental approaches exist:

1. **Computed on read:** `SELECT COALESCE(SUM(amount_minor), 0) FROM transactions WHERE account_id = ?` on every request.
2. **Cached with transactional update:** Maintain `accounts.balance` as a running total, updated atomically with every transaction mutation.

With potentially 100,000+ transactions per account over years of use, computed-on-read degrades to O(n) per balance request. Cached balance provides O(1) reads.

## Decision

Use **cached account balance with transactional updates**.

The `accounts.balance` column (already exists from Sprint 3, defaults to 0) stores the running total. Every transaction create, update, or delete adjusts the balance atomically within the same SQLite database transaction.

### Balance Update Rules

- **Create:** `balance += amount_minor`
- **Update (amount changed):** `balance += (new_amount - old_amount)`
- **Update (account changed):** old account `balance -= amount_minor`, new account `balance += amount_minor`
- **Delete:** `balance -= amount_minor`
- **Batch create:** All balance updates within a single SQLite transaction

### Atomicity Guarantees

- Account balance changes occur in the same SQLite transaction as the transaction row mutation.
- A failed write leaves both the transaction table and account balances unchanged (full rollback).
- Batch operations wrap all inserts and all balance updates in a single transaction.

### Verification and Recovery

- `verify_balance(account_id)` computes `SUM(amount_minor)` and compares against the cached value. Returns true if consistent, false if drift is detected.
- `rebuild_balance(account_id)` sets `accounts.balance = SELECT COALESCE(SUM(amount_minor), 0) FROM transactions WHERE account_id = ?`. This is a recovery operation, not a normal-path operation.

### Testing Requirements

After every test that modifies transactions, assert that `accounts.balance` equals `SELECT COALESCE(SUM(amount_minor), 0) FROM transactions WHERE account_id = ?`.

## Alternatives Considered

### Computed on Read

Compute `SUM(amount_minor)` on every balance request.

- Pro: Always correct, no drift risk.
- Con: O(n) per request. At 100k transactions, every dashboard load scans the full table. Unacceptable for a desktop app targeting instant responsiveness.

### Event Sourcing

Derive balance from an append-only event log.

- Pro: Full audit trail, temporal queries.
- Con: Massive complexity increase for a local desktop app. No documented requirement for audit trails. SQLite is not an event store.

## Consequences

- Balance reads are O(1) — a single column lookup.
- Every transaction mutation must update balances in the same database transaction. This adds complexity to create, update, and delete operations.
- Drift is possible if a mutation bypasses the repository (direct SQL, corruption). `verify_balance` and `rebuild_balance` provide detection and recovery.
- The `accounts.balance` column already exists and requires no schema change.
