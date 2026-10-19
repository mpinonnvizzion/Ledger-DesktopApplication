import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Category } from "@/types/domain";
import type { WorkspaceContextValue } from "@/contexts/workspaceContextDef";
import Categories from "./Categories";

vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: vi.fn(),
}));
vi.mock("@/api/categories", () => ({
  listCategoriesByWorkspace: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));
vi.mock("@/api/transactions", () => ({
  listTransactions: vi.fn(),
}));

import { useWorkspace } from "@/hooks/useWorkspace";
import {
  listCategoriesByWorkspace,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/api/categories";
import { listTransactions } from "@/api/transactions";

const mockUseWorkspace = vi.mocked(useWorkspace);
const mockListCategories = vi.mocked(listCategoriesByWorkspace);
const mockCreateCategory = vi.mocked(createCategory);
const mockUpdateCategory = vi.mocked(updateCategory);
const mockDeleteCategory = vi.mocked(deleteCategory);
const mockListTransactions = vi.mocked(listTransactions);

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

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: 1,
    workspace_id: 1,
    name: "Test Category",
    category_type: "expense",
    parent_id: null,
    is_system: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function getOpenDialog(): HTMLElement {
  const dialogs = screen.getAllByRole("dialog", { hidden: false });
  const openDialog = dialogs.find((d) => d.hasAttribute("open"));
  if (!openDialog) throw new Error("No open dialog found");
  return openDialog;
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

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe("Categories — loading state", () => {
  it("shows loading spinner while fetching", () => {
    mockListCategories.mockReturnValue(new Promise(() => {}));
    render(<Categories />);
    expect(screen.getByText("Loading categories…")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------
describe("Categories — error state", () => {
  it("shows error message on fetch failure", async () => {
    mockListCategories.mockRejectedValue("Network error");
    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("retries on retry button click", async () => {
    mockListCategories.mockRejectedValueOnce("fail");
    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText(/fail/i)).toBeInTheDocument();
    });

    mockListCategories.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => {
      expect(mockListCategories).toHaveBeenCalledTimes(2);
    });
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
describe("Categories — empty state", () => {
  it("shows empty state when no categories exist", async () => {
    mockListCategories.mockResolvedValue([]);
    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("No categories yet")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// List rendering
// ---------------------------------------------------------------------------
describe("Categories — list rendering", () => {
  const categories = [
    makeCategory({
      id: 1,
      name: "Salary",
      category_type: "income",
      is_system: true,
    }),
    makeCategory({
      id: 2,
      name: "Freelance",
      category_type: "income",
      is_system: true,
    }),
    makeCategory({
      id: 3,
      name: "Housing",
      category_type: "expense",
      is_system: true,
    }),
    makeCategory({
      id: 4,
      name: "Groceries",
      category_type: "expense",
      is_system: false,
    }),
  ];

  it("renders income and expense section headings", async () => {
    mockListCategories.mockResolvedValue(categories);
    render(<Categories />);
    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 3 });
      const headingTexts = headings.map((h) => h.textContent);
      expect(headingTexts.some((t) => t?.includes("Income Categories"))).toBe(
        true,
      );
      expect(headingTexts.some((t) => t?.includes("Expense Categories"))).toBe(
        true,
      );
    });
  });

  it("shows correct count in section headings", async () => {
    mockListCategories.mockResolvedValue(categories);
    render(<Categories />);
    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 3 });
      const incomeHeading = headings.find((h) =>
        h.textContent?.includes("Income"),
      );
      const expenseHeading = headings.find((h) =>
        h.textContent?.includes("Expense"),
      );
      expect(incomeHeading?.textContent).toContain("(2)");
      expect(expenseHeading?.textContent).toContain("(2)");
    });
  });

  it("shows System badge on system categories", async () => {
    mockListCategories.mockResolvedValue(categories);
    render(<Categories />);
    await waitFor(() => {
      const badges = screen.getAllByText("System");
      expect(badges.length).toBe(3);
    });
  });

  it("hides delete button on system categories", async () => {
    mockListCategories.mockResolvedValue([
      makeCategory({
        id: 1,
        name: "Salary",
        category_type: "income",
        is_system: true,
      }),
    ]);
    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Salary")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /delete salary/i }),
    ).not.toBeInTheDocument();
  });

  it("shows delete button on user categories", async () => {
    mockListCategories.mockResolvedValue([
      makeCategory({
        id: 4,
        name: "Groceries",
        category_type: "expense",
        is_system: false,
      }),
    ]);
    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /delete groceries/i }),
    ).toBeInTheDocument();
  });

  it("shows edit button on all categories", async () => {
    mockListCategories.mockResolvedValue([
      makeCategory({
        id: 1,
        name: "Salary",
        category_type: "income",
        is_system: true,
      }),
      makeCategory({
        id: 4,
        name: "Groceries",
        category_type: "expense",
        is_system: false,
      }),
    ]);
    render(<Categories />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /edit salary/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /edit groceries/i }),
      ).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Create dialog
// ---------------------------------------------------------------------------
describe("Categories — create dialog", () => {
  beforeEach(() => {
    mockListCategories.mockResolvedValue([]);
  });

  it("opens create dialog on New Category button click", async () => {
    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("No categories yet")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: /new category/i })[0],
    );
    await waitFor(() => {
      const dialog = getOpenDialog();
      expect(within(dialog).getByText("New Category")).toBeInTheDocument();
    });
  });

  it("validates empty name on submit", async () => {
    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("No categories yet")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: /new category/i })[0],
    );
    await waitFor(() => {
      getOpenDialog();
    });

    const dialog = getOpenDialog();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /create category/i }),
    );
    await waitFor(() => {
      expect(
        within(dialog).getByText("Category name is required."),
      ).toBeInTheDocument();
    });
  });

  it("validates empty type on submit", async () => {
    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("No categories yet")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: /new category/i })[0],
    );
    await waitFor(() => {
      getOpenDialog();
    });

    const dialog = getOpenDialog();
    const nameInput = within(dialog).getByLabelText("Category Name");
    fireEvent.change(nameInput, { target: { value: "My Category" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /create category/i }),
    );
    await waitFor(() => {
      expect(
        within(dialog).getByText("Category type is required."),
      ).toBeInTheDocument();
    });
  });

  it("submits valid form and refreshes list", async () => {
    const created = makeCategory({
      id: 10,
      name: "Custom",
      category_type: "expense",
    });
    mockCreateCategory.mockResolvedValue(created);

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("No categories yet")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: /new category/i })[0],
    );
    await waitFor(() => {
      getOpenDialog();
    });

    const dialog = getOpenDialog();
    fireEvent.change(within(dialog).getByLabelText("Category Name"), {
      target: { value: "Custom" },
    });
    fireEvent.change(within(dialog).getByLabelText("Type"), {
      target: { value: "expense" },
    });

    mockListCategories.mockResolvedValue([created]);
    fireEvent.click(
      within(dialog).getByRole("button", { name: /create category/i }),
    );

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith(1, "Custom", "expense");
    });

    await waitFor(() => {
      expect(mockListCategories).toHaveBeenCalledTimes(2);
    });
  });

  it("shows backend error on conflict", async () => {
    mockCreateCategory.mockRejectedValue(
      JSON.stringify({
        code: "conflict",
        message:
          "A expense category named 'Food' already exists in this workspace.",
      }),
    );

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("No categories yet")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: /new category/i })[0],
    );
    await waitFor(() => {
      getOpenDialog();
    });

    const dialog = getOpenDialog();
    fireEvent.change(within(dialog).getByLabelText("Category Name"), {
      target: { value: "Food" },
    });
    fireEvent.change(within(dialog).getByLabelText("Type"), {
      target: { value: "expense" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /create category/i }),
    );

    await waitFor(() => {
      expect(within(dialog).getByText(/already exists/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------
describe("Categories — edit dialog", () => {
  it("opens edit dialog pre-populated with category name", async () => {
    const cat = makeCategory({
      id: 5,
      name: "Groceries",
      category_type: "expense",
      is_system: false,
    });
    mockListCategories.mockResolvedValue([cat]);

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /edit groceries/i }));
    await waitFor(() => {
      getOpenDialog();
    });

    const dialog = getOpenDialog();
    const nameInput = within(dialog).getByLabelText(
      "Category Name",
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("Groceries");
  });

  it("allows renaming system categories", async () => {
    const cat = makeCategory({
      id: 1,
      name: "Salary",
      category_type: "income",
      is_system: true,
    });
    const updated = { ...cat, name: "Monthly Salary" };
    mockListCategories.mockResolvedValue([cat]);
    mockUpdateCategory.mockResolvedValue(updated);

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Salary")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /edit salary/i }));
    await waitFor(() => {
      getOpenDialog();
    });

    const dialog = getOpenDialog();
    const nameInput = within(dialog).getByLabelText(
      "Category Name",
    ) as HTMLInputElement;
    expect(nameInput.disabled).toBe(false);
    expect(
      within(dialog).getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: "Monthly Salary" } });
    mockListCategories.mockResolvedValue([updated]);
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save changes/i }),
    );

    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith(1, "Monthly Salary");
    });
  });

  it("submits rename and refreshes list", async () => {
    const cat = makeCategory({
      id: 5,
      name: "Groceries",
      category_type: "expense",
      is_system: false,
    });
    const updated = { ...cat, name: "Food & Groceries" };
    mockListCategories.mockResolvedValue([cat]);
    mockUpdateCategory.mockResolvedValue(updated);

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /edit groceries/i }));
    await waitFor(() => {
      getOpenDialog();
    });

    const dialog = getOpenDialog();
    fireEvent.change(within(dialog).getByLabelText("Category Name"), {
      target: { value: "Food & Groceries" },
    });

    mockListCategories.mockResolvedValue([updated]);
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save changes/i }),
    );

    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith(5, "Food & Groceries");
    });

    await waitFor(() => {
      expect(mockListCategories).toHaveBeenCalledTimes(2);
    });
  });

  it("shows category type as read-only text", async () => {
    const cat = makeCategory({
      id: 5,
      name: "Groceries",
      category_type: "expense",
      is_system: false,
    });
    mockListCategories.mockResolvedValue([cat]);

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /edit groceries/i }));
    await waitFor(() => {
      getOpenDialog();
    });

    const dialog = getOpenDialog();
    expect(within(dialog).getByText("Expense")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Category type cannot be changed after creation.",
      ),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Delete flow
// ---------------------------------------------------------------------------
describe("Categories — delete flow", () => {
  it("opens delete confirmation with transaction count", async () => {
    const cat = makeCategory({
      id: 5,
      name: "Groceries",
      category_type: "expense",
      is_system: false,
    });
    mockListCategories.mockResolvedValue([cat]);
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 7,
    });

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete groceries/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/7 transactions will become uncategorized/i),
      ).toBeInTheDocument();
    });
  });

  it("shows simpler message when no transactions use the category", async () => {
    const cat = makeCategory({
      id: 5,
      name: "Custom",
      category_type: "expense",
      is_system: false,
    });
    mockListCategories.mockResolvedValue([cat]);
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete custom/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no transactions use this category/i),
      ).toBeInTheDocument();
    });
  });

  it("singular transaction message", async () => {
    const cat = makeCategory({
      id: 5,
      name: "Test",
      category_type: "expense",
      is_system: false,
    });
    mockListCategories.mockResolvedValue([cat]);
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 1,
    });

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete test/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/1 transaction will become uncategorized/i),
      ).toBeInTheDocument();
    });
  });

  it("executes delete and refreshes list", async () => {
    const cat = makeCategory({
      id: 5,
      name: "Groceries",
      category_type: "expense",
      is_system: false,
    });
    mockListCategories.mockResolvedValue([cat]);
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    mockDeleteCategory.mockResolvedValue(undefined);

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete groceries/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no transactions use this category/i),
      ).toBeInTheDocument();
    });

    mockListCategories.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: /delete category/i }));

    await waitFor(() => {
      expect(mockDeleteCategory).toHaveBeenCalledWith(5);
    });

    await waitFor(() => {
      expect(mockListCategories).toHaveBeenCalledTimes(2);
    });
  });

  it("shows error on delete failure", async () => {
    const cat = makeCategory({
      id: 5,
      name: "Groceries",
      category_type: "expense",
      is_system: false,
    });
    mockListCategories.mockResolvedValue([cat]);
    mockListTransactions.mockResolvedValue({
      transactions: [],
      total_count: 0,
    });
    mockDeleteCategory.mockRejectedValue("Delete failed");

    render(<Categories />);
    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete groceries/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no transactions use this category/i),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete category/i }));

    await waitFor(() => {
      expect(screen.getByText(/delete failed/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
describe("Categories — header", () => {
  it("renders page title", async () => {
    mockListCategories.mockResolvedValue([]);
    render(<Categories />);
    expect(
      screen.getByRole("heading", { name: "Categories", level: 2 }),
    ).toBeInTheDocument();
  });

  it("renders New Category button in header", async () => {
    mockListCategories.mockResolvedValue([]);
    render(<Categories />);
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /new category/i }).length,
      ).toBeGreaterThan(0);
    });
  });
});
