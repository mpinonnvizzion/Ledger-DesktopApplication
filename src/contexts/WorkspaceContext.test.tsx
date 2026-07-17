import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { WorkspaceProvider } from "./WorkspaceContext";
import { useWorkspace } from "@/hooks/useWorkspace";

// Mock API modules at the module level
vi.mock("@/api/workspaces", () => ({
  listWorkspaces: vi.fn(),
  createWorkspace: vi.fn(),
}));
vi.mock("@/api/categories", () => ({
  seedDefaultCategories: vi.fn(),
}));

import { listWorkspaces, createWorkspace } from "@/api/workspaces";
import { seedDefaultCategories } from "@/api/categories";

const mockListWorkspaces = vi.mocked(listWorkspaces);
const mockCreateWorkspace = vi.mocked(createWorkspace);
const mockSeedDefaultCategories = vi.mocked(seedDefaultCategories);

const wrapper = ({ children }: { children: ReactNode }) => (
  <WorkspaceProvider>{children}</WorkspaceProvider>
);

const WORKSPACE = {
  id: 1,
  name: "Personal Finance",
  workspace_type: "personal" as const,
  currency: "USD",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("WorkspaceContext — existing workspace", () => {
  it("selects the first workspace on initial load", async () => {
    mockListWorkspaces.mockResolvedValue([WORKSPACE]);

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.workspaces).toHaveLength(1);
    expect(result.current.currentWorkspaceId).toBe(1);
    expect(result.current.currentWorkspace?.name).toBe("Personal Finance");
    expect(result.current.error).toBeNull();
  });

  it("restores persisted workspace selection from localStorage", async () => {
    const second = { ...WORKSPACE, id: 2, name: "Business" };
    localStorage.setItem("ledger_current_workspace_id", "2");
    mockListWorkspaces.mockResolvedValue([WORKSPACE, second]);

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentWorkspaceId).toBe(2);
    expect(result.current.currentWorkspace?.name).toBe("Business");
  });

  it("selectWorkspace updates the current workspace and persists to localStorage", async () => {
    const second = { ...WORKSPACE, id: 2, name: "Business" };
    mockListWorkspaces.mockResolvedValue([WORKSPACE, second]);

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.selectWorkspace(2));

    expect(result.current.currentWorkspaceId).toBe(2);
    expect(result.current.currentWorkspace?.name).toBe("Business");
    expect(localStorage.getItem("ledger_current_workspace_id")).toBe("2");
  });
});

describe("WorkspaceContext — first workspace creation", () => {
  it("returns empty workspaces and null id when none exist", async () => {
    mockListWorkspaces.mockResolvedValue([]);

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.workspaces).toHaveLength(0);
    expect(result.current.currentWorkspaceId).toBeNull();
  });

  it("createInitialWorkspace calls createWorkspace, seeds categories, then loads", async () => {
    mockListWorkspaces
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValueOnce([WORKSPACE]); // after creation
    mockCreateWorkspace.mockResolvedValue(WORKSPACE);
    mockSeedDefaultCategories.mockResolvedValue(undefined);

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createInitialWorkspace("Personal Finance");
    });

    expect(mockCreateWorkspace).toHaveBeenCalledWith(
      "Personal Finance",
      "personal",
      "USD",
    );
    expect(mockSeedDefaultCategories).toHaveBeenCalledWith(WORKSPACE.id);
    expect(result.current.currentWorkspaceId).toBe(WORKSPACE.id);
    expect(result.current.workspaces).toHaveLength(1);
  });

  it("seeds default categories before marking creation complete", async () => {
    const callOrder: string[] = [];

    mockListWorkspaces.mockResolvedValue([]);
    mockCreateWorkspace.mockImplementation(async () => {
      callOrder.push("createWorkspace");
      return WORKSPACE;
    });
    mockSeedDefaultCategories.mockImplementation(async () => {
      callOrder.push("seedDefaultCategories");
    });

    const { result } = renderHook(() => useWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createInitialWorkspace("Test");
    });

    expect(callOrder).toEqual(["createWorkspace", "seedDefaultCategories"]);
  });
});

describe("WorkspaceContext — error state", () => {
  it("sets error message when listWorkspaces fails", async () => {
    mockListWorkspaces.mockRejectedValue(
      '{"code":"database_error","message":"A database error occurred. Please try again."}',
    );

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.workspaces).toHaveLength(0);
    expect(result.current.currentWorkspaceId).toBeNull();
  });

  it("recovers after refreshWorkspaces when the second call succeeds", async () => {
    mockListWorkspaces
      .mockRejectedValueOnce(
        '{"code":"database_error","message":"A database error occurred. Please try again."}',
      )
      .mockResolvedValueOnce([WORKSPACE]);

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();

    act(() => result.current.refreshWorkspaces());

    await waitFor(() => expect(result.current.workspaces).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });
});
