import { useContext } from "react";
import {
  WorkspaceContext,
  type WorkspaceContextValue,
} from "@/contexts/workspaceContextDef";

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (ctx === null) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
