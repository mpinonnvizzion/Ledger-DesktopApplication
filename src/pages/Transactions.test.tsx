import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Account, Category, Transaction } from "@/types/domain";
import type { WorkspaceContextValue } from "@/contexts/workspaceContextDef";
import Transactions from "./Transactions";

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: vi.fn(),
}));
vi.mock("@/hooks/useTransactionReferenceData", () => ({
  useTransactionReferenceData: vi.fn(),
}));
vi.mock("@/api/transactions", () => ({
  listTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}));

import { useWorkspace } from "@/hooks/useWorkspace";
import { useTransactionReferenceData } from "@/hooks/useTransactionReferenceData";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
} from "@/api/transactions";

const mockUseWorkspace = vi.mocked(useWorkspace);
const mockUseTransactionReferenceData = vi.mocked(useTransactionReferenceData);
const mockListTransactions = vi.mocked(listTransactions);
const mockCreateTransaction = vi.mocked(createTransaction);
const mockUpdateTransaction = vi.mocked(updateTransaction);

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

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    workspace_id: 1,
    account_id: 1,
    category_id: null,
    amount_minor: -1500,
    description: "Transaction",
    date: "2026-07-19",
    notes: null,
    status: "uncleared",
    source: "manual",
    created_at: "2026-07-19T00:00:00Z",
    updated_at: "2026-07-19T00:00:00Z",
    ...overrides,
  };
}

function referenceDataValue(
  overrides: Partial<ReturnType<typeof useTransactionReferenceData>>,
) {
  return {
    accounts: [],
    categories: [],
    accountsById: new Map<number, Account>(),
    categoriesById: new Map<number, Category>(),
    loading: false,
    error: null,
    retry: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseWorkspace.mockReturnValue(workspaceValue(1));
  mockUseTransactionReferenceData.mockReturnValue(referenceDataValue({}));
  // CreateTransactionDialog is always mounted (visibility toggled via its
  // `open` prop), so its native <dialog> needs the same jsdom stubs used
  // throughout the Accounts dialogs.
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

describe("Transactions page — loading state", () => {
  it("shows a loading state before transactions resolve", () => {
    mockListTransactions.mockReturnValue(new Promise(() => {}));
    render(<Transactions />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows loading while reference data is still loading, even if transactions already resolved", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({})],
      total_count: 1,
    });
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({ loading: true }),
    );
    render(<Transactions />);
    // Transactions resolve, but reference data never does (static mock) -
    // the loading state must remain visible throughout.
    await waitFor(() => expect(mockListTransactions).toHaveBeenCalled());
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show the empty state before loading completes", () => {
    mockListTransactions.mockReturnValue(new Promise(() => {}));
    render(<Transactions />);
    expect(screen.queryByText("No transactions yet")).toBeNull();
  });
});

describe("Transactions page — successful rendering", () => {
  it("renders transactions in the exact order returned by the backend", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [
        makeTransaction({ id: 1, description: "Newest", date: "2026-07-19" }),
        makeTransaction({ id: 2, description: "Older", date: "2026-07-01" }),
      ],
      total_count: 2,
    });

    render(<Transactions />);

    const rows = await screen.findAllByRole("row");
    // rows[0] is the header row.
    expect(within(rows[1]).getByText("Newest")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Older")).toBeInTheDocument();
  });

  it("renders the Date column using the calendar-date helper (no timezone shift)", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ date: "2026-01-05" })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("Jan 5, 2026")).toBeInTheDocument();
  });

  it("renders the Description column", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ description: "Coffee shop" })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("Coffee shop")).toBeInTheDocument();
  });

  it("resolves the Account label from accountsById", async () => {
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({
        accountsById: new Map([
          [1, makeAccount({ id: 1, name: "Everyday Checking" })],
        ]),
      }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ account_id: 1 })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("Everyday Checking")).toBeInTheDocument();
  });

  it("falls back to a deterministic label for a missing/unresolvable account", async () => {
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({ accountsById: new Map() }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ account_id: 999 })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("Unknown account")).toBeInTheDocument();
  });

  it("resolves the Category label from categoriesById", async () => {
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({
        categoriesById: new Map([
          [1, makeCategory({ id: 1, name: "Groceries" })],
        ]),
      }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ category_id: 1 })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("Groceries")).toBeInTheDocument();
  });

  it("renders Uncategorized when category_id is null", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ category_id: null })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("Uncategorized")).toBeInTheDocument();
  });

  it("renders Uncategorized when category_id does not resolve", async () => {
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({ categoriesById: new Map() }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ category_id: 999 })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("Uncategorized")).toBeInTheDocument();
  });

  it("derives Income from a positive amount", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ amount_minor: 4250 })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("Income")).toBeInTheDocument();
    expect(screen.getByText("+42.50", { exact: false })).toBeInTheDocument();
  });

  it("derives Expense from a negative amount", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ amount_minor: -1500 })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("Expense")).toBeInTheDocument();
    expect(screen.getByText("-15.00", { exact: false })).toBeInTheDocument();
  });

  it("never renders a Transfer label", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [
        makeTransaction({ amount_minor: 100 }),
        makeTransaction({ id: 2, amount_minor: -100 }),
      ],
      total_count: 2,
    });

    render(<Transactions />);

    await screen.findByText("Income");
    expect(screen.queryByText(/transfer/i)).toBeNull();
  });

  it("displays a zero amount deterministically without negative zero", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ amount_minor: 0 })],
      total_count: 1,
    });

    render(<Transactions />);

    expect(await screen.findByText("$0.00")).toBeInTheDocument();
    expect(screen.queryByText(/-\$?0\.00/)).toBeNull();
  });

  it("shows an informational note when more transactions exist than are shown", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({})],
      total_count: 214,
    });

    render(<Transactions />);

    expect(
      await screen.findByText(/Showing the 1 most recent of 214/),
    ).toBeInTheDocument();
  });

  it("does not show the informational note when all transactions are shown", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({})],
      total_count: 1,
    });

    render(<Transactions />);

    await screen.findByRole("table");
    expect(screen.queryByText(/most recent of/)).toBeNull();
  });
});

describe("Transactions page — empty state", () => {
  it("offers the New Transaction action from the empty state (Phase B2)", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });

    render(<Transactions />);

    expect(await screen.findByText("No transactions yet")).toBeInTheDocument();
    // Two "New Transaction" buttons are expected simultaneously (header +
    // empty-state action), matching the same established pattern as
    // Accounts.tsx's "New Account" header + empty-state action.
    expect(
      screen.getAllByRole("button", { name: /new transaction/i }).length,
    ).toBeGreaterThan(0);
  });
});

describe("Transactions page — error state", () => {
  it("shows a sanitized error and retries on demand", async () => {
    mockListTransactions
      .mockRejectedValueOnce(
        '{"code":"database_error","message":"A database error occurred. Please try again."}',
      )
      .mockResolvedValueOnce({
        transactions: [makeTransaction({ description: "Recovered" })],
        total_count: 1,
      });

    render(<Transactions />);

    expect(
      await screen.findByText("A database error occurred. Please try again."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Try again"));

    expect(await screen.findByText("Recovered")).toBeInTheDocument();
  });

  it("does not render a table when the transaction fetch fails", async () => {
    mockListTransactions.mockRejectedValue(
      '{"code":"database_error","message":"Something broke"}',
    );

    render(<Transactions />);

    await screen.findByText("Something broke");
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("Transactions page — partial reference-data failure", () => {
  it("still renders the transaction table with fallback labels and a non-blocking warning", async () => {
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({
        error: "A database error occurred. Please try again.",
        accountsById: new Map(),
        categoriesById: new Map(),
      }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [
        makeTransaction({ account_id: 1, category_id: 1, description: "Rent" }),
      ],
      total_count: 1,
    });

    render(<Transactions />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Rent")).toBeInTheDocument();
    expect(within(table).getByText("Unknown account")).toBeInTheDocument();
    // Scoped to the table: the (always-mounted, currently closed)
    // CreateTransactionDialog's Category select also has an "Uncategorized"
    // option in the DOM, per the documented jsdom <dialog> visibility
    // gotcha (see docs/sprint-notes/sprint-5.md Phase B3 notes).
    expect(within(table).getByText("Uncategorized")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A database error occurred. Please try again.",
    );
  });

  it("retrying a partial reference-data failure reloads both transactions and reference data", async () => {
    const retryReferenceData = vi.fn();
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({
        error: "A database error occurred. Please try again.",
        retry: retryReferenceData,
      }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({})],
      total_count: 1,
    });

    render(<Transactions />);

    await screen.findByRole("alert");
    fireEvent.click(screen.getByText("Try again"));

    expect(retryReferenceData).toHaveBeenCalledOnce();
    await waitFor(() => expect(mockListTransactions).toHaveBeenCalledTimes(2));
  });
});

describe("Transactions page — workspace change", () => {
  it("reloads transactions when the current workspace changes", async () => {
    mockListTransactions
      .mockResolvedValueOnce({
        transactions: [makeTransaction({ description: "Workspace 1 Txn" })],
        total_count: 1,
      })
      .mockResolvedValueOnce({
        transactions: [makeTransaction({ description: "Workspace 2 Txn" })],
        total_count: 1,
      });

    const { rerender } = render(<Transactions />);
    await screen.findByText("Workspace 1 Txn");

    mockUseWorkspace.mockReturnValue(workspaceValue(2));
    rerender(<Transactions />);

    expect(await screen.findByText("Workspace 2 Txn")).toBeInTheDocument();
    expect(screen.queryByText("Workspace 1 Txn")).toBeNull();
  });
});

describe("Transactions page — no CRUD controls or fake data", () => {
  it("exposes no delete controls (create/edit exist as of Phase B2/B3)", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({})],
      total_count: 1,
    });

    render(<Transactions />);

    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: /^delete/i })).toBeNull();
  });

  it("renders only backend-provided rows, never fabricated data", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });

    render(<Transactions />);

    await screen.findByText("No transactions yet");
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("Transactions page — semantic table structure", () => {
  it("renders a semantic table with the expected column headers", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({})],
      total_count: 1,
    });

    render(<Transactions />);

    const table = await screen.findByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(headers).toEqual([
      "Date",
      "Description",
      "Account",
      "Category",
      "Type",
      "Amount",
      "Actions",
    ]);
  });

  it("wraps the table in a horizontally scrollable container instead of converting rows to cards", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({})],
      total_count: 1,
    });

    render(<Transactions />);

    const table = await screen.findByRole("table");
    expect(table.parentElement).toHaveClass("overflow-x-auto");
  });
});

describe("Transactions page — New Transaction dialog wiring (Phase B2)", () => {
  it("opens the Create Transaction dialog from the header button", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({})],
      total_count: 1,
    });

    render(<Transactions />);
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "New Transaction" }));

    expect(
      await screen.findByRole("heading", { name: "New Transaction" }),
    ).toBeInTheDocument();
  });

  it("does not offer New Transaction while reference data has a warning", async () => {
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({ error: "Something broke" }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({})],
      total_count: 1,
    });

    render(<Transactions />);
    await screen.findByRole("table");

    expect(
      screen.queryByRole("button", { name: "New Transaction" }),
    ).toBeNull();
  });

  it("excludes an archived account from the create-transaction selector even though it still resolves historically", async () => {
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({
        accounts: [makeAccount({ id: 1, name: "Active Checking" })],
        accountsById: new Map([
          [1, makeAccount({ id: 1, name: "Active Checking" })],
          [
            2,
            makeAccount({
              id: 2,
              name: "Old Savings",
              is_active: false,
            }),
          ],
        ]),
      }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [
        makeTransaction({ account_id: 2, description: "Historical entry" }),
      ],
      total_count: 1,
    });

    render(<Transactions />);
    const table = await screen.findByRole("table");
    // The archived account still resolves correctly in the read-only table.
    expect(within(table).getByText("Old Savings")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Transaction" }));
    await screen.findByRole("heading", { name: "New Transaction" });

    const accountSelect = screen.getByLabelText("Account") as HTMLSelectElement;
    const optionLabels = Array.from(accountSelect.options).map((o) => o.text);
    expect(optionLabels).toContain("Active Checking");
    expect(optionLabels).not.toContain("Old Savings");
  });

  it("closes the dialog, refetches transactions, and shows the new transaction after a successful create", async () => {
    mockListTransactions
      .mockResolvedValueOnce({ transactions: [], total_count: 0 })
      .mockResolvedValueOnce({
        transactions: [makeTransaction({ id: 2, description: "Just created" })],
        total_count: 1,
      });
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({
        accounts: [makeAccount({ id: 1, name: "Checking" })],
      }),
    );
    mockCreateTransaction.mockResolvedValue(
      makeTransaction({ id: 2, description: "Just created" }),
    );

    render(<Transactions />);
    await screen.findByText("No transactions yet");

    // The empty state offers its own "New Transaction" action alongside the
    // header button (matching Accounts.tsx's header + empty-state pattern),
    // so both are legitimately present here - either opens the same dialog.
    fireEvent.click(
      screen.getAllByRole("button", { name: "New Transaction" })[0],
    );
    await screen.findByRole("heading", { name: "New Transaction" });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Just created" },
    });
    fireEvent.change(screen.getByLabelText("Account"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    // Dialog closes and the table (not the empty state) now shows the
    // canonically refetched data - never a manually prepended local row.
    expect(await screen.findByText("Just created")).toBeInTheDocument();
    expect(screen.queryByText("No transactions yet")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "New Transaction" }),
    ).not.toBeInTheDocument();
    expect(mockListTransactions).toHaveBeenCalledTimes(2);
  });
});

describe("Transactions page — Edit dialog wiring (Phase B3)", () => {
  it("shows an Edit action for each populated row", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ id: 1, description: "Coffee" })],
      total_count: 1,
    });

    render(<Transactions />);
    await screen.findByRole("table");

    expect(
      screen.getByRole("button", { name: "Edit transaction: Coffee" }),
    ).toBeInTheDocument();
  });

  it("shows no Edit action in the loading state", () => {
    mockListTransactions.mockReturnValue(new Promise(() => {}));
    render(<Transactions />);
    expect(screen.queryByRole("button", { name: /^edit/i })).toBeNull();
  });

  it("shows no Edit action in the empty state", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    render(<Transactions />);
    await screen.findByText("No transactions yet");
    expect(screen.queryByRole("button", { name: /^edit/i })).toBeNull();
  });

  it("shows no Edit action in the error state", async () => {
    mockListTransactions.mockRejectedValue(
      '{"code":"database_error","message":"Something broke"}',
    );
    render(<Transactions />);
    await screen.findByText("Something broke");
    expect(screen.queryByRole("button", { name: /^edit/i })).toBeNull();
  });

  it("opens the correct transaction when Edit is clicked on a specific row", async () => {
    mockListTransactions.mockResolvedValue({
      transactions: [
        makeTransaction({ id: 1, description: "First transaction" }),
        makeTransaction({ id: 2, description: "Second transaction" }),
      ],
      total_count: 2,
    });

    render(<Transactions />);
    await screen.findByRole("table");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit transaction: Second transaction",
      }),
    );

    await screen.findByRole("heading", { name: "Edit Transaction" });
    // CreateTransactionDialog (always mounted, currently closed) also has a
    // "Description" field, so the query is scoped to the open Edit dialog -
    // the same jsdom closed-<dialog>-visibility gotcha documented since
    // Sprint 5 Phase B3.
    const editDialog = screen.getByRole("dialog", { name: "Edit Transaction" });
    expect(within(editDialog).getByLabelText("Description")).toHaveValue(
      "Second transaction",
    );
  });

  it("closes the dialog, refetches transactions, and shows updated data after a successful edit", async () => {
    mockListTransactions
      .mockResolvedValueOnce({
        transactions: [makeTransaction({ id: 1, description: "Before edit" })],
        total_count: 1,
      })
      .mockResolvedValueOnce({
        transactions: [makeTransaction({ id: 1, description: "After edit" })],
        total_count: 1,
      });
    mockUpdateTransaction.mockResolvedValue(
      makeTransaction({ id: 1, description: "After edit" }),
    );

    render(<Transactions />);
    await screen.findByText("Before edit");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit transaction: Before edit" }),
    );
    await screen.findByRole("heading", { name: "Edit Transaction" });
    const editDialog = screen.getByRole("dialog", { name: "Edit Transaction" });

    fireEvent.change(within(editDialog).getByLabelText("Description"), {
      target: { value: "After edit" },
    });
    fireEvent.click(
      within(editDialog).getByRole("button", { name: "Save Changes" }),
    );

    expect(await screen.findByText("After edit")).toBeInTheDocument();
    expect(screen.queryByText("Before edit")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Edit Transaction" }),
    ).not.toBeInTheDocument();
    expect(mockListTransactions).toHaveBeenCalledTimes(2);
  });
});
