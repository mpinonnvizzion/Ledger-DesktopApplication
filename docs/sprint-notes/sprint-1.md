# Sprint 1: Project Foundation — Implementation Plan

**Status:** Complete
**Date:** 2026-07-07

---

## Objective

Establish the desktop application foundation for Ledger Desktop. After Sprint 1, a developer can launch the Tauri desktop window, see a React frontend rendered inside it, navigate between placeholder pages, and invoke a basic Rust command from the frontend. The development workflow (dev, build, lint, format, test) is repeatable and documented.

Sprint 1 creates the skeleton. It does not create any financial features, database tables, or production UI.

---

## Scope

### 1. Tauri 2 Project Initialization

- Initialize a new Tauri 2 project in the repository root
- Configure `tauri.conf.json` with app identity:
  - App name: `Ledger Desktop`
  - Bundle identifier: `io.nvizzion.ledger`
  - Default window: 1280x800, centered, titled "Ledger Desktop"
  - Minimum window size: 900x600
- Set up the Rust backend (`src-tauri/`) with a clean `main.rs` and `lib.rs`
- Verify the app compiles and launches a desktop window

### 2. React + TypeScript + Vite Frontend

- Set up the React frontend using Vite with the TypeScript template
- Configure `vite.config.ts` for Tauri compatibility (dev server port, HMR)
- Verify hot module replacement works during development
- Configure TypeScript with strict mode (`tsconfig.json`)
- Set up path aliases for clean imports (`@/components`, `@/pages`, `@/lib`)

### 3. Tailwind CSS

- Install and configure Tailwind CSS v4 with Vite
- Create a base CSS file with Tailwind directives
- Define a minimal design token foundation:
  - Color palette (neutral grays, primary accent, semantic colors for income/expense/warning/error)
  - Font stack (system font stack for native feel)
  - Spacing scale (Tailwind defaults)
- Verify Tailwind utility classes render correctly in the Tauri window

### 4. Project Folder Structure

Create the directory structure defined in the v3 architecture reference, adapted for Sprint 1 scope:

```
src/
  api/              # Tauri invoke() wrapper (placeholder)
  components/       # Shared UI components
    layout/         # Shell, sidebar, header
    ui/             # Reusable primitives (button, card, etc.)
  hooks/            # Custom React hooks
  lib/              # Utilities, constants, types
  pages/            # Page-level components
  App.tsx           # Root component with router
  main.tsx          # Entry point

src-tauri/
  src/
    commands/       # Tauri command modules
    lib.rs          # Command registration
    main.rs         # Tauri app entry point
  Cargo.toml
  tauri.conf.json
```

### 5. Client-Side Routing

- Install React Router v7 (or v6)
- Set up a hash-based router (desktop apps don't have a server to handle fallback routes)
- Create placeholder page components for the future navigation structure:
  - Dashboard (default route `/`)
  - Accounts (`/accounts`)
  - Transactions (`/transactions`)
  - Settings (`/settings`)
- Each placeholder page renders its name and a brief description — no functional UI

### 6. App Shell and Navigation

- Create an app shell layout with:
  - Fixed sidebar navigation (left side, ~220px)
  - Main content area
  - Top header bar with app title / current page name
- Sidebar should list navigation links to the four placeholder pages
- Active route should be visually indicated in the sidebar
- The shell should feel like a desktop application, not a website:
  - No browser-style address bar
  - No underlined links
  - Calm, professional styling
  - System font stack

### 7. Tauri Command Boundary (Proof of Concept)

- Create a single Rust Tauri command: `greet(name: String) -> String`
  - Returns `"Hello, {name}! Ledger Desktop is running."`
- Create a TypeScript `invoke()` wrapper in `src/api/client.ts`
  - Provides typed function: `greet(name: string): Promise<string>`
- Wire the greet command into one placeholder page (e.g., Settings) to demonstrate the IPC boundary works
- This proves the frontend-to-Rust communication path before Sprint 2 builds real commands

### 8. Development Scripts

Configure the following npm scripts in `package.json`:

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `tauri dev` | Launch app in development mode with HMR |
| `build` | `tauri build` | Production build (compile + bundle) |
| `lint` | `eslint src/` | Lint frontend TypeScript/React code |
| `lint:fix` | `eslint src/ --fix` | Auto-fix lint issues |
| `format` | `prettier --write src/` | Format frontend code |
| `format:check` | `prettier --check src/` | Check formatting without modifying |
| `test` | `vitest` | Run frontend unit tests |
| `test:watch` | `vitest --watch` | Run tests in watch mode |

### 9. Linting and Formatting

- Install and configure ESLint with:
  - TypeScript parser (`@typescript-eslint/parser`)
  - React plugin (`eslint-plugin-react`, `eslint-plugin-react-hooks`)
  - Recommended rules as baseline
- Install and configure Prettier:
  - 2-space indentation
  - Single quotes
  - Trailing commas
  - Semicolons
- Ensure ESLint and Prettier do not conflict (`eslint-config-prettier`)
- Configure Rust formatting via `rustfmt.toml` in `src-tauri/` (Rust default style)

### 10. Testing Foundation

- Install and configure Vitest for frontend unit tests
- Create a sample test that verifies a utility function or component renders
- Set up the `src-tauri/` Rust project with `#[cfg(test)]` test module
- Create a sample Rust test that verifies the greet command logic
- Tests do not need to be comprehensive — they establish the testing pattern

### 11. Git Configuration

- Update `.gitignore` for the full project:
  - `node_modules/`, `dist/`, `target/`
  - OS files (`.DS_Store`, `Thumbs.db`)
  - Editor files (`.vscode/`, `.idea/`)
  - Environment files (`.env`, `.env.local`)
  - Tauri build artifacts
- Consider adding a `.editorconfig` for consistent editor behavior

---

## Out of Scope

Sprint 1 explicitly excludes:

| Exclusion | Reason |
|-----------|--------|
| Account management | Sprint 2-3 scope |
| Transactions | Sprint 2-3 scope |
| Categories | Sprint 2-3 scope |
| Reports | Sprint 5 scope |
| Budgets and goals | Sprint 5 scope |
| SQLite database setup | Sprint 2 scope |
| Database schema or migrations | Sprint 2 scope |
| Plaid integration | Sprint 10 scope |
| Stripe payments | Sprint 8 scope |
| License activation | Sprint 8 scope |
| Auto-updater | Sprint 9 scope |
| Authentication / app lock | Sprint 6 scope |
| Onboarding wizard | Sprint 6 scope |
| Cloud services of any kind | Not Sprint 1 |
| Production UI design | Incremental across future sprints |
| CSV import/export | Sprint 4 scope |
| Invoicing, clients, vendors | Sprint 7 scope |

---

## Deliverables

| # | Deliverable | Verification |
|---|-------------|-------------|
| 1 | Tauri 2 project that compiles | `npm run build` succeeds without errors |
| 2 | Desktop window opens | `npm run dev` opens a native window on macOS or Windows |
| 3 | React frontend renders in Tauri | Content is visible inside the desktop window |
| 4 | Tailwind CSS works | Utility classes produce correct styles |
| 5 | Sidebar navigation with 4 routes | Clicking sidebar links changes the active page |
| 6 | Rust command callable from frontend | Greet command returns expected string |
| 7 | ESLint passes | `npm run lint` exits 0 |
| 8 | Prettier passes | `npm run format:check` exits 0 |
| 9 | Frontend tests pass | `npm run test` exits 0 |
| 10 | Rust tests pass | `cargo test` in `src-tauri/` exits 0 |
| 11 | Folder structure matches plan | Directories exist as documented |

---

## Acceptance Criteria

Sprint 1 is complete when all of the following are true:

1. `npm run dev` launches a Tauri desktop window showing the React frontend
2. The window title is "Ledger Desktop"
3. A sidebar displays navigation links for Dashboard, Accounts, Transactions, and Settings
4. Clicking each link renders the corresponding placeholder page
5. At least one page demonstrates a successful Tauri command invocation (Rust → frontend)
6. `npm run lint` passes with no errors
7. `npm run format:check` passes with no errors
8. `npm run test` passes (at least one frontend test)
9. `cargo test` passes in `src-tauri/` (at least one Rust test)
10. `npm run build` completes without errors
11. The project folder structure matches the documented plan
12. No financial features, database schema, or production UI have been created

---

## Implementation Sequence

The tasks below should be implemented in order. Each step depends on the previous step being complete.

### Phase A: Project Bootstrap

1. **Initialize Tauri 2 project** with `create-tauri-app` or manual setup
2. **Verify bare Tauri window** opens with default Vite welcome page
3. **Clean default content** — remove boilerplate, set up blank `App.tsx`

### Phase B: Frontend Foundation

4. **Install and configure Tailwind CSS** — verify utility classes render
5. **Set up path aliases** in `tsconfig.json` and `vite.config.ts`
6. **Create folder structure** — `components/`, `pages/`, `api/`, `hooks/`, `lib/`
7. **Install React Router** — configure hash router with placeholder routes
8. **Build app shell** — sidebar layout, header, main content area
9. **Create four placeholder pages** — Dashboard, Accounts, Transactions, Settings
10. **Wire navigation** — sidebar links route to placeholder pages

### Phase C: Rust Command Boundary

11. **Create `commands/` directory** in `src-tauri/src/`
12. **Implement `greet` command** in Rust
13. **Register command** in `lib.rs`
14. **Create `src/api/client.ts`** — typed invoke wrapper
15. **Call greet from Settings page** — display result to prove IPC works

### Phase D: Developer Tooling

16. **Install and configure ESLint** — TypeScript + React rules
17. **Install and configure Prettier** — consistent formatting
18. **Resolve ESLint/Prettier conflicts** with `eslint-config-prettier`
19. **Configure `rustfmt.toml`** in `src-tauri/`
20. **Add npm scripts** — dev, build, lint, lint:fix, format, format:check, test, test:watch

### Phase E: Testing Foundation

21. **Install Vitest** — configure for React/TypeScript
22. **Write one frontend test** — component render or utility function
23. **Write one Rust test** — greet command logic
24. **Verify all test commands pass**

### Phase F: Finalization

25. **Update `.gitignore`** for full project
26. **Run full verification** — dev, build, lint, format:check, test, cargo test
27. **Update documentation** — TASKS.md, CHANGELOG.md, sprint-1 notes, ARCHITECTURE.md status
28. **Screenshot or manual verification** — app window with sidebar and placeholder page visible

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Tauri 2 CLI version incompatibility | Build fails | Medium | Pin Tauri CLI version in `package.json`. Check Tauri 2 stable release notes. |
| System webview differences (macOS vs Windows) | Rendering inconsistency | Low (Sprint 1 is simple) | Test on primary dev platform. Cross-platform testing in later sprints. |
| Tailwind v4 breaking changes | Config doesn't work | Low | Use v4 stable. Fall back to v3 if needed (document as ADR). |
| React Router hash mode issues in Tauri | Navigation broken | Low | Hash router is the standard pattern for Tauri apps. Well-documented. |
| Rust toolchain not installed | Can't compile | Low | Document prerequisite: `rustup` with stable toolchain. |
| Node/npm version mismatch | Dependency install fails | Low | Document minimum Node version (20+). Consider `.nvmrc`. |

---

## Prerequisites

Before starting Sprint 1 implementation, the development machine must have:

- **Node.js** 20+ and npm
- **Rust** stable toolchain via `rustup`
- **Tauri CLI** prerequisites for the target platform:
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio C++ Build Tools, WebView2
- **Git** configured

---

## Review Checklist

After implementation, verify each item before committing:

- [ ] `npm run dev` opens a Tauri window with React content
- [ ] Window title reads "Ledger Desktop"
- [ ] Sidebar has four navigation items: Dashboard, Accounts, Transactions, Settings
- [ ] Each sidebar link navigates to its placeholder page
- [ ] At least one page calls a Rust command and displays the result
- [ ] `npm run lint` exits 0
- [ ] `npm run format:check` exits 0
- [ ] `npm run test` exits 0 with at least one passing test
- [ ] `cargo test` (in `src-tauri/`) exits 0 with at least one passing test
- [ ] `npm run build` completes without errors
- [ ] Folder structure matches the documented plan
- [ ] No database files, migration files, or schema definitions exist
- [ ] No Plaid, Stripe, licensing, or updater code exists
- [ ] No account, transaction, category, or report implementations exist
- [ ] `.gitignore` covers `node_modules/`, `dist/`, `target/`, `.DS_Store`, `.env`
- [ ] TASKS.md updated with Sprint 1 status
- [ ] CHANGELOG.md updated with Sprint 1 entry
- [ ] Sprint 1 notes finalized

---

## Documentation Updates Required After Implementation

| Document | Update |
|----------|--------|
| TASKS.md | Mark Sprint 0 as complete. Update Sprint 1 tasks with detailed checklist. Mark completed items. |
| CHANGELOG.md | Add Sprint 1 entry under `[Unreleased]` with Added section. |
| ARCHITECTURE.md | Update status from "Sprint 0 — Documentation Foundation" to "Sprint 1 — Project Foundation". |
| README.md | Add "Getting Started" section with dev setup instructions (`npm install`, `npm run dev`). |
| CLAUDE.md | Remove or update "No Application Code During Sprint 0" rule to reflect Sprint 1 context. |
| docs/sprint-notes/sprint-1.md | Update status from Planned to Complete. Add any decisions made, deviations, or lessons. |

---

## Technology Version Targets

These are target versions. Use the latest stable release available at implementation time.

| Technology | Target Version | Notes |
|------------|---------------|-------|
| Tauri | 2.x (latest stable) | Use `@tauri-apps/cli` v2 |
| React | 19.x or 18.x | Use latest stable |
| TypeScript | 5.x | Strict mode enabled |
| Vite | 6.x or 5.x | Use latest stable |
| Tailwind CSS | 4.x | v4 uses CSS-first config |
| React Router | 7.x or 6.x | Hash router mode |
| ESLint | 9.x | Flat config format |
| Prettier | 3.x | |
| Vitest | 3.x or 2.x | |
| Rust | stable (latest) | Via `rustup` |

---

## Design Notes

### Sidebar Navigation

The sidebar is a permanent fixture of the Ledger Desktop UI. It should:
- Be fixed on the left side (~220px wide)
- Use icons alongside text labels (placeholder icons are acceptable in Sprint 1)
- Show the active page with a background highlight
- Feel like a desktop application panel, not a web menu
- Use Tailwind utility classes for all styling

### Color Direction

Sprint 1 does not require a final design system, but the initial Tailwind config should establish:
- A neutral gray palette for the shell (sidebar background, borders, text)
- A primary accent color (blue or teal range) for active states and interactive elements
- Semantic colors: green for income, red for expense, amber for warnings
- Dark text on light backgrounds as the default

These are starting points. They will evolve in future sprints.

### Window Behavior

- Default size: 1280x800
- Minimum size: 900x600
- Window should be resizable
- Window should remember position/size if Tauri supports it by default
- Title bar should use the system default (not a custom title bar in Sprint 1)
