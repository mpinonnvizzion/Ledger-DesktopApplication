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

  it("falls back to first workspace when persisted ID is stale", async () => {
    localStorage.setItem("ledger_current_workspace_id", "99");
    mockListWorkspaces.mockResolvedValue([WORKSPACE]);

    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentWorkspaceId).toBe(1);
    expect(result.current.currentWorkspace?.name).toBe("Personal Finance");
    // Stale entry should be cleared
    expect(localStorage.getItem("ledger_current_workspace_id")).toBe("1");
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

  it("refreshWorkspaces re-selects the same workspace via localStorage", async () => {
    const second = { ...WORKSPACE, id: 2, name: "Business" };
    mockListWorkspaces.mockResolvedValue([WORKSPACE, second]);

    const { result } = renderHook(() => useWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Switch to workspace 2 (writes "2" to localStorage)
    act(() => result.current.selectWorkspace(2));

    // Refresh — should reselect workspace 2 from localStorage
    act(() => result.current.refreshWorkspaces());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentWorkspaceId).toBe(2);
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
    expect(result.current.seedingError).toBeNull();
  });

  it("selects the workspace before seeding and does not throw when seeding fails", async () => {
    mockListWorkspaces
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValueOnce([WORKSPACE]); // after creation
    mockCreateWorkspace.mockResolvedValue(WORKSPACE);
    mockSeedDefaultCategories.mockRejectedValue(
      '{"code":"seed_error","message":"Failed to seed categories."}',
    );

    const { result } = renderHook(() => useWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should not throw even though seeding fails
    await act(async () => {
      await result.current.createInitialWorkspace("Personal Finance");
    });

    // Workspace was retained and selected
    expect(result.current.currentWorkspaceId).toBe(WORKSPACE.id);
    expect(result.current.workspaces).toHaveLength(1);
    // Seeding error is surfaced
    expect(result.current.seedingError).toBeTruthy();
    // Workspace loading error is unset
    expect(result.current.error).toBeNull();
  });

  it("retrySeedCategories reruns seeding without creating a new workspace", async () => {
    mockListWorkspaces
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValueOnce([WORKSPACE]); // after creation
    mockCreateWorkspace.mockResolvedValue(WORKSPACE);
    mockSeedDefaultCategories
      .mockRejectedValueOnce(
        '{"code":"seed_error","message":"Failed to seed categories."}',
      )
      .mockResolvedValueOnce(undefined); // retry succeeds

    const { result } = renderHook(() => useWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createInitialWorkspace("Personal Finance");
    });
    expect(result.current.seedingError).toBeTruthy();

    // Retry — should call seedDefaultCategories once more, not createWorkspace
    await act(async () => {
      await result.current.retrySeedCategories();
    });

    expect(mockCreateWorkspace).toHaveBeenCalledTimes(1);
    expect(mockSeedDefaultCategories).toHaveBeenCalledTimes(2);
    expect(result.current.seedingError).toBeNull();
  });

  it("retrySeedCategories updates seedingError when retry also fails", async () => {
    mockListWorkspaces
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValueOnce([WORKSPACE]); // after creation
    mockCreateWorkspace.mockResolvedValue(WORKSPACE);
    mockSeedDefaultCategories.mockRejectedValue(
      '{"code":"seed_error","message":"Failed to seed categories."}',
    );

    const { result } = renderHook(() => useWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createInitialWorkspace("Personal Finance");
    });
    const firstError = result.current.seedingError;
    expect(firstError).toBeTruthy();

    await act(async () => {
      await result.current.retrySeedCategories();
    });

    expect(result.current.seedingError).toBeTruthy();
    expect(mockCreateWorkspace).toHaveBeenCalledTimes(1);
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
