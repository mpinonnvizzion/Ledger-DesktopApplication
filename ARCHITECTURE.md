# Ledger Desktop — Architecture Overview

**Version:** 1.0
**Status:** Sprint 1 — Project Foundation

---

## Architecture Philosophy

Ledger Desktop is a local-first, offline-first desktop application. Architecture decisions prioritize data ownership, offline capability, performance, and long-term maintainability over convenience features that would require cloud dependency.

Ledger Desktop is **not** SaaS. The architecture ensures that all core financial workflows operate entirely on the user's machine without requiring network access.

---

## Target Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Desktop Shell | Tauri 2 | Native desktop wrapper with Rust backend, small binary size, system webview |
| Frontend | React + TypeScript | Component-based UI with type safety |
| Build Tool | Vite | Fast development builds, optimized production output |
| Styling | Tailwind CSS | Utility-first CSS, consistent design system |
| Backend Logic | Rust (Tauri commands) | Performance, safety, direct SQLite access |
| Local Database | SQLite | Embedded, zero-config, file-based, proven for decades |
| Bank Sync | Plaid (via cloud relay) | Industry-standard bank aggregation |
| Payments | Stripe | Purchase flow and subscription billing |
| Licensing | Keygen or equivalent | License key activation, device binding, entitlements |
| Distribution | Direct download | .dmg (macOS), .msi/.exe (Windows) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Ledger Desktop                     │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │              React Frontend                    │  │
│  │  (TypeScript, Vite, Tailwind CSS)             │  │
│  │                                               │  │
│  │  Dashboard │ Accounts │ Transactions │ Reports │  │
│  │  Budgets │ Invoices │ Settings │ ...          │  │
│  └──────────────────┬────────────────────────────┘  │
│                     │ Tauri IPC                      │
│  ┌──────────────────┴────────────────────────────┐  │
│  │           Rust Backend (Tauri Commands)        │  │
│  │                                               │  │
│  │  Data Access │ Business Logic │ Import/Export  │  │
│  │  Licensing │ Security │ Backup │ Migration     │  │
│  └──────────────────┬────────────────────────────┘  │
│                     │                               │
│  ┌──────────────────┴────────────────────────────┐  │
│  │              SQLite Database                   │  │
│  │           (Local file on disk)                 │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │                              │
         │ License validation           │ Bank sync (optional)
         │ (periodic, with grace)       │ (subscription-gated)
         ▼                              ▼
  ┌─────────────┐              ┌──────────────────┐
  │  Keygen /   │              │  Plaid Cloud     │
  │  License    │              │  Relay Service   │
  │  Provider   │              │                  │
  └─────────────┘              │  Link tokens     │
         │                     │  Token exchange   │
         │                     │  Transaction sync │
         ▼                     └────────┬─────────┘
  ┌─────────────┐                      │
  │   Stripe    │                      ▼
  │  Payments   │              ┌──────────────────┐
  └─────────────┘              │     Plaid API    │
                               └──────────────────┘
```

---

## Data Architecture

### Local-First Storage

All user financial data is stored in a local SQLite database on the user's machine. The database file location is documented and accessible to the user for backup purposes.

Key data domains:
- Workspaces (personal, business)
- Accounts (checking, savings, credit, etc.)
- Transactions
- Categories
- Budgets and Goals
- Clients, Vendors, Invoices
- Receipts
- Import sessions

### Database Access

The Rust backend owns all database access. The React frontend communicates with the backend exclusively through Tauri IPC commands. The frontend never directly accesses SQLite.

### Migrations

Database schema changes use a migration system managed by the Rust backend. Migrations must be safe, tested, and reversible where possible.

### Backup and Export

Users can back up the database file directly. The application also provides CSV export and structured backup/restore workflows.

---

## Offline-First Design

Core workflows that must work offline:
- Open the application
- View all financial data
- Create, edit, delete transactions
- Manage accounts and categories
- Create and review budgets
- Generate reports
- Import CSV files
- Export data
- Back up the database

Workflows that require internet:
- License activation (initial; then grace period offline)
- License revalidation (periodic; 7-day grace)
- Plaid bank sync (requires active subscription)
- App update checks
- Purchase and subscription management

---

## Plaid Integration Architecture

Plaid bank synchronization requires a cloud relay because Plaid API secrets must never be stored in the desktop application binary.

**Cloud Relay Responsibilities:**
- Store Plaid API credentials securely
- Handle Link token creation
- Handle public token exchange
- Proxy transaction sync requests
- Validate subscription entitlement before each operation

**Desktop App Responsibilities:**
- Render Plaid Link in a webview
- Receive public token from Link
- Send public token to relay for exchange
- Receive synced transactions from relay
- Store synced transactions locally
- Manage connected account UI and sync status

See [ADR 0005](docs/adr/0005-plaid-requires-cloud-relay.md) and [Plaid Bank Sync Specification](docs/specifications/plaid-bank-sync.md).

---

## Licensing Architecture

- License keys are issued after Stripe purchase
- Activation binds a license key to a device fingerprint via the license provider
- Local license cache allows offline usage with grace period
- Subscription entitlements (e.g., Bank Sync) are checked separately
- License validation never transmits financial data

See [ADR 0006](docs/adr/0006-one-time-purchase-with-optional-subscriptions.md) and [Commercial Model Specification](docs/specifications/commercial-model.md).

---

## Security Architecture

- Financial data stored locally, never uploaded by default
- Local database may be protected by password/PIN with app-level lock
- Plaid tokens managed by cloud relay, not stored in desktop app
- License activation uses device fingerprint, not personal data
- Minimal telemetry; no financial data in crash reports
- Code signing and notarization for distribution trust

See [Security Model Specification](docs/specifications/security-model.md).

---

## Distribution Architecture

- Direct download from project website
- macOS: .dmg installer, Apple Developer ID signing, notarization
- Windows: .msi/.exe installer, code signing certificate
- Auto-update via Tauri updater system
- Signed update artifacts

See [Release and Distribution Specification](docs/specifications/release-and-distribution.md).

---

## Architecture Decision Records

All significant architecture decisions are recorded as ADRs in `docs/adr/`.

| ADR | Decision |
|-----|----------|
| [0001](docs/adr/0001-documentation-first-process.md) | Documentation-first development process |
| [0002](docs/adr/0002-desktop-first-architecture.md) | Desktop-first architecture using Tauri 2 |
| [0003](docs/adr/0003-local-first-data-ownership.md) | Local-first data ownership with SQLite |
| [0004](docs/adr/0004-offline-first-core-workflows.md) | Offline-first core workflows |
| [0005](docs/adr/0005-plaid-requires-cloud-relay.md) | Plaid requires a cloud relay service |
| [0006](docs/adr/0006-one-time-purchase-with-optional-subscriptions.md) | One-time purchase with optional subscriptions |
| [0007](docs/adr/0007-existing-ledger-as-reference-only.md) | Existing Ledger app as reference only |

---

## Architecture Guardrails

- All core workflows must function offline
- User financial data must never leave the device without explicit opt-in
- The frontend never directly accesses the database
- Plaid secrets never exist in the desktop binary
- Subscriptions gate only recurring-cost services
- Architecture decisions must be documented as ADRs before implementation
