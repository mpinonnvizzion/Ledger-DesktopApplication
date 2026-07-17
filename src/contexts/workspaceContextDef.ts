/**
 * Context type and context object only — no React components.
 * Kept in a .ts file so the WorkspaceProvider component file can satisfy
 * the react-refresh/only-export-components rule.
 */
import { createContext } from "react";
import type { Workspace } from "@/types/domain";

export interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentWorkspaceId: number | null;
  loading: boolean;
  error: string | null;
  /** Refetch the workspace list and reselect the current workspace. */
  refreshWorkspaces: () => void;
  selectWorkspace: (id: number) => void;
  createInitialWorkspace: (name: string) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null,
);
