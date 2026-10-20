import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  Account,
  Category,
  Transaction,
  TransactionSummary,
} from "@/types/domain";
import type { WorkspaceContextValue } from "@/contexts/workspaceContextDef";
import Dashboard from "./Dashboard";

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: vi.fn(),
}));
vi.mock("@/api/accounts", () => ({
  listAccountsByWorkspace: vi.fn(),
}));
vi.mock("@/api/categories", () => ({
  listCategoriesByWorkspace: vi.fn(),
}));
vi.mock("@/api/transactions", () => ({
  listTransactions: vi.fn(),
  getTransactionSummary: vi.fn(),
}));

import { useWorkspace } from "@/hooks/useWorkspace";
import { listAccountsByWorkspace } from "@/api/accounts";
import { listCategoriesByWorkspace } from "@/api/categories";
import { listTransactions, getTransactionSummary } from "@/api/transactions";

const mockUseWorkspace = vi.mocked(useWorkspace);
const mockListAccounts = vi.mocked(listAccountsByWorkspace);
const mockListCategories = vi.mocked(listCategoriesByWorkspace);
const mockListTransactions = vi.mocked(listTransactions);
const mockGetSummary = vi.mocked(getTransactionSummary);

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

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 1,
    workspace_id: 1,
    name: "Checking",
    account_type: "checking",
    currency: "USD",
    balance: 150000,
    institution_name: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00",
    updated_at: "2026-01-01T00:00:00",
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    workspace_id: 1,
    account_id: 1,
    category_id: 10,
    amount_minor: -5000,
    description: "Groceries",
    date: "2026-10-15",
    notes: null,
    status: "cleared",
    source: "manual",
    created_at: "2026-10-15T00:00:00",
    updated_at: "2026-10-15T00:00:00",
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 10,
    workspace_id: 1,
    name: "Food & Dining",
    category_type: "expense",
    parent_id: null,
    is_system: true,
    created_at: "2026-01-01T00:00:00",
    updated_at: "2026-01-01T00:00:00",
    ...overrides,
  };
}

function makeSummary(
  overrides: Partial<TransactionSummary> = {},
): TransactionSummary {
  return {
    income_minor: 500000,
    expense_minor: -200000,
    net_minor: 300000,
    transaction_count: 15,
    ...overrides,
  };
}

function setupHappyPath() {
  const accounts = [
    makeAccount({ id: 1, name: "Checking", balance: 150000 }),
    makeAccount({ id: 2, name: "Savings", balance: 250000 }),
    makeAccount({
      id: 3,
      name: "Old Account",
      balance: 50000,
      is_active: false,
    }),
  ];
  const summary = makeSummary();
  const transactions = [
    makeTransaction({ id: 1, description: "Groceries", amount_minor: -5000 }),
    makeTransaction({
      id: 2,
      description: "Monthly Pay",
      amount_minor: 500000,
      category_id: 20,
      date: "2026-10-01",
    }),
  ];
  const categories = [
    makeCategory({ id: 10, name: "Food & Dining" }),
    makeCategory({ id: 20, name: "Salary", category_type: "income" }),
  ];

  mockListAccounts.mockResolvedValue(accounts);
  mockGetSummary.mockResolvedValue(summary);
  mockListTransactions.mockResolvedValue({
    transactions,
    total_count: 2,
  });
  mockListCategories.mockResolvedValue(categories);

  return { accounts, summary, transactions, categories };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockUseWorkspace.mockReturnValue(workspaceValue(1));
});

describe("Dashboard", () => {
  it("renders the page heading", async () => {
    setupHappyPath();
    render(<Dashboard />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows the current month label in the subtitle", async () => {
    setupHappyPath();
    render(<Dashboard />);
    const now = new Date();
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const expected = `${months[now.getMonth()]} ${now.getFullYear()}`;
    await waitFor(() => {
      expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    mockListAccounts.mockReturnValue(new Promise(() => {}));
    mockGetSummary.mockReturnValue(new Promise(() => {}));
    mockListTransactions.mockReturnValue(new Promise(() => {}));
    mockListCategories.mockReturnValue(new Promise(() => {}));

    render(<Dashboard />);
    expect(screen.getByText("Loading dashboard…")).toBeInTheDocument();
  });

  it("shows all four summary cards with correct values", async () => {
    setupHappyPath();
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("$4000.00")).toBeInTheDocument();
    });

    expect(screen.getByText("Total Balance")).toBeInTheDocument();
    expect(screen.getByText("Active Accounts")).toBeInTheDocument();
    expect(screen.getByText("Monthly Income")).toBeInTheDocument();
    expect(screen.getByText("Monthly Expenses")).toBeInTheDocument();

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("$5000.00")).toBeInTheDocument();
    expect(screen.getByText("$2000.00")).toBeInTheDocument();
  });

  it("computes total balance from active accounts only", async () => {
    const accounts = [
      makeAccount({ id: 1, balance: 100000, is_active: true }),
      makeAccount({ id: 2, balance: 200000, is_active: true }),
      makeAccount({ id: 3, balance: 999999, is_active: false }),
    ];
    mockListAccounts.mockResolvedValue(accounts);
    mockGetSummary.mockResolvedValue(makeSummary());
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    mockListCategories.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("$3000.00")).toBeInTheDocument();
    });
    expect(screen.queryByText("$9999.99")).not.toBeInTheDocument();
  });

  it("shows expense as positive absolute value", async () => {
    mockListAccounts.mockResolvedValue([makeAccount()]);
    mockGetSummary.mockResolvedValue(makeSummary({ expense_minor: -75050 }));
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    mockListCategories.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("$750.50")).toBeInTheDocument();
    });
  });

  it("renders recent transactions with account and category names", async () => {
    setupHappyPath();
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    expect(screen.getByText("Monthly Pay")).toBeInTheDocument();
    expect(screen.getAllByText("Checking").length).toBe(2);
    expect(screen.getByText("Food & Dining")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Oct 15, 2026")).toBeInTheDocument();
    expect(screen.getByText("Oct 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("$-50.00")).toBeInTheDocument();
    expect(screen.getByText("$+5000.00")).toBeInTheDocument();
  });

  it("shows empty state when no accounts exist", async () => {
    mockListAccounts.mockResolvedValue([]);
    mockGetSummary.mockResolvedValue(
      makeSummary({
        income_minor: 0,
        expense_minor: 0,
        net_minor: 0,
        transaction_count: 0,
      }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    mockListCategories.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Welcome to Ledger")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Create your first account to start tracking your finances.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Total Balance")).not.toBeInTheDocument();
  });

  it("shows 'No transactions yet' when accounts exist but no transactions", async () => {
    mockListAccounts.mockResolvedValue([makeAccount()]);
    mockGetSummary.mockResolvedValue(
      makeSummary({
        income_minor: 0,
        expense_minor: 0,
        net_minor: 0,
        transaction_count: 0,
      }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    mockListCategories.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("No transactions yet.")).toBeInTheDocument();
    });
    expect(screen.getByText("Total Balance")).toBeInTheDocument();
  });

  it("shows $0.00 for cards when no transactions in current month", async () => {
    mockListAccounts.mockResolvedValue([makeAccount({ balance: 0 })]);
    mockGetSummary.mockResolvedValue(
      makeSummary({
        income_minor: 0,
        expense_minor: 0,
        net_minor: 0,
        transaction_count: 0,
      }),
    );
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    mockListCategories.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      const zeroAmounts = screen.getAllByText("$0.00");
      expect(zeroAmounts.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("shows error state when all APIs fail", async () => {
    mockListAccounts.mockRejectedValue("accounts error");
    mockGetSummary.mockRejectedValue("summary error");
    mockListTransactions.mockRejectedValue("transactions error");
    mockListCategories.mockRejectedValue("categories error");

    render(<Dashboard />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows 'Failed to load' for account cards when accounts fail but summary succeeds", async () => {
    mockListAccounts.mockRejectedValue("accounts error");
    mockGetSummary.mockResolvedValue(makeSummary());
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    mockListCategories.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      const failedTexts = screen.getAllByText("Failed to load");
      expect(failedTexts.length).toBe(2);
    });

    expect(screen.getByText("$5000.00")).toBeInTheDocument();
  });

  it("shows 'Failed to load' for summary cards when summary fails but accounts succeed", async () => {
    mockListAccounts.mockResolvedValue([makeAccount()]);
    mockGetSummary.mockRejectedValue("summary error");
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    mockListCategories.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      const failedTexts = screen.getAllByText("Failed to load");
      expect(failedTexts.length).toBe(2);
    });

    expect(screen.getByText("$1500.00")).toBeInTheDocument();
  });

  it("shows 'Uncategorized' for transactions with no category", async () => {
    mockListAccounts.mockResolvedValue([makeAccount()]);
    mockGetSummary.mockResolvedValue(makeSummary());
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ category_id: null })],
      total_count: 1,
    });
    mockListCategories.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Uncategorized")).toBeInTheDocument();
    });
  });

  it("shows 'Unknown account' for transactions whose account is not in the list", async () => {
    mockListAccounts.mockResolvedValue([makeAccount({ id: 999 })]);
    mockGetSummary.mockResolvedValue(makeSummary());
    mockListTransactions.mockResolvedValue({
      transactions: [makeTransaction({ account_id: 1 })],
      total_count: 1,
    });
    mockListCategories.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Unknown account")).toBeInTheDocument();
    });
  });

  it("passes correct date range to getTransactionSummary", async () => {
    setupHappyPath();
    render(<Dashboard />);

    await waitFor(() => {
      expect(mockGetSummary).toHaveBeenCalled();
    });

    const [, dateFrom, dateTo] = mockGetSummary.mock.calls[0];
    const now = new Date();
    const expectedMonth = (now.getMonth() + 1).toString().padStart(2, "0");
    const expectedDay = now.getDate().toString().padStart(2, "0");
    expect(dateFrom).toBe(`${now.getFullYear()}-${expectedMonth}-01`);
    expect(dateTo).toBe(`${now.getFullYear()}-${expectedMonth}-${expectedDay}`);
  });

  it("passes limit of 10 to listTransactions", async () => {
    setupHappyPath();
    render(<Dashboard />);

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalled();
    });

    expect(mockListTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
    );
  });

  it("does not render when workspace is null", () => {
    mockUseWorkspace.mockReturnValue(workspaceValue(null));
    render(<Dashboard />);
    expect(mockListAccounts).not.toHaveBeenCalled();
    expect(mockGetSummary).not.toHaveBeenCalled();
  });
});
