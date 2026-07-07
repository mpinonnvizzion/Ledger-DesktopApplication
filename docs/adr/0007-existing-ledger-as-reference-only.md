# ADR 0007: Existing Ledger App as Reference Only

**Status:** Accepted
**Date:** 2026-07-07

## Context

An existing Ledger application (v3) exists with its own architecture, codebase, and feature set. The Ledger v3 Desktop Architecture document describes its current implementation.

The new Ledger Desktop is a ground-up reimplementation using a different technology stack (Tauri 2 + React + Rust + SQLite). The existing app's architecture decisions, data structures, and implementation patterns may not align with the new product's goals.

## Decision

The existing Ledger application is treated as reference material only.

**Allowed:**
- Studying existing features and workflows
- Reusing product lessons learned
- Referencing UI patterns that worked well
- Comparing data structures for migration planning
- Learning from previous user feedback

**Not Allowed:**
- Modifying the current production Ledger app as part of this project
- Treating old architecture decisions as final for the new product
- Copying code or technical decisions without deliberate review
- Migrating code blindly from the old codebase
- Breaking the user's current working Ledger setup

## Consequences

- The new Ledger Desktop can make clean architectural decisions without legacy constraints
- Previous product knowledge is preserved and available for reference
- The old and new applications remain independent
- Data migration from v3 to the new Ledger Desktop may be planned as a future feature
- Development timeline is longer than modifying the existing app, but the result is a stronger foundation
