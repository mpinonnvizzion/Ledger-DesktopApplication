# Security Model Specification

**Version:** 1.0
**Status:** Draft
**Sprint:** 0

---

## Purpose

This document defines Ledger Desktop's security model. Ledger handles sensitive financial data and must protect user information while maintaining the local-first, offline-first, privacy-first design.

---

## Security Principles

1. **Local by default** — Financial data stays on the user's machine
2. **Minimal collection** — Collect only what is necessary for licensing, updates, and support
3. **No financial data in transit** — License validation and telemetry never include financial records
4. **Transparent** — Users should understand what data leaves their device and why
5. **Reasonable protection** — Protect against casual tampering without hostile DRM

---

## Local Data Security

### Database Protection

- SQLite database stored in the application's data directory
- Local password/PIN protects app access (app-level lock, not database encryption initially)
- Auto-lock after configurable idle period
- Database file is readable by the user (for backup purposes)

### Future: Database Encryption

- SQLite encryption (e.g., SQLCipher) may be added in a future version
- Encryption adds complexity to backup/restore and must be carefully designed
- Should not be implemented until the core product is stable

### Keychain Integration

- Research macOS Keychain and Windows Credential Manager for storing:
  - Local app PIN/password hash
  - License activation tokens
  - Plaid-related tokens (if stored locally)
- Keychain integration reduces risk of plain-text secret storage

---

## Application Lock

- Users can set a password or PIN during onboarding
- The app displays a lock screen when launched or after idle timeout
- Lock screen prevents access to financial data
- Failed attempts should have reasonable limits or delays
- Users who forget their password can still access the database file directly (it is their data)

---

## License Security

### What License Validation Sends

- License key
- Device fingerprint (OS type, machine identifier)
- App version
- OS platform
- Activation timestamp

### What License Validation Never Sends

- Transactions, account balances, categories, budgets
- Invoices, receipts, client/vendor records
- Database contents or imported files
- Personal information beyond what is needed for licensing

### Device Fingerprint

- Uses OS-provided machine identifiers
- Avoids collecting personal files, browser history, installed apps
- Should be stable enough to recognize a device across app restarts

---

## Plaid Security

- Plaid API credentials (client ID, secret) are stored only on the cloud relay server
- Plaid access tokens are managed by the relay, not the desktop app
- The desktop app receives synced transaction data from the relay and stores it locally
- The relay validates Bank Sync subscription entitlement before processing requests
- No Plaid secrets exist in the desktop application binary

See [ADR 0005](../adr/0005-plaid-requires-cloud-relay.md).

---

## Telemetry and Error Reporting

### Allowed (with user awareness)

- Optional crash reports (app version, OS version, error type)
- Optional diagnostic logs
- User-initiated support bundle

### Not Allowed Without Explicit Consent

- Financial transaction data
- Account balances
- Imported CSV contents
- Personal financial categories
- Invoice contents
- Receipt images
- Client/vendor records

---

## Distribution Security

- macOS builds should be signed with Apple Developer ID and notarized
- Windows builds should use a code signing certificate
- Auto-update artifacts should be signed
- Build pipeline should be secure (GitHub Actions or equivalent)
- Unsigned builds are acceptable for internal development only

---

## Network Security

- All network communication uses HTTPS/TLS
- License validation endpoints use TLS
- Plaid relay communication uses TLS
- The app should validate server certificates
- Network failure is handled gracefully (offline grace period for licensing)

---

## Threat Model Summary

| Threat | Mitigation |
|--------|-----------|
| Unauthorized access to app | Password/PIN lock, auto-lock |
| Database file theft | Future: SQLite encryption; current: OS-level file permissions |
| Plaid credential exposure | Cloud relay; no secrets in desktop binary |
| License key sharing | Device fingerprint binding, activation limits |
| Man-in-the-middle | TLS for all network communication |
| Malicious update | Signed update artifacts |
| Data loss | Backup reminders, export always available |

---

## Out of Scope for v1.0

- Full database encryption (SQLCipher)
- Biometric authentication
- End-to-end encrypted cloud sync
- Hardware security key support
- Kernel-level protection
- Intrusive DRM
