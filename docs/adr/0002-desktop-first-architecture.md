# ADR 0002: Desktop-First Architecture Using Tauri 2

**Status:** Accepted
**Date:** 2026-07-07

## Context

Ledger Desktop is a local-first, offline-first finance application. The architecture must support:

- Native desktop experience on macOS and Windows
- Local SQLite database access
- Offline operation for all core workflows
- Fast startup and responsive UI
- Small binary size
- Code signing and notarization for distribution
- Auto-update capability

Alternative approaches considered:
- **Electron**: Larger binary size, higher memory usage, bundles Chromium
- **Native (Swift/C#)**: Platform-specific codebases, higher maintenance cost
- **Web app with PWA**: Conflicts with local-first and offline-first principles
- **Flutter desktop**: Less mature desktop support, Dart ecosystem

## Decision

Ledger Desktop will use Tauri 2 as the desktop application framework.

- **Frontend**: React + TypeScript + Vite + Tailwind CSS (rendered in system webview)
- **Backend**: Rust (Tauri commands for data access, business logic, and system integration)
- **Database**: SQLite accessed from Rust, never directly from the frontend
- **IPC**: Tauri's built-in invoke system for frontend-backend communication

## Consequences

- Small binary size compared to Electron
- Uses system webview (no bundled browser engine)
- Rust backend provides memory safety and performance for data operations
- Frontend developers work in familiar React/TypeScript ecosystem
- Cross-platform support (macOS, Windows) from a single codebase
- Tauri's updater system provides auto-update capability
- Tauri 2 is relatively newer; ecosystem is smaller than Electron's
- System webview differences between platforms may require testing
