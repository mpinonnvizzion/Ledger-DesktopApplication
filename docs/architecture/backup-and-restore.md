# Backup and Restore Architecture

**Version:** 1.0
**Last Updated:** 2026-07-07
**Scope:** Sprint 2 foundation, full implementation in later sprints

---

## Purpose

This document defines Ledger Desktop's approach to data backup and restore. Users own their data. They must be able to protect it, move it, and recover it without depending on Ledger as a company or service.

---

## Backup Philosophy

Ledger Desktop is local-first. There is no cloud backup by default. The user's SQLite database file is their data. Backup means: the user has a copy of that file in a safe place.

The application's job is to make this easy, obvious, and reliable — not to impose a backup strategy. Some users will use Time Machine or Windows Backup. Others will manually copy to a USB drive. Others will use Dropbox or iCloud Drive. The application must support all of these by making the database file accessible and copy-safe.

---

## User Ownership Principle

From [ADR 0003](../adr/0003-local-first-data-ownership.md):

- Users should know where their data lives
- Users should be able to copy, move, or back up the database file
- Data should remain accessible even if Ledger as a company ceases to exist

This means:

- The database file location is documented and displayed in Settings
- The file format is SQLite — a public, well-documented format
- No proprietary encoding, DRM, or obfuscation on the data file
- CSV export is always available (even after trial expiration)

---

## Manual Backup Approach

### How Backup Works

A backup is a copy of the database file. The application provides a "Back Up Now" action (planned for a future sprint's UI) that:

1. Ensures all pending WAL data is checkpointed to the main database file
2. Copies `ledger.db` to a user-chosen location
3. Reports success or failure

### WAL Checkpoint Before Copy

SQLite's WAL mode means recent writes may be in `ledger.db-wal` rather than the main file. Before copying, the application must run:

```sql
PRAGMA wal_checkpoint(TRUNCATE);
```

This flushes WAL contents to the main database file, making `ledger.db` self-contained and safe to copy.

### File Copy Safety

The backup operation should:

- Use Rust's `std::fs::copy()` for an atomic file copy
- Not use the SQLite backup API unless concurrent access during backup is needed (it is not, since Ledger is single-user)
- Verify the copy succeeded (check file size matches, or better, open the copy and verify `PRAGMA integrity_check`)

### Backup Destination

The user chooses the destination via a native file dialog. The application does not dictate where backups go. Common destinations:

- External drive
- Cloud-synced folder (Dropbox, iCloud Drive, OneDrive)
- Same filesystem (less useful, but user's choice)

---

## Restore Workflow

### How Restore Works (Future Sprint)

Restore replaces the current database with a backup copy:

1. User selects a backup file via native file dialog
2. Application verifies the file is a valid SQLite database
3. Application checks the schema version (migration level) of the backup
4. If the backup's schema version is compatible, replace the current database
5. Restart the application (or reload state from the new database)

### Schema Version Compatibility

- If the backup has the **same or older** schema version: restore is safe. Run pending migrations after restore to bring it up to date.
- If the backup has a **newer** schema version than the running application: refuse the restore. The user needs to update the application first.

### Restore Replaces, Not Merges

Restore is a full replacement of the database, not a merge. There is no conflict resolution. The backup becomes the new state. This is the simplest and safest model for v1.0.

---

## Database Copy Safety

### When Is It Safe to Copy the File?

- **Application closed**: Always safe. The WAL and SHM files are cleaned up on graceful close.
- **Application open, after checkpoint**: Safe if `PRAGMA wal_checkpoint(TRUNCATE)` has been run.
- **Application open, no checkpoint**: The main file may be missing recent writes. The copy will be valid but may not include the latest transactions.

### File System Snapshots

OS-level backup tools (Time Machine, Windows File History) may copy the database file at any point. Because WAL mode is enabled, a copy of just `ledger.db` (without `-wal` and `-shm`) may be a few transactions behind. This is acceptable for backup purposes — it is still a valid, consistent database.

If the OS copies all three files (`ledger.db`, `ledger.db-wal`, `ledger.db-shm`) together, the backup includes all recent writes.

### Documentation for Users

The Settings page should explain:

- Where the database file is located
- That it can be copied manually for backup
- That the app should be closed before manual copy (or use the built-in backup feature)
- That `-wal` and `-shm` files are normal and temporary

---

## CSV Export Relationship

CSV export is a complement to database backup, not a replacement:

| | Database Backup | CSV Export |
|---|---|---|
| Scope | Entire database (all entities, settings, relationships) | Transactions only (or subset) |
| Format | SQLite binary | Plain text CSV |
| Restore | Full restore to exact state | Manual re-import (lossy) |
| Use case | Disaster recovery, migration | Data portability, spreadsheet use |
| Sprint | Sprint 2 foundation, future UI | Sprint 4 foundation, future UI |

Both are important. Database backup preserves everything. CSV export gives users data in a universal format they can use anywhere.

---

## Sprint 2 Scope

Sprint 2 should implement the **foundation** for backup:

- Database file location is resolvable at runtime
- WAL checkpoint command is available as a utility function
- The database initialization ensures the file is in the documented location
- Documentation (this file + Settings display mechanism) explains where the file lives

Sprint 2 should **not** implement:

- Backup UI (button, file dialog, progress indicator)
- Restore workflow
- Scheduled/automatic backups
- Backup reminders
- CSV export
- Backup encryption
- Cloud backup

These are planned for future sprints (Milestone 3 and beyond). See [TASKS.md](../../TASKS.md) and [milestones.md](../milestones.md).

---

## What Not to Implement Until Later

| Feature | Why Defer | When |
|---------|-----------|------|
| Backup UI | Requires Settings page integration | Sprint 6 (Settings foundation) |
| Restore UI | Requires validation, migration compat checks | Sprint 6+ |
| Backup reminders | Requires settings + notification infrastructure | Sprint 6 |
| Automatic/scheduled backups | Adds complexity, user may not want this | Post-v1.0 |
| Cloud backup | Requires subscription infrastructure | v2.0 candidate |
| Backup encryption | Requires key management, adds restore complexity | Post-v1.0 |
| Incremental backups | Premature optimization for typical database sizes | Post-v1.0 |

---

## Migration Compatibility

When restoring a backup, the schema version determines compatibility:

```
Backup schema version ≤ App schema version → Safe (run pending migrations)
Backup schema version > App schema version → Refuse (app too old)
```

The migration runner (Sprint 2) already handles "run all pending migrations." Restore simply swaps the database file, then the next startup runs any missing migrations.

This means: a user can restore an older backup to a newer version of the app safely. They cannot restore a newer backup to an older version of the app.

---

## Related Documents

- [ADR 0003: Local-First Data Ownership](../adr/0003-local-first-data-ownership.md)
- [Database Architecture](database.md)
- [Data Model Overview](../specifications/data-model-overview.md)
- [Security Model](../specifications/security-model.md)
