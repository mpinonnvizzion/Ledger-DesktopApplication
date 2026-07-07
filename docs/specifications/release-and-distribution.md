# Release and Distribution Specification

**Version:** 1.0
**Status:** Draft
**Sprint:** 0

---

## Purpose

This document specifies how Ledger Desktop is built, distributed, and updated. It consolidates decisions from the Release Strategy and target architecture documents.

---

## Distribution Model

Ledger Desktop is distributed as a direct download from the project website. It is not distributed through app stores at launch.

---

## Target Platforms

| Platform | Installer Format | Signing |
|----------|-----------------|---------|
| macOS | .dmg | Apple Developer ID + notarization |
| Windows | .msi or .exe | Code signing certificate |

---

## Release Stages

| Stage | Audience | Distribution |
|-------|----------|-------------|
| Internal Development | Development team | Local builds from source |
| Internal Alpha | Product owner / small trusted group | Manual or private unsigned builds |
| Private Beta | Invite-only testers | Private download links, signed if possible |
| Public Beta | Public early adopters | Public download, discounted license |
| Version 1.0 | General public | Full public sale and download |
| Post-Launch | All customers | Patch, minor, and major releases |

---

## Build Pipeline

- GitHub Actions (or equivalent CI) for automated builds
- Builds triggered on tagged releases
- Separate build targets for macOS and Windows
- Build artifacts stored securely
- Signed artifacts for release builds

---

## Auto-Update

Ledger Desktop uses Tauri's built-in updater system.

**Update flow:**
1. App checks for updates on launch and every 24 hours
2. If update available, show notification with release notes
3. User chooses "Update now" or "Remind me later"
4. Update downloads and installs
5. App restarts with new version

**Update requirements:**
- Update artifacts must be signed
- Release notes must be visible before install
- Updates must not silently risk user data
- Database migrations must run safely after update
- Failed updates must not corrupt local data

---

## Version Numbering

Format: `MAJOR.MINOR.PATCH`

| Type | Example | Content |
|------|---------|---------|
| Patch | 1.0.1 | Bug fixes, crash fixes, data integrity fixes |
| Minor | 1.1.0 | New features, improvements (backward-compatible) |
| Major | 2.0.0 | Significant product or architecture changes |

---

## Release Checklist

### General
- [ ] Version number updated
- [ ] CHANGELOG.md updated
- [ ] Release notes written
- [ ] Documentation updated
- [ ] Tests pass
- [ ] App launches successfully
- [ ] Installers build successfully
- [ ] No secrets in build artifacts

### Data
- [ ] Migrations tested (empty DB, realistic DB, older version DB)
- [ ] Backup works
- [ ] Export works
- [ ] Import tested with sample CSVs
- [ ] No known data-loss bugs

### Commercial
- [ ] License activation works
- [ ] Trial state works
- [ ] Expired trial behavior works
- [ ] Purchase and billing links work

### Platform
- [ ] macOS build tested
- [ ] Windows build tested
- [ ] Install/uninstall tested
- [ ] Auto-update tested
- [ ] Code signing verified

---

## Code Signing

### macOS
- Apple Developer ID certificate required
- Notarization required for macOS distribution outside App Store
- Unsigned apps are blocked by Gatekeeper on modern macOS

### Windows
- Code signing certificate required for trusted installation
- Windows SmartScreen may block unsigned or untrusted apps
- EV code signing certificate provides immediate SmartScreen trust

---

## Database Migration Policy

Migrations are high risk because they affect user financial records.

Before any release with migrations:
- Test on empty database
- Test on realistic database with varied data
- Test on database from previous version
- Recommend backup before migration in release notes
- Document migration failure behavior
- Never ship a migration that can silently destroy data

---

## Rollback Strategy

Desktop apps are harder to roll back than web apps.

- Previous installers should remain available
- Database backups should be encouraged before updates
- Migration failure handling should preserve data access
- Export path should always work, even in error states

---

## Release Notes Format

```
# Ledger X.Y.Z

## Added
- [new features]

## Improved
- [improvements]

## Fixed
- [bug fixes]

## Known Issues
- [documented limitations]

## Upgrade Notes
- [any special instructions]
```

---

## Implementation Timeline

Distribution infrastructure is planned for Sprint 9 (Installer, Updates, and Distribution). Code signing research should begin during Sprint 8 (Commercial Readiness).
