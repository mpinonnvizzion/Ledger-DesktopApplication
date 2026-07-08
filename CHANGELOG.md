# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **Architecture Phase 1: Local Data Platform** (`docs/architecture/`)
  - Database architecture: SQLite role, connection lifecycle, WAL mode, migrations, data types, testing
  - Repository architecture: repository pattern, domain types, validation, transaction boundaries
  - Tauri command architecture: IPC conventions, naming, request/response shape, TypeScript wrappers
  - State management: React state philosophy, data loading patterns, Context usage guidelines
  - Folder structure: backend and frontend organization, naming conventions, testing layout
  - Error handling: error categories, propagation, user-facing messages, logging, privacy
  - Backup and restore: backup philosophy, WAL checkpoint safety, restore workflow, migration compatibility
- ADR 0008: Monetary amounts as integer minor units (`docs/adr/0008-monetary-amounts-as-integer-minor-units.md`)
- Updated ARCHITECTURE.md with Architecture Phase 1 section and document links
- Updated PROJECT.md documentation map with architecture documents

### Changed
- **Finalized milestone and sprint structure** (`docs/milestones.md` v2.1, `TASKS.md`, `docs/business/ROADMAP.md`)
  - Milestone 2: Sprints 2, 3, 4 (Local Data Platform)
  - Milestone 3: Sprints 5, 6, 7 (Core Finance Features)
  - Milestone 4: Sprints 8, 9, 11, 12 (Commercial Readiness)
  - Milestone 5: Sprint 10 (Optional Connected Services)
  - Sprint 2 scoped as "Database Foundation" (SQLite, migrations, DB service)
  - Sprint 3 scoped as "Core Domain Entities" (repository layer, accounts, categories)
  - Sprint 4 scoped as "Transaction Engine" (CRUD, search, filtering, import foundation)
  - Sprint 8 placed in Milestone 4 alongside packaging, distribution, and launch
  - ROADMAP.md Sprint 2/3/4 definitions updated to match milestone structure
  - Removed temporary re-scoping notes from milestones.md
- Updated TASKS.md: Sprint 1 marked as completed, sprints organized under milestone headers

### Fixed
- **Build script recursion**: `npm run build` no longer triggers `tauri build` (which re-invoked `npm run build` via `beforeBuildCommand`). `build` now runs frontend-only (`tsc && vite build`); full desktop build uses `npm run tauri:build`. Also fixed `beforeDevCommand` in `tauri.conf.json` to call `npx vite` directly instead of `npm run dev`.

## Sprint 1 — 2026-07-07

### Added
- **Tauri 2 project foundation** initialized with React 19, TypeScript 5.8, Vite 7
  - Bundle identifier: `io.nvizzion.ledger`, window 1280×800, min 900×600
- **Tailwind CSS v4** with custom design tokens (primary palette, semantic colors, system font stack)
- **App shell layout** with fixed sidebar navigation and header
- **Four placeholder pages**: Dashboard, Accounts, Transactions, Settings
- **Hash-based routing** via React Router v7
- **Rust command boundary**: `greet` command in `src-tauri/src/commands/`, typed invoke wrapper in `src/api/client.ts`, wired into Settings page
- **ESLint 9** with TypeScript, React Hooks, and React Refresh plugins
- **Prettier 3** with eslint-config-prettier integration
- **Vitest 3** with jsdom environment and Testing Library
- **Frontend test**: Dashboard component render test
- **Rust test**: greet command logic test
- **TypeScript path aliases**: `@/` maps to `src/`
- **npm scripts**: dev, build, lint, lint:fix, format, format:check, test, test:watch
- **Sprint 1 Implementation Plan** (`docs/sprint-notes/sprint-1.md`)

### Changed
- Updated TASKS.md: Sprint 1 tasks marked complete
- Updated README.md: added Getting Started section, updated project status
- Updated ARCHITECTURE.md: status updated to Sprint 1

---

## Sprint 0 — 2026-07-07

### Added
- **Sprint 0: Documentation and Architecture Foundation**
  - README.md with product overview, architecture summary, and repository structure
  - PROJECT.md with product definition, business model summary, and documentation map
  - ARCHITECTURE.md with target technology stack, system architecture, and design principles
  - CLAUDE.md with Claude Code operating rules for the Ledger Desktop project
  - TASKS.md with Phase -1 completion, Sprint 0 checklist, Sprint 1 scope, and future sprint outline
  - CHANGELOG.md (this file)
  - ADR 0001: Documentation-first development process
  - ADR 0002: Desktop-first architecture using Tauri 2
  - ADR 0003: Local-first data ownership with SQLite
  - ADR 0004: Offline-first core workflows
  - ADR 0005: Plaid requires a cloud relay service
  - ADR 0006: One-time purchase with optional subscriptions
  - ADR 0007: Existing Ledger app as reference only
  - Specification: App Scope
  - Specification: Data Model Overview
  - Specification: Security Model
  - Specification: Onboarding Flow
  - Specification: Commercial Model
  - Specification: Plaid Bank Sync
  - Specification: Release and Distribution
  - Sprint 0 notes
  - Normalized business document filenames (VISION.md, TARGET_CUSTOMER.md, PRODUCT_GUARDRAILS.md, PRICING_AND_PACKAGING.md)
  - Ledger v3 Desktop Architecture converted to readable Markdown (docs/reference/Ledger_v3_Desktop_Architecture.md)

### Fixed
- Converted VISION.md and TARGET_CUSTOMER.md from UTF-16LE to UTF-8 with proper Markdown formatting
- Removed misspelled duplicate source files (VISION.txt, Targer_Customer.txt, PRODUCT_GAURDRAILS.md, PRICING_AND_PACKAKING.md)

### Phase -1 (Pre-Sprint 0)
- Vision document
- Target Customer document
- Business Model document
- Product Strategy document
- Competitor Analysis document
- Roadmap document
- Product Guardrails document
- Pricing and Packaging document
- Licensing and Activation document
- Release Strategy document
- Product Requirements Document
- Ledger v3 Desktop Architecture reference document
