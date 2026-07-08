# State Management Architecture

**Version:** 1.0
**Last Updated:** 2026-07-07
**Scope:** Sprints 2–4 (Milestone 2: Local Data Platform)

---

## Purpose

This document defines how the React frontend manages state when interacting with the local data platform. The goal is to keep state management simple during the data platform phase and avoid premature complexity.

---

## Philosophy

Ledger Desktop's frontend is not a traditional web application. There is no remote server, no network latency to hide, and no multi-user concurrency to manage. The "server" is a Rust process on the same machine, accessed via IPC that typically resolves in single-digit milliseconds.

This changes the state management calculus:

- **No global state library is needed during Milestone 2.** React's built-in state (`useState`, `useReducer`) and component composition are sufficient for the data platform phase.
- **Data fetched from Tauri commands is "server state" in concept** — it comes from an authoritative source (SQLite via Rust) — but it arrives so fast that the caching and deduplication concerns of `react-query` or `SWR` are premature.
- **Add complexity only when complexity is needed.** If Sprint 5+ reveals that cache invalidation, optimistic updates, or cross-component data sharing is painful without a library, introduce one then.

---

## State Categories

### Local UI State

State that exists only in the frontend and has no persistence:

- Form input values
- Modal open/closed
- Sidebar collapsed/expanded
- Active tab or filter selection
- Loading indicators
- Error messages from failed commands

Managed with `useState` in the component that owns it. Lift state up only when sibling components need it.

### Data State (from Tauri commands)

State that represents persisted data loaded from the Rust backend:

- List of accounts
- List of transactions
- Category tree
- Workspace metadata

Loaded via Tauri commands, stored in component state, and re-fetched when mutations occur.

### App-Level State

State that is relevant across many pages but changes rarely:

- Current workspace ID
- App settings (currency, date format)
- License status (future)

This is the only category where React Context is appropriate during Milestone 2.

---

## Data Loading Pattern

### Fetch on Mount

Components load data when they mount:

```typescript
function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAccountsByWorkspace(currentWorkspaceId)
      .then(setAccounts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [currentWorkspaceId]);

  // render
}
```

### Refetch After Mutation

After a successful create, update, or delete, re-fetch the relevant list:

```typescript
async function handleCreateAccount(input: CreateAccountInput) {
  await createAccount(input);
  const updated = await listAccountsByWorkspace(currentWorkspaceId);
  setAccounts(updated);
}
```

This is simple and correct. Because the IPC round-trip is fast (local process, no network), the refetch pattern does not cause perceptible delay.

### No Optimistic Updates (Yet)

Optimistic updates (showing the result before the server confirms) add complexity and risk of inconsistency. During Milestone 2, always wait for the command to succeed before updating the UI.

If future sprints introduce operations where perceived latency matters (e.g., drag-and-drop reordering), optimistic updates can be added for those specific interactions.

---

## React Context Usage

### When to Use Context

- **Current workspace**: Many components need to know which workspace is active. A `WorkspaceContext` avoids passing `workspaceId` through every component tree.
- **App settings**: Currency format, date format, locale — read frequently, written rarely.

### When Not to Use Context

- **Entity lists** (accounts, transactions, categories): These are page-specific data. Loading them in the page component and passing to children via props is simpler and more predictable.
- **Form state**: Always local to the form component.
- **UI state**: Almost always local to the component that owns it.

### Context Shape

```typescript
interface WorkspaceContextValue {
  currentWorkspaceId: number | null;
  setCurrentWorkspaceId: (id: number) => void;
}
```

Keep context values minimal. If a context object grows beyond 3-4 fields, it is likely doing too much.

---

## When to Consider a State Library

Do not introduce a state management library (Zustand, Jotai, Redux, TanStack Query) during Milestone 2. Consider one when:

- Multiple unrelated components need to share the same server data (e.g., dashboard widgets showing account balances that also appear on the accounts page)
- Cache invalidation becomes complex (many views of the same data with different staleness requirements)
- Optimistic updates are needed for multiple operations
- Real-time derived data (budget progress computed from transaction totals) needs to update across pages without explicit refetch

The most likely candidate is TanStack Query (for its cache/invalidation model) or Zustand (for lightweight global state). This decision should be made during Sprint 5+ planning and documented as an ADR if adopted.

---

## Cache and Invalidation

### Sprint 2–4 Approach

No cache. Every page load fetches fresh data from the backend. The backend reads from SQLite, which is fast for the expected dataset sizes.

### Why This Is Acceptable

- IPC latency is <5ms for typical queries
- SQLite query performance is <50ms for most operations at target dataset sizes
- No concurrent writers that could create stale data
- The user is the only actor modifying data

### Future Caching

If Sprint 5+ introduces dashboard widgets that aggregate data across multiple entities, a client-side cache may reduce redundant fetches. When that happens, use a library purpose-built for cache management rather than hand-rolling invalidation logic.

---

## Error Handling in the Frontend

### Command Errors

When a Tauri command fails, the frontend receives a structured error (see [tauri-commands.md](tauri-commands.md)):

```typescript
interface CommandError {
  code: string;
  message: string;
}
```

### Display Strategy

- **Validation errors** (`validation_error`): Show inline next to the relevant form field or as a form-level message.
- **Not found** (`not_found`): Navigate to an appropriate fallback or show a "not found" state.
- **Conflict** (`conflict`): Show a message explaining the conflict (e.g., "An account with this name already exists").
- **Database/internal errors** (`database_error`, `internal_error`): Show a generic "Something went wrong" message. Log the error code for debugging. Do not display internal details to the user.

### No Global Error Boundary for Command Errors

Command errors are handled locally by the component that issued the command. A React error boundary catches render-time crashes, not async operation failures.

---

## Sprint Scope

**Sprint 2**: No frontend state changes. The frontend is unchanged — Sprint 2 is backend-only.

**Sprint 3**: Frontend may be extended to call new commands (workspace/account/category CRUD) for testing purposes, but production UI is not required. If test pages are added, they should follow the patterns in this document.

**Sprint 4**: Same as Sprint 3 — the transaction engine is backend-focused. Any frontend integration follows these patterns.

---

## Related Documents

- [Tauri Command Architecture](tauri-commands.md)
- [Error Handling Architecture](error-handling.md)
- [Folder Structure](folder-structure.md)
