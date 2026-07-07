# ADR 0003: Local-First Data Ownership With SQLite

**Status:** Accepted
**Date:** 2026-07-07

## Context

Ledger Desktop's core value proposition is that users own their financial data. The product vision, target customer, and product guardrails all emphasize that:

- User financial data should be stored locally by default
- Users should know where their data lives
- Users should be able to back up, export, and move their data
- No cloud account should be required for core financial management
- Data should remain accessible even if Ledger as a company ceases to exist

## Decision

Ledger Desktop will store all user financial data in a local SQLite database on the user's machine.

- SQLite is embedded, zero-configuration, and file-based
- The database file is a regular file the user can copy, back up, or move
- All core data access happens through the Rust backend via Tauri commands
- The application provides CSV export, structured backup, and restore workflows
- No financial data is uploaded to any server unless the user explicitly opts into a connected service (e.g., Plaid bank sync stores synced transaction data locally after retrieval)

## Consequences

- Users have complete ownership of their financial records
- The application works without any server infrastructure for core features
- SQLite is proven, fast, and well-suited for single-user desktop applications
- Data portability is straightforward (single file + export options)
- Multi-device sync is not available out of the box (future optional cloud service)
- Users are responsible for their own backups (the app should encourage and simplify this)
- Large datasets may eventually require optimization (indexing, pagination)
