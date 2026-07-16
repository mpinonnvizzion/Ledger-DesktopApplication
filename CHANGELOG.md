# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Sprint 4 implementation plan (`docs/sprint-notes/sprint-4.md`)
  - Transaction engine design: signed-integer amounts (no persisted type column), schema, repository, commands, TypeScript API
  - Balance strategy: cached balance with transactional updates (ADR 0009 required before implementation)
  - Transfer scope: fully deferred (no transfer type, no partial reservation — ADR required before any transfer work)
  - Import foundation: atomic batch-create with shared validation pathway (no import_session_id column)
  - Performance targets: 10k < 50ms, 50k < 100ms, 100k < 200ms (non-gating, documented)
  - 47 acceptance criteria for Milestone 2 completion
- Updated TASKS.md with Sprint 4 phased task breakdown (6 phases, ~30 tasks)
- Sprint 5 implementation plan (`docs/sprint-notes/sprint-5.md`)
  - Personal Finance UI: connect existing Tauri commands to desktop interface
  - Scope: workspace init, accounts CRUD, categories CRUD, transactions CRUD with search/filter/sort/pagination, simple dashboard
  - No new Rust code, commands, or migrations — UI integration only
  - 46 acceptance criteria
  - 6 implementation phases (Foundation → Accounts → Categories → Transactions → Dashboard → Polish)
- Updated TASKS.md with Sprint 5 phased task breakdown (6 phases)

### Changed
- Revised Sprint 4 plan: removed transfer type from schema, removed import_session_id, adopted signed-integer semantics without redundant type column, strengthened performance test documentation requirements
- **Milestone 3 sprint redistribution:**
  - Sprint 5 repurposed from "Budgets, Goals, and Reports" to "Personal Finance UI"
  - Sprint 6 repurposed from "Local Security and Onboarding" to "Budgets, Goals, and Reports" (absorbs original Sprint 5 scope + CSV import/export)
  - Sprint 7 combined "Local Security and Onboarding" + "Lightweight Business Finance" into "Security, Onboarding, and Business Finance"
  - Rationale: the data platform needs a working UI before reports/budgets can be built on it
- Refined Sprint 5 plan: added Backend Change Rule, documented 500-row dashboard limitation as known API gap, verified account archive support (is_active field exists), specified account deletion cascade warning requirements, specified category deletion behavior (system protection + SET NULL for user categories), removed obsolete Sprint-4-incomplete risk
- Updated docs/milestones.md: Milestone 2 → Complete, Milestone 3 → In Progress, sprint names aligned
- Updated docs/business/ROADMAP.md: Sprint 5/6/7 definitions aligned with milestone changes

## Sprint 3 — 2026-07-08

### Added
- **Domain model types** (`src-tauri/src/models/`)
  - `Workspace` entity with `WorkspaceType` enum (personal, business)
  - `Account` entity with `AccountType` enum (checking, savings, credit_card, cash, investment, loan, other)
  - `Category` entity with `CategoryType` enum (income, expense)
  - Input structs for create and update operations per entity
- **Database migrations** (`src-tauri/migrations/`)
  - `0002_workspaces.sql`: workspaces table with CHECK constraint on workspace_type
  - `0003_accounts.sql`: accounts table with FK to workspaces, balance as INTEGER (cents per ADR 0008), index on workspace_id
  - `0004_categories.sql`: categories table with FK to workspaces, self-referential FK for parent_id, UNIQUE constraint on (workspace_id, name, category_type), indexes on workspace_id and parent_id
- **Repository layer** (`src-tauri/src/repositories/`)
  - `WorkspaceRepository`: CRUD with name validation (non-empty, ≤100 chars), cascade delete to accounts and categories
  - `AccountRepository`: CRUD with workspace existence validation, list by workspace, balance defaults to 0
  - `CategoryRepository`: CRUD with workspace and parent validation, duplicate detection, seed defaults (4 income + 13 expense system categories), system category deletion protection
- **Extended error handling** (`src-tauri/src/error.rs`)
  - Added `NotFound`, `Validation(String)`, `Conflict(String)` variants to `DomainError`
  - `rusqlite::Error::QueryReturnedNoRows` maps to `DomainError::NotFound`
  - UNIQUE constraint violations map to `DomainError::Conflict`
  - `CommandError` conversion for new error variants with stable error codes
- **Tauri commands** (`src-tauri/src/commands/`)
  - 5 workspace commands: create, get, list, update, delete
  - 5 account commands: create, get, list_by_workspace, update, delete
  - 6 category commands: create, get, list_by_workspace, update, delete, seed_default_categories
- **TypeScript API wrappers** (`src/api/`)
  - `workspaces.ts`, `accounts.ts`, `categories.ts` with typed invoke functions
- **TypeScript domain types** (`src/types/domain.ts`)
  - Interfaces mirroring Rust entity and input structs
  - String union types for WorkspaceType, AccountType, CategoryType
- **Frontend utilities** (`src/lib/`)
  - `errors.ts`: CommandError interface, error code constants, parse helper
  - `format.ts`: `formatAmount` (cents → display) and `parseAmount` (display → cents)
- **35 new Rust tests** (46 total unit + 3 integration)
  - 10 workspace repository tests (CRUD, validation, cascade)
  - 11 account repository tests (CRUD, validation, FK checks)
  - 14 category repository tests (CRUD, validation, conflict, seed, parent hierarchy)
- **8 frontend tests** (9 total)
  - formatAmount and parseAmount for zero, typical, negative, large, and single-digit-cent amounts
- Sprint 3 implementation plan (`docs/sprint-notes/sprint-3.md`)

### Changed
- Updated `DomainError` from 3 variants (Database, Io, Migration) to 6 variants (+ NotFound, Validation, Conflict)
- Updated `From<rusqlite::Error>` to distinguish NotFound and Conflict from generic Database errors
- Updated migration idempotency test to check count equality rather than hardcoded value
- Updated integration tests for 4 migrations (was 1)

## Sprint 2 — 2026-07-07

### Added
- **SQLite database foundation** (`src-tauri/src/db/`)
  - `rusqlite` with `bundled` feature for consistent cross-platform SQLite
  - Database auto-creation in Tauri app data directory (`~/Library/Application Support/io.nvizzion.ledger/ledger.db`)
  - Connection lifecycle: open, configure pragmas, share via `Mutex<Connection>`
  - WAL mode, foreign key enforcement, 5000ms busy timeout
  - Forward-only embedded migration system with `_migrations` tracking table
  - Schema version-ahead detection (prevents older app from corrupting newer database)
  - WAL checkpoint utility for backup foundation
  - `0001_initial_schema.sql`: creates `app_settings` key-value table
- **Error handling foundation** (`src-tauri/src/error.rs`)
  - `DomainError` enum (Database, Io, Migration variants)
  - `CommandError` struct with code/message (strips internal details)
  - Error conversions from `rusqlite::Error` and `std::io::Error`
- **Application state** (`src-tauri/src/state.rs`)
  - `AppState` with `Mutex<Connection>` registered as Tauri managed state
- **System commands** (`src-tauri/src/commands/system.rs`)
  - `db_info` command returns database path, schema version, WAL/FK status
  - `greet` command moved from `commands/mod.rs` to `commands/system.rs`
- **14 Rust tests** (11 unit + 3 integration)
  - Connection: directory creation, WAL mode, foreign keys, busy timeout, WAL checkpoint
  - Migrations: table creation, idempotency, invalid SQL, version-ahead detection, transaction rollback
  - Integration: data persistence across close/reopen, migration tracking, AppState wrapping

### Added (pre-Sprint 2)
- **Architecture Phase 1: Local Data Platform** (`docs/architecture/`)
  - Database architecture: SQLite role, connection lifecycle, WAL mode, migrations, data types, testing
  - Repository architecture: repository pattern, domain types, validation, transaction boundaries
  - Tauri command architecture: IPC conventions, naming, request/response shape, TypeScript wrappers
  - State management: React state philosophy, data loading patterns, Context usage guidelines
  - Folder structure: backend and frontend organization, naming conventions, testing layout
  - Error handling: error categories, propagation, user-facing messages, logging, privacy
  - Backup and restore: backup philosophy, WAL checkpoint safety, restore workflow, migration compatibility
- ADR 0008: Monetary amounts as integer minor units (`docs/adr/0008-monetary-amounts-as-integer-minor-units.md`)
- Sprint 2 implementation plan (`docs/sprint-notes/sprint-2.md`)
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
