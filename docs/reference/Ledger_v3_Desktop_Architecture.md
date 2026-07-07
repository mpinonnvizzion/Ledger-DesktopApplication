<!-- Converted from Ledger_v3_Desktop_Architecture.docx -->

# LEDGER

Desktop Finance App

Architecture & Technical Specification

---

Version 1.0 — Fresh Build

June 2026

Nvizzion

# 1. Executive Summary

Ledger is a desktop personal and business finance management application built from scratch with Tauri 2, React, and SQLite. It is designed as a commercial product for direct sale.

The business model is a one-time purchase for the core app (manual transactions, CSV import, budgets, invoicing, reports) with an optional monthly subscription for automatic bank synchronization via Plaid.

Target platforms: macOS (Intel + Apple Silicon) and Windows (10/11) at launch.

An existing self-hosted Ledger app (Express + PostgreSQL) serves as a reference implementation for features, UI patterns, and business logic. This new project is a clean build, not a migration.

## Key Decisions

| Decision | Choice |
| --- | --- |
| Desktop Framework | Tauri 2 (Rust core + system webview) |
| Local Database | SQLite with WAL mode via tauri-plugin-sql |
| Frontend | React 18 + Vite + Tailwind CSS |
| Bank Sync | Plaid API via lightweight cloud relay (subscription feature) |
| Payments | Stripe (one-time purchase + subscription) |
| Licensing | Keygen or LicenseSeat with device binding |
| Auto-Updates | tauri-plugin-updater with CrabNebula Cloud or S3 |
| Encryption | AES-256-GCM (Rust aes-gcm crate), keys in OS keychain |
| Infrastructure | No servers. Cloud relay on Vercel/Cloudflare Workers. Landing page on Vercel. |

# 2. Architecture Overview

## 2.1 Reference Implementation

An existing self-hosted Ledger app provides the feature blueprint. It includes: dashboard with widgets, transaction management, accounts, categories, budgets, goals, invoicing, AP/AR, receipts, CSV import, Plaid bank sync, vendor/client management, spending analytics, and reports.

The new app will replicate these features using a completely different architecture (desktop-native instead of web-hosted). UI components and business logic from the reference app inform the design but are rebuilt from scratch to fit the Tauri + SQLite model.

## 2.2 Architecture Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Shell | Tauri 2 (Rust) | Window management, IPC, OS integration, encryption, file system |
| UI | React 18 + Vite + Tailwind | All pages, components, routing, state management |
| Data | SQLite + tauri-plugin-sql | Local database, WAL mode, migrations |
| Secrets | OS Keychain (macOS Keychain / Windows Credential Manager) | Encryption keys, Plaid tokens at rest |
| Cloud Relay | Cloudflare Worker or Vercel Edge Function | Plaid token exchange only (no user data stored) |
| Payments | Stripe + Keygen | License keys, subscription management |
| Landing Page | Vercel | Marketing site, Stripe checkout, download links |

### Data Flow

User → Tauri Webview (React UI) → IPC invoke() → Rust Commands → SQLite

For Plaid sync: Rust Command → HTTPS → Cloud Relay → Plaid API → response → SQLite

The cloud relay is stateless. It authenticates requests using the app license key, proxies calls to Plaid, and returns the response. No user financial data is stored server-side. There are no self-hosted servers.

# 3. Database Design (SQLite)

## 3.1 Overview

The app uses a single SQLite database file stored in the user’s application data directory. WAL mode is enabled for concurrent read performance. The database is encrypted at rest using SQLCipher or application-level AES-256-GCM.

## 3.2 Core Tables

| Table | Purpose & Key Columns |
| --- | --- |
| workspaces | Personal/Business separation. Columns: id, name, type (personal\|business), currency, created_at |
| accounts | Bank accounts, credit cards, cash. Columns: id, workspace_id, name, type, balance, currency, created_at |
| transactions | Income/expense/transfer entries. Columns: id, account_id, category_id, workspace_id, amount, type, description, date, notes, plaid_transaction_id |
| categories | Income/expense categories with colors. Columns: id, workspace_id, name, type, color, exclude_from_budget, exclude_from_recurring |
| budgets | Monthly budget targets per category. Columns: id, workspace_id, category_id, amount, period |
| goals | Savings goals with target amounts/dates. Columns: id, workspace_id, name, target_amount, current_amount, target_date |
| contacts | Vendors and clients. Columns: id, workspace_id, name, email, type (vendor\|client), notes |
| invoices | Invoice records with line items. Columns: id, workspace_id, client_id, number, status, due_date, total, line_items (JSON) |
| ap_ar | Accounts payable/receivable. Columns: id, workspace_id, contact_id, type (payable\|receivable), amount, due_date, status |
| receipts | Receipt images linked to transactions. Columns: id, transaction_id, file_path, uploaded_at |

## 3.3 Plaid Tables

| Table | Purpose & Key Columns |
| --- | --- |
| plaid_items | Connected bank institutions. Columns: id, workspace_id, item_id, access_token (encrypted), institution_name, status, cursor, last_synced_at |
| plaid_accounts | Accounts within a Plaid item. Columns: id, item_id, plaid_account_id, name, type, subtype, mask, current_balance, available_balance |

## 3.4 App Config Tables

| Table | Purpose & Key Columns |
| --- | --- |
| app_settings | App-wide config. Columns: key, value. Stores: app_mode, default_currency, auto_lock_minutes, onboarding_complete, license_key |
| dashboard_layout | User’s custom dashboard widget positions. Columns: id, workspace_id, layout_json |
| budget_alerts | Alert thresholds for budget tracking. Columns: id, budget_id, threshold_pct, triggered_at |
| import_sessions | CSV import history for dedup. Columns: id, workspace_id, filename, row_count, imported_at |

## 3.5 SQLite-Specific Notes

- All dates stored as TEXT in ISO 8601 format (e.g., 2026-06-28T12:00:00Z)
- Monetary amounts stored as REAL with ROUND() for display precision
- Arrays and complex objects stored as JSON text columns
- WAL mode enabled on database open for concurrent read performance
- Foreign keys enforced via PRAGMA foreign_keys = ON
- Migrations run sequentially on app launch via tauri-plugin-sql migration system
# 4. Frontend Architecture

## 4.1 API Layer

All data access goes through Tauri’s IPC invoke() system. A centralized api/client.js module wraps invoke() calls and provides a consistent interface for all pages.

### Example Pattern

| Frontend Call | Tauri Command |
| --- | --- |
| api.transactions.list(workspaceId) | invoke('get_transactions', { workspaceId }) |
| api.accounts.create({ name, type }) | invoke('create_account', { name, type, ... }) |
| api.plaid.createLinkToken() | invoke('plaid_link_token') → cloud relay |

## 4.2 Pages (Reference Feature List)

These pages match the features in the reference app and will be built for the new product:

- Dashboard — Customizable widget grid (stats, charts, recent transactions, budget progress, net worth)
- Transactions — Full CRUD with filters, search, pagination, category assignment
- Accounts — Account list with balances, manual or Plaid-linked
- Categories — Income/expense categories with colors, budget/recurring exclusion flags
- Budgets & Spending — Monthly budget targets, spending by category, calendar heatmap
- Goals — Savings goals with progress tracking
- Invoicing — Invoice creation, templates, PDF generation, status tracking
- Clients & Vendors — Contact management linked to invoices and AP/AR
- AP/AR — Accounts payable and receivable tracking
- Receipts — Image upload linked to transactions
- Reports — Year-over-year, profit trends, top vendors, month comparison
- Import — CSV import with column mapping and dedup
- Connected Accounts — Plaid bank connections (subscription-gated)
- Settings — App mode, currency, lock settings, license info, subscription management, backup/export
- Calendar — Transaction calendar view
## 4.3 New Pages (Not in Reference)

- SetupWizard.jsx: First-launch onboarding flow (see Section 6)
- UnlockScreen.jsx: PIN/password entry on app launch
- LicenseActivation.jsx: Enter and validate license key
- SubscriptionGate.jsx: Wraps Plaid features, checks subscription status
- UpdateNotification.jsx: In-app banner when a new version is available
# 5. Plaid Integration Architecture

## 5.1 Why a Cloud Relay

Plaid requires server-side API calls for token exchange and transaction syncing. The Plaid secret key cannot be embedded in a desktop binary (it would be extractable). A thin, stateless cloud relay solves this.

## 5.2 Cloud Relay Design

A minimal API deployed as a Cloudflare Worker or Vercel Edge Function. It holds the Plaid client_id and secret, authenticates requests using the app’s license key, and proxies calls to Plaid. No user data is stored. No database. No servers to maintain.

### Endpoints

| Endpoint | Purpose | Auth |
| --- | --- | --- |
| POST /link-token | Create Plaid Link token for bank connection | License key + subscription |
| POST /exchange | Exchange public token for access token | License key + subscription |
| POST /sync | Proxy transactions/sync call | License key + subscription |
| POST /balance | Proxy balance refresh | License key + subscription |

## 5.3 Security Model

- Plaid secret key lives ONLY on the cloud relay — never in the desktop binary
- Access tokens returned encrypted to the client, stored in local SQLite (AES-256-GCM)
- Relay validates license key and subscription status before proxying any call
- No financial data persisted server-side — pure pass-through
- Rate limiting on the relay prevents abuse
## 5.4 Sync Flow

1. User clicks “Connect Bank” → app calls relay /link-token → Plaid Link opens in webview

2. User completes Plaid Link → public_token returned → app calls relay /exchange

3. Relay returns encrypted access_token → stored in local SQLite plaid_items table

4. On app launch + every 30 min: app calls relay /sync with encrypted token → new transactions written to local SQLite

5. If subscription expires: sync stops, but all previously synced data remains accessible

# 6. First-Launch Onboarding Flow

| Step | Screen | Details |
| --- | --- | --- |
| 1 | Welcome | App branding, value prop, “Get Started” CTA |
| 2 | License Activation | Enter license key received after purchase. Validate against Keygen API. Bind to device. |
| 3 | Set Local Password | Create PIN or password to encrypt and lock the local database. Store hash in SQLite, key in OS keychain. |
| 4 | Choose App Mode | Personal / Business / Both. Determines default workspace and feature prominence. |
| 5 | Create First Workspace | Name the workspace. If “Both” mode, create Personal + Business workspaces. |
| 6 | Add First Account | Manual account (checking, savings, credit, etc.) OR connect via Plaid (shows subscription upsell if not subscribed). |
| 7 | Import Data (Optional) | CSV import from bank or another finance app. Show supported formats. |
| 8 | Set Currency | Default currency for the workspace. Can be changed later. |
| 9 | Dashboard Tour | Highlight key areas: sidebar nav, quick-add button, workspace switcher, reports. |
| 10 | Done | Drop into the dashboard with the first account visible. |

Every step after License Activation includes “Skip” and “Back” options. The wizard can be re-accessed from Settings.

# 7. Licensing & Payment Architecture

## 7.1 Business Model

| Tier | Price | Includes |
| --- | --- | --- |
| Ledger (one-time) | TBD | Full app: manual transactions, CSV import, budgets, goals, invoicing, AP/AR, receipts, reports, categories, multi-workspace, all future non-Plaid updates |
| Bank Sync Add-on | TBD/month | Automatic bank connection via Plaid. Sync transactions, balances, account details. Up to 5 connected institutions. |

## 7.2 License System

- Provider: Keygen (keygen.sh) or LicenseSeat — both support Stripe webhooks and device binding
- Activation: On first launch, user enters license key. App validates against Keygen API, binds to machine fingerprint (max 2–3 devices per key).
- Offline Grace: License validated on activation. Re-validates every 7 days when online. If offline for 30+ days, show a gentle reminder but don’t lock the app.
- Subscription Check: Plaid features check subscription status via Keygen API. If expired, Plaid UI is disabled but existing data remains.
## 7.3 Payment Flow

1. User visits landing page → clicks “Buy Ledger”

2. Stripe Checkout session → one-time payment processed

3. Stripe webhook → Keygen API creates license key

4. License key emailed to user + shown on confirmation page

5. User downloads app, enters key on first launch

6. For Bank Sync: in-app “Subscribe” button → opens Stripe Customer Portal in browser → subscription created → Keygen entitlement updated

# 8. Auto-Update System

## 8.1 Mechanism

- Uses tauri-plugin-updater
- Update manifest (latest.json) hosted on CrabNebula Cloud or S3
- Updates signed with Tauri’s Ed25519 key pair
- App checks for updates on launch + every 24 hours
## 8.2 Update Flow

1. App fetches latest.json from update server

2. Compares version → if newer, shows in-app notification banner

3. User clicks “Update Now” → downloads differential update in background

4. Prompts restart to apply

5. Update requires valid license (prevents pirated copies from updating)

## 8.3 What Gets Updated

- App binary and frontend assets (bundled in the Tauri binary)
- SQLite migration files (new migrations run automatically on first launch after update)
- The cloud relay is updated independently (serverless deployment)
# 9. Security Architecture

## 9.1 Local Security

- Database Encryption: SQLite database encrypted at rest using SQLCipher or application-level AES-256-GCM
- Key Storage: Encryption key stored in macOS Keychain / Windows Credential Manager via Tauri keychain plugin
- App Lock: PIN/password required on launch. Auto-lock after idle timeout (configurable).
- Plaid Tokens: Access tokens encrypted before storage in SQLite. Decrypted only in memory during sync.
## 9.2 Network Security

- Cloud Relay: HTTPS only. License key authenticated. Rate limited. No data persistence.
- Update Channel: Ed25519 signed updates. Man-in-the-middle cannot inject malicious updates.
- License Validation: Over HTTPS to Keygen API. Fingerprint-bound to prevent key sharing.
## 9.3 What We Don’t Need

Because this is a local desktop app with no multi-user server:

- No multi-tenant data isolation
- No CSRF/XSS protection — no web server, no cookies
- No GDPR data deletion flows — user owns their data file
- No server-side rate limiting on core features
- No session management — local unlock only
# 10. Build & Distribution

## 10.1 Build Pipeline

- GitHub Actions CI/CD workflow triggered on tagged releases
- Matrix build: macOS (universal binary for Intel + Apple Silicon) + Windows (x64)
- Tauri CLI builds .dmg (macOS) and .msi + .exe (Windows)
- Artifacts uploaded to CrabNebula Cloud or GitHub Releases
## 10.2 Code Signing

- macOS: Apple Developer ID certificate ($99/yr). Notarization via notarytool. Required for Gatekeeper — without this, DMG downloads are blocked or show scary warnings.
- Windows: EV or standard code signing certificate. Required to pass SmartScreen without warnings.
## 10.3 Distribution

- Primary: DMG (macOS) + MSI/EXE (Windows) download from landing page after Stripe purchase
- No app store at launch — direct download only
- Optional future: Mac App Store, Microsoft Store
# 11. Project Structure

ledger-app/

- src-tauri/ — Rust backend (Tauri commands, DB queries, encryption)
- src-tauri/src/commands/ — One file per domain (accounts.rs, transactions.rs, plaid.rs, etc.)
- src-tauri/src/db/ — SQLite connection setup, query helpers
- src-tauri/src/crypto/ — AES-256-GCM encryption, keychain integration
- src-tauri/migrations/ — SQLite migration SQL files (numbered, run on launch)
- src/ — React app
- src/api/client.js — invoke() wrapper for all Tauri commands
- src/pages/ — All page components
- src/pages/SetupWizard.jsx — Onboarding flow
- src/components/ — Shared UI components
- relay/ — Cloudflare Worker / Vercel Edge Function for Plaid proxy
- landing/ — Marketing site + Stripe checkout
# 12. Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Rust learning curve | Slower development of Tauri commands | Start with simpler commands, use Tauri’s JS sidecar for complex logic if needed |
| Plaid OAuth in webview | Some banks require OAuth redirect | Register custom protocol handler (ledger://) for OAuth callback |
| Code signing costs | ~$99/yr Apple + ~$200–$500/yr Windows EV cert | Factor into pricing. Required for trust. |
| Piracy | License key shared online | Device binding (max 2–3). Fair price is the best defense. |
| Plaid cost per user | Ongoing cost with subscription revenue | Price subscription to cover Plaid per-item cost + margin. Limit connected institutions. |
| Plaid production access | Plaid reviews each app for production approval | Apply early. Separate Plaid application from the reference project. |

# 13. Next Steps

Phase 1 is the foundation — start here in a new project session:

- Phase 1: Initialize Tauri 2 project + SQLite schema + core Rust commands
- Phase 2: Onboarding wizard + local auth (PIN/password unlock)
- Phase 3: Licensing + Stripe payment integration
- Phase 4: Plaid cloud relay + subscription-gated bank sync
- Phase 5: Code signing, auto-updater, CI/CD, landing page
- Phase 6: Cross-platform QA + Plaid sandbox testing + license edge cases
This is a clean build. Use the existing self-hosted Ledger repo as a reference for features and UI patterns, but all code is written fresh for the Tauri + SQLite architecture.
