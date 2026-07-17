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
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

import { useWorkspace } from "@/hooks/useWorkspace";
import {
  listAccountsByWorkspace,
  createAccount,
  updateAccount,
} from "@/api/accounts";

const mockUseWorkspace = vi.mocked(useWorkspace);
const mockListAccountsByWorkspace = vi.mocked(listAccountsByWorkspace);
const mockCreateAccount = vi.mocked(createAccount);
const mockUpdateAccount = vi.mocked(updateAccount);

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
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
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
      screen.getByText(
        "Add your first financial account to begin tracking balances and transactions.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows a New Account action in the empty state", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([]);

    render(<Accounts />);

    await waitFor(() =>
      expect(screen.getByText("No accounts yet")).toBeInTheDocument(),
    );
    const buttons = screen.getAllByRole("button", { name: "New Account" });
    expect(buttons).toHaveLength(2); // header action + empty-state action
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

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    // Scoped to the table row: the always-mounted Create/Edit dialogs also
    // render "Credit Card" as a Select option, so an unscoped query is ambiguous.
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("Credit Card")).toBeInTheDocument();
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

describe("Accounts — New Account header action", () => {
  it("shows a New Account button in the page header", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Everyday" }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(
      screen.getByRole("button", { name: "New Account" }),
    ).toBeInTheDocument();
  });

  it("opens the create-account dialog when clicked", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Everyday" }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "New Account" }));

    expect(
      screen.getByRole("heading", { name: "New Account" }),
    ).toBeInTheDocument();
  });
});

describe("Accounts — create-account workflow", () => {
  it("closes and resets the dialog, refetches, and renders the new account", async () => {
    const created = makeAccount({
      id: 42,
      name: "Everyday Checking",
      account_type: "checking",
    });
    mockListAccountsByWorkspace
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([created]);
    mockCreateAccount.mockResolvedValue(created);

    render(<Accounts />);

    await waitFor(() =>
      expect(screen.getByText("No accounts yet")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "New Account" })[0]);
    // Scoped to the Create dialog: the always-mounted Edit dialog shares the
    // same field labels, so unscoped label queries are ambiguous.
    const createDialog = screen.getByRole("dialog", { name: "New Account" });
    expect(
      screen.getByRole("heading", { name: "New Account" }),
    ).toBeInTheDocument();

    fireEvent.change(within(createDialog).getByLabelText("Account Name"), {
      target: { value: "Everyday Checking" },
    });
    fireEvent.change(within(createDialog).getByLabelText("Account Type"), {
      target: { value: "checking" },
    });
    fireEvent.click(
      within(createDialog).getByRole("button", { name: "Create Account" }),
    );

    await waitFor(() =>
      expect(mockCreateAccount).toHaveBeenCalledWith(
        1,
        "Everyday Checking",
        "checking",
        undefined,
        undefined,
      ),
    );

    // Dialog closes and form resets
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "New Account" }),
      ).not.toBeInTheDocument(),
    );

    // Refetches and the empty state is replaced by the account table
    await waitFor(() =>
      expect(mockListAccountsByWorkspace).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(screen.getByText("Everyday Checking")).toBeInTheDocument(),
    );
    expect(screen.queryByText("No accounts yet")).not.toBeInTheDocument();
  });
});

describe("Accounts — Actions column", () => {
  it("renders an Actions column header", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Everyday" }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(
      screen.getByRole("columnheader", { name: "Actions" }),
    ).toBeInTheDocument();
  });

  it("renders an accessible Edit action for each account", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Everyday" }),
      makeAccount({ id: 2, name: "Savings" }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(
      screen.getByRole("button", { name: "Edit Everyday" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Savings" }),
    ).toBeInTheDocument();
  });
});

describe("Accounts — edit-account workflow", () => {
  // Scoped to the Edit dialog: the always-mounted Create dialog shares the
  // same field labels, so unscoped label queries are ambiguous.
  function editDialog() {
    return screen.getByRole("dialog", { name: "Edit Account" });
  }

  it("opens the edit dialog populated with the selected account's values", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({
        id: 1,
        name: "Everyday",
        institution_name: "Chase",
      }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Edit Everyday" }));

    expect(
      screen.getByRole("heading", { name: "Edit Account" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(within(editDialog()).getByLabelText("Account Name")).toHaveValue(
        "Everyday",
      ),
    );
    expect(
      within(editDialog()).getByLabelText("Institution (optional)"),
    ).toHaveValue("Chase");
  });

  it("closes without calling updateAccount when Cancel is clicked", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Everyday" }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Edit Everyday" }));
    fireEvent.click(
      within(editDialog()).getByRole("button", { name: "Cancel" }),
    );

    expect(
      screen.queryByRole("heading", { name: "Edit Account" }),
    ).not.toBeInTheDocument();
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it("closes, resets, refetches, and renders updated values after a successful save", async () => {
    const original = makeAccount({
      id: 1,
      name: "Everyday",
      institution_name: "Chase",
    });
    const updated = makeAccount({
      id: 1,
      name: "Everyday Checking",
      institution_name: "Chase",
    });
    mockListAccountsByWorkspace
      .mockResolvedValueOnce([original])
      .mockResolvedValueOnce([updated]);
    mockUpdateAccount.mockResolvedValue(updated);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Edit Everyday" }));
    await waitFor(() =>
      expect(within(editDialog()).getByLabelText("Account Name")).toHaveValue(
        "Everyday",
      ),
    );
    fireEvent.change(within(editDialog()).getByLabelText("Account Name"), {
      target: { value: "Everyday Checking" },
    });
    fireEvent.click(
      within(editDialog()).getByRole("button", { name: "Save Changes" }),
    );

    await waitFor(() =>
      expect(mockUpdateAccount).toHaveBeenCalledWith(
        1,
        "Everyday Checking",
        "Chase",
        undefined,
      ),
    );

    // Dialog closes
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Edit Account" }),
      ).not.toBeInTheDocument(),
    );

    // Refetches and renders the canonical refreshed value
    await waitFor(() =>
      expect(mockListAccountsByWorkspace).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(screen.getByText("Everyday Checking")).toBeInTheDocument(),
    );
  });

  it("does not leak stale form state when editing a different account", async () => {
    mockListAccountsByWorkspace.mockResolvedValue([
      makeAccount({ id: 1, name: "Account A", institution_name: "Bank A" }),
      makeAccount({ id: 2, name: "Account B", institution_name: "Bank B" }),
    ]);

    render(<Accounts />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Edit Account A" }));
    fireEvent.change(within(editDialog()).getByLabelText("Account Name"), {
      target: { value: "Modified A" },
    });
    fireEvent.click(
      within(editDialog()).getByRole("button", { name: "Cancel" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Account B" }));

    await waitFor(() =>
      expect(within(editDialog()).getByLabelText("Account Name")).toHaveValue(
        "Account B",
      ),
    );
    expect(
      within(editDialog()).getByLabelText("Institution (optional)"),
    ).toHaveValue("Bank B");
  });
});
