import { invoke } from "@tauri-apps/api/core";
import type { Workspace, WorkspaceType } from "@/types/domain";

export async function createWorkspace(
  name: string,
  workspaceType: WorkspaceType,
  currency?: string,
): Promise<Workspace> {
  return invoke("create_workspace", {
    name,
    workspaceType,
    currency,
  });
}

export async function getWorkspace(id: number): Promise<Workspace> {
  return invoke("get_workspace", { id });
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return invoke("list_workspaces");
}

export async function updateWorkspace(
  id: number,
  name?: string,
  currency?: string,
): Promise<Workspace> {
  return invoke("update_workspace", { id, name, currency });
}

export async function deleteWorkspace(id: number): Promise<void> {
  return invoke("delete_workspace", { id });
}
