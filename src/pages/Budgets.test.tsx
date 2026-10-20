import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Budget, Category } from "@/types/domain";
import type { WorkspaceContextValue } from "@/contexts/workspaceContextDef";
import Budgets from "./Budgets";

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: vi.fn(),
}));
vi.mock("@/api/budgets", () => ({
  listBudgets: vi.fn(),
  getCategorySpending: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
}));
vi.mock("@/api/categories", () => ({
  listCategoriesByWorkspace: vi.fn(),
}));

import { useWorkspace } from "@/hooks/useWorkspace";
import {
  listBudgets,
  getCategorySpending,
  createBudget,
  updateBudget,
  deleteBudget,
} from "@/api/budgets";
import { listCategoriesByWorkspace } from "@/api/categories";

const mockUseWorkspace = vi.mocked(useWorkspace);
const mockListBudgets = vi.mocked(listBudgets);
const mockGetCategorySpending = vi.mocked(getCategorySpending);
const mockCreateBudget = vi.mocked(createBudget);
const mockUpdateBudget = vi.mocked(updateBudget);
const mockDeleteBudget = vi.mocked(deleteBudget);
const mockListCategories = vi.mocked(listCategoriesByWorkspace);

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

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 1,
    workspace_id: 1,
    category_id: 10,
    amount_minor: 50000,
    month: 10,
    year: 2026,
    created_at: "2026-10-01T00:00:00",
    updated_at: "2026-10-01T00:00:00",
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 10,
    workspace_id: 1,
    name: "Food",
    category_type: "expense",
    parent_id: null,
    is_system: false,
    created_at: "2026-01-01T00:00:00",
    updated_at: "2026-01-01T00:00:00",
    ...overrides,
  };
}

function setupDefaults() {
  mockListBudgets.mockResolvedValue([]);
  mockGetCategorySpending.mockResolvedValue([]);
  mockListCategories.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseWorkspace.mockReturnValue(workspaceValue(1));
  setupDefaults();
});

describe("Budgets — header", () => {
  it("renders page title and description", async () => {
    render(<Budgets />);
    await waitFor(() => {
      expect(screen.getByText("Budgets")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Set monthly spending limits and track your progress."),
    ).toBeInTheDocument();
  });

  it("renders New Budget button", async () => {
    render(<Budgets />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "New Budget" }),
      ).toBeInTheDocument();
    });
  });

  it("renders current month label", async () => {
    render(<Budgets />);
    const now = new Date();
    const monthNames = [
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
    const expected = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });
});

describe("Budgets — loading and empty", () => {
  it("shows loading state", () => {
    mockListBudgets.mockReturnValue(new Promise(() => {}));
    mockGetCategorySpending.mockReturnValue(new Promise(() => {}));
    mockListCategories.mockReturnValue(new Promise(() => {}));
    render(<Budgets />);
    expect(screen.getByText("Loading budgets…")).toBeInTheDocument();
  });

  it("shows empty state when no budgets", async () => {
    render(<Budgets />);
    await waitFor(() => {
      expect(screen.getByText(/No budgets for/)).toBeInTheDocument();
    });
    expect(
      screen.getByText("Create one to start tracking your spending."),
    ).toBeInTheDocument();
  });

  it("shows error state on API failure", async () => {
    mockListBudgets.mockRejectedValue("Something went wrong");
    render(<Budgets />);
    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("renders nothing when workspace is null", () => {
    mockUseWorkspace.mockReturnValue(workspaceValue(null));
    const { container } = render(<Budgets />);
    expect(container.firstChild).toBeNull();
  });

  it("does not call APIs when workspace is null", () => {
    mockUseWorkspace.mockReturnValue(workspaceValue(null));
    render(<Budgets />);
    expect(mockListBudgets).not.toHaveBeenCalled();
    expect(mockGetCategorySpending).not.toHaveBeenCalled();
    expect(mockListCategories).not.toHaveBeenCalled();
  });
});

describe("Budgets — budget list with progress", () => {
  it("renders budget rows with category names and amounts", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
      makeBudget({ id: 2, category_id: 20, amount_minor: 30000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([
      { category_id: 10, spent_minor: 25000 },
      { category_id: 20, spent_minor: 28000 },
    ]);
    mockListCategories.mockResolvedValue([
      makeCategory({ id: 10, name: "Food" }),
      makeCategory({ id: 20, name: "Transport" }),
    ]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("$250.00 of $500.00")).toBeInTheDocument();
    expect(screen.getByText("$280.00 of $300.00")).toBeInTheDocument();
  });

  it("shows green progress bar for under-budget", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([
      { category_id: 10, spent_minor: 20000 },
    ]);
    mockListCategories.mockResolvedValue([makeCategory({ id: 10 })]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("$300.00 remaining")).toBeInTheDocument();
    });
    expect(screen.getByText("(40%)")).toBeInTheDocument();
  });

  it("shows red for over-budget with over-by amount", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([
      { category_id: 10, spent_minor: 65000 },
    ]);
    mockListCategories.mockResolvedValue([makeCategory({ id: 10 })]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Over by $150.00")).toBeInTheDocument();
    });
    expect(screen.getByText("(130%)")).toBeInTheDocument();
  });

  it("shows $0 spent when no spending data for a category", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([makeCategory({ id: 10 })]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("$0.00 of $500.00")).toBeInTheDocument();
    });
    expect(screen.getByText("$500.00 remaining")).toBeInTheDocument();
    expect(screen.getByText("(0%)")).toBeInTheDocument();
  });

  it("shows 'Unknown' for missing category", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 999 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });
  });
});

describe("Budgets — summary line", () => {
  it("shows 'All on track' when no budgets are over", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([
      { category_id: 10, spent_minor: 10000 },
    ]);
    mockListCategories.mockResolvedValue([makeCategory({ id: 10 })]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("All 1 budget on track")).toBeInTheDocument();
    });
  });

  it("shows over-budget count", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
      makeBudget({ id: 2, category_id: 20, amount_minor: 30000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([
      { category_id: 10, spent_minor: 60000 },
      { category_id: 20, spent_minor: 10000 },
    ]);
    mockListCategories.mockResolvedValue([
      makeCategory({ id: 10, name: "Food" }),
      makeCategory({ id: 20, name: "Transport" }),
    ]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("1 of 2 over budget")).toBeInTheDocument();
    });
    expect(screen.getByText("· 1 on track")).toBeInTheDocument();
  });
});

describe("Budgets — month navigation", () => {
  it("navigates to previous month", async () => {
    render(<Budgets />);
    await waitFor(() => {
      expect(screen.queryByText("Loading budgets…")).not.toBeInTheDocument();
    });

    const prevButton = screen.getByRole("button", { name: "← Previous" });
    fireEvent.click(prevButton);

    const now = new Date();
    let expectedMonth = now.getMonth(); // 0-indexed, so current - 1
    let expectedYear = now.getFullYear();
    if (expectedMonth === 0) {
      expectedMonth = 12;
      expectedYear -= 1;
    }
    const monthNames = [
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
    const expected = `${monthNames[expectedMonth - 1]} ${expectedYear}`;

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  it("navigates to next month", async () => {
    render(<Budgets />);
    await waitFor(() => {
      expect(screen.queryByText("Loading budgets…")).not.toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: "Next →" });
    fireEvent.click(nextButton);

    const now = new Date();
    let expectedMonth = now.getMonth() + 2; // 0-indexed + 2
    let expectedYear = now.getFullYear();
    if (expectedMonth === 13) {
      expectedMonth = 1;
      expectedYear += 1;
    }
    const monthNames = [
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
    const expected = `${monthNames[expectedMonth - 1]} ${expectedYear}`;

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  it("re-fetches budgets on month change", async () => {
    render(<Budgets />);
    await waitFor(() => {
      expect(mockListBudgets).toHaveBeenCalledTimes(1);
    });

    const prevButton = screen.getByRole("button", { name: "← Previous" });
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(mockListBudgets).toHaveBeenCalledTimes(2);
    });
  });
});

describe("Budgets — create dialog", () => {
  it("opens create dialog with eligible categories", async () => {
    mockListBudgets.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([
      makeCategory({ id: 10, name: "Food", category_type: "expense" }),
      makeCategory({ id: 20, name: "Salary", category_type: "income" }),
      makeCategory({ id: 30, name: "Transport", category_type: "expense" }),
    ]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.queryByText("Loading budgets…")).not.toBeInTheDocument();
    });

    const newButton = screen.getAllByRole("button", { name: "New Budget" })[0];
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByText("Category")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option"));
    const optionTexts = options.map((o) => o.textContent);

    expect(optionTexts).toContain("Food");
    expect(optionTexts).toContain("Transport");
    expect(optionTexts).not.toContain("Salary");
  });

  it("excludes categories that already have budgets", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10 }),
    ]);
    mockListCategories.mockResolvedValue([
      makeCategory({ id: 10, name: "Food", category_type: "expense" }),
      makeCategory({ id: 30, name: "Transport", category_type: "expense" }),
    ]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });

    const newButton = screen.getByRole("button", { name: "New Budget" });
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option"));
    const optionTexts = options.map((o) => o.textContent);

    expect(optionTexts).toContain("Transport");
    expect(optionTexts).not.toContain("Food");
  });

  it("submits create budget and refreshes list", async () => {
    const createdBudget = makeBudget({ id: 99, category_id: 30 });
    mockCreateBudget.mockResolvedValue(createdBudget);
    mockListCategories.mockResolvedValue([
      makeCategory({ id: 30, name: "Transport", category_type: "expense" }),
    ]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.queryByText("Loading budgets…")).not.toBeInTheDocument();
    });

    const newButton = screen.getAllByRole("button", { name: "New Budget" })[0];
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "500.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Budget" }));

    await waitFor(() => {
      expect(mockCreateBudget).toHaveBeenCalledWith(1, 30, 50000, expect.any(Number), expect.any(Number));
    });
  });

  it("shows error when all categories budgeted", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10 }),
    ]);
    mockListCategories.mockResolvedValue([
      makeCategory({ id: 10, name: "Food", category_type: "expense" }),
    ]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });

    const newButton = screen.getByRole("button", { name: "New Budget" });
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "All expense categories already have budgets for this month.",
        ),
      ).toBeInTheDocument();
    });
  });
});

describe("Budgets — edit dialog", () => {
  it("opens edit dialog with pre-populated amount", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([makeCategory({ id: 10, name: "Food" })]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit Food budget" }));

    await waitFor(() => {
      expect(screen.getByText("Edit Budget")).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue("500.00");
    expect(input).toBeInTheDocument();
  });

  it("submits updated amount", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([makeCategory({ id: 10, name: "Food" })]);
    mockUpdateBudget.mockResolvedValue(
      makeBudget({ id: 1, amount_minor: 75000 }),
    );

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit Food budget" }));

    await waitFor(() => {
      expect(screen.getByText("Edit Budget")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue("500.00"), {
      target: { value: "750.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockUpdateBudget).toHaveBeenCalledWith(1, 75000);
    });
  });
});

describe("Budgets — delete dialog", () => {
  it("opens delete confirmation dialog", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([makeCategory({ id: 10, name: "Food" })]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Food budget" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Delete Budget?")).toBeInTheDocument();
    });
    expect(screen.getByText(/500.00 monthly budget/)).toBeInTheDocument();
  });

  it("deletes budget on confirm", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([makeCategory({ id: 10, name: "Food" })]);
    mockDeleteBudget.mockResolvedValue(undefined);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Food budget" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Delete Budget?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Budget" }));

    await waitFor(() => {
      expect(mockDeleteBudget).toHaveBeenCalledWith(1);
    });
  });
});

describe("Budgets — progress bar accessibility", () => {
  it("renders progressbar with correct aria attributes", async () => {
    mockListBudgets.mockResolvedValue([
      makeBudget({ id: 1, category_id: 10, amount_minor: 50000 }),
    ]);
    mockGetCategorySpending.mockResolvedValue([
      { category_id: 10, spent_minor: 25000 },
    ]);
    mockListCategories.mockResolvedValue([makeCategory({ id: 10, name: "Food" })]);

    render(<Budgets />);

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });

    const progressBar = screen.getByRole("progressbar", {
      name: "Food budget progress",
    });
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });
});
