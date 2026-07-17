/**
 * WorkspaceProvider — the only export from this file (satisfies react-refresh).
 * Context type and context object live in workspaceContextDef.ts.
 */
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { WorkspaceContext } from "./workspaceContextDef";
import type { Workspace } from "@/types/domain";
import { listWorkspaces, createWorkspace } from "@/api/workspaces";
import { seedDefaultCategories } from "@/api/categories";
import { parseCommandError } from "@/lib/errors";

const STORAGE_KEY = "ledger_current_workspace_id";

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null,
  );
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedingError, setSeedingError] = useState<string | null>(null);
  // Incrementing this value causes the fetch effect to re-run
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    listWorkspaces()
      .then((list) => {
        if (cancelled) return;

        setWorkspaces(list);
        setError(null);

        if (list.length === 0) {
          setCurrentWorkspace(null);
          setCurrentWorkspaceId(null);
          return;
        }

        // Selection priority: persisted localStorage ID > first workspace.
        // selectWorkspace() always writes to localStorage, so this covers
        // both initial load and re-fetches after refreshWorkspaces().
        const storedRaw = localStorage.getItem(STORAGE_KEY);
        const storedId = storedRaw ? parseInt(storedRaw, 10) : null;
        const found =
          storedId !== null ? list.find((w) => w.id === storedId) : undefined;

        // Remove a stale entry that no longer corresponds to a real workspace
        if (storedId !== null && found === undefined) {
          localStorage.removeItem(STORAGE_KEY);
        }

        const selected = found ?? list[0];
        setCurrentWorkspace(selected);
        setCurrentWorkspaceId(selected.id);
        localStorage.setItem(STORAGE_KEY, String(selected.id));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const parsed = parseCommandError(err);
          setError(parsed.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  /**
   * Refetch the workspace list. Sets loading=true synchronously (outside
   * the effect) so the UI shows a spinner immediately.
   */
  const refreshWorkspaces = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  const selectWorkspace = useCallback(
    (id: number) => {
      const workspace = workspaces.find((w) => w.id === id) ?? null;
      setCurrentWorkspaceId(id);
      setCurrentWorkspace(workspace);
      localStorage.setItem(STORAGE_KEY, String(id));
    },
    [workspaces],
  );

  const createInitialWorkspace = useCallback(async (name: string) => {
    const workspace = await createWorkspace(name, "personal", "USD");

    // Select the workspace immediately — don't block on seeding
    const list = await listWorkspaces();
    setWorkspaces(list);
    setCurrentWorkspace(workspace);
    setCurrentWorkspaceId(workspace.id);
    localStorage.setItem(STORAGE_KEY, String(workspace.id));

    // Attempt seeding; surface the error without discarding the workspace
    try {
      await seedDefaultCategories(workspace.id);
      setSeedingError(null);
    } catch (err: unknown) {
      const parsed = parseCommandError(err);
      setSeedingError(parsed.message);
    }
  }, []);

  const retrySeedCategories = useCallback(async () => {
    if (currentWorkspaceId === null) return;
    try {
      await seedDefaultCategories(currentWorkspaceId);
      setSeedingError(null);
    } catch (err: unknown) {
      const parsed = parseCommandError(err);
      setSeedingError(parsed.message);
    }
  }, [currentWorkspaceId]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentWorkspaceId,
        loading,
        error,
        seedingError,
        refreshWorkspaces,
        selectWorkspace,
        createInitialWorkspace,
        retrySeedCategories,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
