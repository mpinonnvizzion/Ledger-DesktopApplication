# Ledger Desktop

A commercial, local-first desktop finance application for individuals, freelancers, and small businesses.

## What Is Ledger Desktop?

Ledger Desktop is a professional finance application that places privacy, ownership, performance, and reliability at the center of every decision. Users own their financial records, choose where their data is stored, and can continue using the application regardless of an internet connection.

**Ledger Desktop is not SaaS.** It is a desktop application sold as a one-time purchase.

## Core Principles

- **Local-first** — User financial data is stored locally by default
- **Offline-first** — Core app works without an internet connection
- **Privacy-first** — Minimal data collection, no ads, no tracking
- **Desktop-first** — Built as a native desktop application, not a web app in a window
- **Ownership-first** — One-time purchase for the core app; users own their software

## Business Model

- Core application: one-time purchase ($79 target)
- Subscriptions exist **only** for recurring-cost services (e.g., Plaid bank sync)
- Core financial management features are never subscription-gated

## Target Architecture

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri 2 |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Rust (Tauri commands) |
| Database | SQLite (local) |
| Bank Sync | Plaid via cloud relay (optional) |
| Payments | Stripe |
| Licensing | Keygen or equivalent |
| Distribution | Direct download (macOS, Windows) |

## Target Customers

- Individuals managing personal finances
- Freelancers tracking personal and business expenses
- Small business owners (1-10 employees)
- Privacy-conscious users who prefer local software

## Project Status

**Current Phase:** Sprint 1 — Project Foundation (Complete)

The application shell is running: Tauri 2 desktop window with React frontend, sidebar navigation to four placeholder pages, and a working Rust command boundary.

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Rust stable toolchain (`rustup`)
- macOS: Xcode Command Line Tools
- Windows: Visual Studio C++ Build Tools, WebView2

### Development

```bash
npm install          # Install frontend dependencies
npm run dev          # Launch app in development mode with HMR
npm run build        # Production build (compile + bundle)
npm run lint         # Lint frontend code
npm run format:check # Check formatting
npm run test         # Run frontend tests
cd src-tauri && cargo test  # Run Rust tests
```

## Repository Structure

```
src/                  React frontend (TypeScript)
  api/                Tauri invoke wrappers
  components/layout/  App shell, sidebar, header
  components/ui/      Reusable UI primitives
  hooks/              Custom React hooks
  lib/                Utilities, constants, types
  pages/              Page-level components
src-tauri/            Rust backend (Tauri 2)
  src/commands/       Tauri command modules
docs/
  adr/                Architecture Decision Records
  business/           Business strategy and planning documents
  product/            Product requirements
  reference/          Reference materials (existing Ledger app)
  specifications/     Feature and system specifications
  sprint-notes/       Sprint retrospectives and notes
```

## Key Documents

- [PROJECT.md](PROJECT.md) — Product definition and scope
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical architecture
- [TASKS.md](TASKS.md) — Sprint planning and task tracking
- [CLAUDE.md](CLAUDE.md) — Claude Code operating rules
- [CHANGELOG.md](CHANGELOG.md) — Project changelog

## Existing Ledger App

The existing Ledger application (v3) is treated as reference only. It informs features and workflows but does not dictate the new architecture. See [ADR 0007](docs/adr/0007-existing-ledger-as-reference-only.md).
