import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Account, Category } from "@/types/domain";
import type { WorkspaceContextValue } from "@/contexts/workspaceContextDef";
import { useTransactionReferenceData } from "./useTransactionReferenceData";

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: vi.fn(),
}));
vi.mock("@/api/accounts", () => ({
  listAccountsByWorkspace: vi.fn(),
}));
vi.mock("@/api/categories", () => ({
  listCategoriesByWorkspace: vi.fn(),
}));

import { useWorkspace } from "@/hooks/useWorkspace";
import { listAccountsByWorkspace } from "@/api/accounts";
import { listCategoriesByWorkspace } from "@/api/categories";

const mockUseWorkspace = vi.mocked(useWorkspace);
const mockListAccountsByWorkspace = vi.mocked(listAccountsByWorkspace);
const mockListCategoriesByWorkspace = vi.mocked(listCategoriesByWorkspace);

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

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: 1,
    workspace_id: 1,
    name: "Category",
    category_type: "expense",
    parent_id: null,
    is_system: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function Harness() {
  const { accounts, categories, loading, error, retry } =
    useTransactionReferenceData();

  if (loading) return <div>Loading…</div>;
  if (error)
    return (
      <div>
        <p>{error}</p>
        <button onClick={retry}>Retry</button>
      </div>
    );

  return (
    <ul>
      {accounts.map((a) => (
        <li key={`account-${a.id}`}>account:{a.name}</li>
      ))}
      {categories.map((c) => (
        <li key={`category-${c.id}`}>category:{c.name}</li>
      ))}
    </ul>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseWorkspace.mockReturnValue(workspaceValue(1));
});

describe("useTransactionReferenceData — loading", () => {
  it("shows a loading state before the fetch resolves", async () => {
    mockListAccountsByWorkspace.mockReturnValue(new Promise(() => {}));
    mockListCategoriesByWorkspace.mockReturnValue(new Promise(() => {}));

    render(<Harness />);

    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });
});

describe("useTransactionReferenceData — success", () => {
  it("loads and exposes active accounts and categories", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Checking" }),
    ]);
    mockListCategoriesByWorkspace.mockResolvedValue([
      makeCategory({ id: 1, name: "Groceries" }),
    ]);

    render(<Harness />);

    expect(await screen.findByText("account:Checking")).toBeInTheDocument();
    expect(screen.getByText("category:Groceries")).toBeInTheDocument();
  });

  it("sorts accounts alphabetically by name (client-side)", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Savings" }),
      makeAccount({ id: 2, name: "Checking" }),
    ]);
    mockListCategoriesByWorkspace.mockResolvedValue([]);

    render(<Harness />);

    await waitFor(() => {
      const items = screen
        .getAllByText(/^account:/)
        .map((el) => el.textContent);
      expect(items).toEqual(["account:Checking", "account:Savings"]);
    });
  });

  it("passes through the backend's category ordering unchanged", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([]);
    mockListCategoriesByWorkspace.mockResolvedValue([
      makeCategory({ id: 1, name: "Salary", category_type: "income" }),
      makeCategory({ id: 2, name: "Rent", category_type: "expense" }),
    ]);

    render(<Harness />);

    await waitFor(() => {
      const items = screen
        .getAllByText(/^category:/)
        .map((el) => el.textContent);
      expect(items).toEqual(["category:Salary", "category:Rent"]);
    });
  });

  it("excludes archived accounts", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Active Account", is_active: true }),
      makeAccount({ id: 2, name: "Archived Account", is_active: false }),
    ]);
    mockListCategoriesByWorkspace.mockResolvedValue([]);

    render(<Harness />);

    await screen.findByText("account:Active Account");
    expect(screen.queryByText("account:Archived Account")).toBeNull();
  });
});

describe("useTransactionReferenceData — error and retry", () => {
  it("shows a sanitized error message on failure", async () => {
    mockListAccountsByWorkspace.mockRejectedValue(
      JSON.stringify({ code: "database_error", message: "Something broke" }),
    );
    mockListCategoriesByWorkspace.mockResolvedValue([]);

    render(<Harness />);

    expect(await screen.findByText("Something broke")).toBeInTheDocument();
  });

  it("retries the fetch when retry is called", async () => {
    mockListAccountsByWorkspace
      .mockRejectedValueOnce(
        JSON.stringify({ code: "database_error", message: "First failure" }),
      )
      .mockResolvedValueOnce([makeAccount({ id: 1, name: "Checking" })]);
    mockListCategoriesByWorkspace.mockResolvedValue([]);

    render(<Harness />);

    await screen.findByText("First failure");
    fireEvent.click(screen.getByText("Retry"));

    expect(await screen.findByText("account:Checking")).toBeInTheDocument();
  });
});

describe("useTransactionReferenceData — workspace change", () => {
  it("reloads when the current workspace changes", async () => {
    mockListAccountsByWorkspace
      .mockResolvedValueOnce([makeAccount({ id: 1, name: "Workspace 1 Acct" })])
      .mockResolvedValueOnce([
        makeAccount({ id: 2, name: "Workspace 2 Acct" }),
      ]);
    mockListCategoriesByWorkspace.mockResolvedValue([]);

    const { rerender } = render(<Harness />);
    await screen.findByText("account:Workspace 1 Acct");

    mockUseWorkspace.mockReturnValue(workspaceValue(2));
    rerender(<Harness />);

    expect(
      await screen.findByText("account:Workspace 2 Acct"),
    ).toBeInTheDocument();
    expect(screen.queryByText("account:Workspace 1 Acct")).toBeNull();
  });
});
