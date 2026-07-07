# Sprint 0: Documentation and Architecture Foundation

**Status:** Complete
**Date:** 2026-07-07

---

## Objective

Prepare the Ledger Desktop repository for disciplined product development. Sprint 0 is documentation only — no application code.

---

## What Was Done

### Root Documents Created
- **README.md** — Product overview, architecture summary, repository structure
- **PROJECT.md** — Product definition, business model summary, documentation map
- **ARCHITECTURE.md** — Target technology stack, system architecture diagram, design principles
- **TASKS.md** — Phase -1 completion, Sprint 0 checklist, Sprint 1 scope, future sprint outline through Sprint 12
- **CLAUDE.md** — Claude Code operating rules for the project
- **CHANGELOG.md** — Project changelog in Keep a Changelog format

### Architecture Decision Records (7)
- ADR 0001: Documentation-first development process
- ADR 0002: Desktop-first architecture using Tauri 2
- ADR 0003: Local-first data ownership with SQLite
- ADR 0004: Offline-first core workflows
- ADR 0005: Plaid requires a cloud relay service
- ADR 0006: One-time purchase with optional subscriptions
- ADR 0007: Existing Ledger app as reference only

### Specifications (7)
- App Scope — v1.0 inclusions, exclusions, future candidates
- Data Model Overview — Core entities, relationships, integrity rules
- Security Model — Local data security, Plaid security, telemetry, distribution
- Onboarding Flow — First-launch experience, trial, returning user
- Commercial Model — Pricing, licensing, payment flows, cancellation
- Plaid Bank Sync — Architecture, sync behavior, subscription gating
- Release and Distribution — Build pipeline, installers, updates, code signing

### Folder Structure
- `docs/adr/` — Architecture Decision Records
- `docs/specifications/` — Feature and system specifications
- `docs/sprint-notes/` — Sprint retrospectives and notes
- `docs/business/` — Business strategy documents (pre-existing)
- `docs/product/` — Product requirements (pre-existing)
- `docs/reference/` — Reference materials (pre-existing)

### Housekeeping
- Normalized business document filenames (VISION.md, TARGET_CUSTOMER.md, PRODUCT_GUARDRAILS.md, PRICING_AND_PACKAGING.md)
- Initialized git repository

---

## Key Decisions

1. All documentation consistently states: Ledger Desktop is not SaaS
2. User financial data is stored locally by default
3. Core app works offline
4. Plaid is optional and subscription-gated
5. Subscriptions only exist for recurring-cost services
6. The existing Ledger app is reference only — not the codebase to modify
7. No application code was created during Sprint 0

---

## What Was Not Done

- No application code, scaffolding, or project initialization
- No Tauri setup
- No database creation
- No Plaid or Stripe implementation
- No frontend or backend code

This is intentional. Sprint 0 is documentation only.

---

## Next: Sprint 1

Sprint 1 (Project Foundation) will initialize the Tauri 2 project with React, TypeScript, Vite, and Tailwind CSS. See [TASKS.md](../../TASKS.md) for the full Sprint 1 scope.
