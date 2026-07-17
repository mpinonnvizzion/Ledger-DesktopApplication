/**
 * WorkspaceProvider — the only export from this file (satisfies react-refresh).
 * Context type and context object live in workspaceContextDef.ts.
 */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
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
  // Incrementing this value causes the fetch effect to re-run
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Stable ref so the fetch effect can read the latest currentWorkspaceId on
  // refresh without listing it as a dependency (which would cause the effect to
  // re-run every time the user switches workspace — not what we want).
  // Updated in its own effect (not during render) to satisfy react-hooks/refs.
  const currentWorkspaceIdRef = useRef<number | null>(null);
  useEffect(() => {
    currentWorkspaceIdRef.current = currentWorkspaceId;
  });

  useEffect(() => {
    let cancelled = false;
    // Read the ref AFTER the ref-update effect has run (effects run in source order)
    const preferredId = currentWorkspaceIdRef.current;

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

        // Selection priority: current > localStorage > first workspace
        const storedRaw = localStorage.getItem(STORAGE_KEY);
        const storedId = storedRaw ? parseInt(storedRaw, 10) : null;
        const targetId = preferredId ?? storedId;
        const selected =
          (targetId !== null
            ? list.find((w) => w.id === targetId)
            : undefined) ?? list[0];

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
    await seedDefaultCategories(workspace.id);
    const list = await listWorkspaces();
    setWorkspaces(list);
    setCurrentWorkspace(workspace);
    setCurrentWorkspaceId(workspace.id);
    localStorage.setItem(STORAGE_KEY, String(workspace.id));
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentWorkspaceId,
        loading,
        error,
        refreshWorkspaces,
        selectWorkspace,
        createInitialWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
