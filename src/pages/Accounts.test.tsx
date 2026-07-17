import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Account } from "@/types/domain";
import type { WorkspaceContextValue } from "@/contexts/workspaceContextDef";
import Accounts from "./Accounts";

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: vi.fn(),
}));
vi.mock("@/api/accounts", () => ({
  listAccountsByWorkspace: vi.fn(),
}));

import { useWorkspace } from "@/hooks/useWorkspace";
import { listAccountsByWorkspace } from "@/api/accounts";

const mockUseWorkspace = vi.mocked(useWorkspace);
const mockListAccountsByWorkspace = vi.mocked(listAccountsByWorkspace);

function workspaceValue(
  currentWorkspaceId: number | null,
): WorkspaceContextValue {
  return {
    workspaces: [],
    currentWorkspace: null,
    currentWorkspaceId,
    loading: false,
    error: null,
    seedingError: null,
    refreshWorkspaces: vi.fn(),
    selectWorkspace: vi.fn(),
    createInitialWorkspace: vi.fn(),
    retrySeedCategories: vi.fn(),
  };
}

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 1,
    workspace_id: 1,
    name: "Account",
    account_type: "checking",
    currency: "USD",
    balance: 0,
    institution_name: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseWorkspace.mockReturnValue(workspaceValue(1));
});

describe("Accounts — loading state", () => {
  it("shows the loading state before the fetch resolves", async () => {
    let resolveFetch: (accounts: Account[]) => void = () => {};
    mockListAccountsByWorkspace.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<Accounts />);

    expect(screen.getByText("Loading accounts…")).toBeInTheDocument();
    expect(screen.queryByText("No accounts yet")).not.toBeInTheDocument();

    resolveFetch([]);
    await waitFor(() =>
      expect(screen.getByText("No accounts yet")).toBeInTheDocument(),
    );
  });
});

describe("Accounts — empty state", () => {
  it("shows an empty state and no table when there are no accounts", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([]);

    render(<Accounts />);

    await waitFor(() =>
      expect(screen.getByText("No accounts yet")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Account creation is coming in a future update."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("Accounts — error state", () => {
  it("shows a sanitized error message and retries on demand", async () => {
    mockListAccountsByWorkspace
      .mockRejectedValueOnce(
        '{"code":"database_error","message":"A database error occurred. Please try again."}',
      )
      .mockResolvedValueOnce([makeAccount({ id: 1, name: "Everyday" })]);

    render(<Accounts />);

    await waitFor(() =>
      expect(
        screen.getByText("A database error occurred. Please try again."),
      ).toBeInTheDocument(),
    );
    // No raw Tauri/Rust/SQLite details leaked
    expect(screen.queryByText(/sqlite/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(screen.getByText("Everyday")).toBeInTheDocument(),
    );
    expect(mockListAccountsByWorkspace).toHaveBeenCalledTimes(2);
  });
});

describe("Accounts — account list rendering", () => {
  it("renders active and archived accounts with distinct status badges", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Everyday", is_active: true }),
      makeAccount({ id: 2, name: "Old Savings", is_active: false }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const rows = screen.getAllByRole("row").slice(1); // skip header row
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Everyday")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Active")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Old Savings")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Archived")).toBeInTheDocument();
  });

  it("orders active accounts before archived accounts", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Zzz Archived", is_active: false }),
      makeAccount({ id: 2, name: "Aaa Active", is_active: true }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Aaa Active")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Zzz Archived")).toBeInTheDocument();
  });

  it("orders accounts alphabetically by name within each status group", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Charlie", is_active: true }),
      makeAccount({ id: 2, name: "Alpha", is_active: true }),
      makeAccount({ id: 3, name: "Bravo", is_active: true }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Alpha")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Bravo")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Charlie")).toBeInTheDocument();
  });

  it("displays human-readable account types and formatted balances", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({
        id: 1,
        name: "Card",
        account_type: "credit_card",
        balance: -4250,
      }),
    ]);

    render(<Accounts />);

    await waitFor(() =>
      expect(screen.getByText("Credit Card")).toBeInTheDocument(),
    );
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("$-42.50")).toBeInTheDocument();
  });
});

describe("Accounts — summary", () => {
  it("computes total active balance and active/archived counts", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Checking", is_active: true, balance: 1000 }),
      makeAccount({ id: 2, name: "Savings", is_active: true, balance: 2000 }),
      makeAccount({ id: 3, name: "Old", is_active: false, balance: 500 }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    expect(screen.getByText("$30.00")).toBeInTheDocument(); // 1000 + 2000 cents
    expect(screen.getByText("Active Accounts")).toBeInTheDocument();
    const activeCard = screen.getByText("Active Accounts").closest("div");
    expect(activeCard).toHaveTextContent("2");
    const archivedCard = screen.getByText("Archived Accounts").closest("div");
    expect(archivedCard).toHaveTextContent("1");
  });
});

describe("Accounts — refetch on workspace change", () => {
  it("refetches accounts when currentWorkspaceId changes", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([]);
    mockUseWorkspace.mockReturnValue(workspaceValue(1));

    const { rerender } = render(<Accounts />);

    await waitFor(() =>
      expect(mockListAccountsByWorkspace).toHaveBeenCalledWith(1),
    );

    mockUseWorkspace.mockReturnValue(workspaceValue(2));
    rerender(<Accounts />);

    await waitFor(() =>
      expect(mockListAccountsByWorkspace).toHaveBeenCalledWith(2),
    );
    expect(mockListAccountsByWorkspace).toHaveBeenCalledTimes(2);
  });
});
