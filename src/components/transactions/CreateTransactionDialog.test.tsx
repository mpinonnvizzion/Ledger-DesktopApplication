import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Account, Category, Transaction } from "@/types/domain";
import { CreateTransactionDialog } from "./CreateTransactionDialog";

vi.mock("@/api/transactions", () => ({
  createTransaction: vi.fn(),
}));

import { createTransaction } from "@/api/transactions";

const mockCreateTransaction = vi.mocked(createTransaction);

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 1,
    workspace_id: 1,
    name: "Checking",
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
    name: "Groceries",
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

const ONE_ACCOUNT = [makeAccount({ id: 1, name: "Everyday Checking" })];
const ONE_CATEGORY = [makeCategory({ id: 1, name: "Groceries" })];

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  // Only Date is faked - setTimeout/setInterval stay real so
  // Testing Library's waitFor (which polls via a real timer) keeps working.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 6, 19, 15, 30));
});

afterEach(() => {
  vi.useRealTimers();
});

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Amount"), {
    target: { value: "42.50" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Groceries run" },
  });
  fireEvent.change(screen.getByLabelText("Account"), {
    target: { value: "1" },
  });
}

describe("CreateTransactionDialog — field set", () => {
  it("renders exactly the expected labeled fields", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    expect(screen.getByText("Direction")).toBeInTheDocument();
    expect(screen.getByLabelText("Expense")).toBeInTheDocument();
    expect(screen.getByLabelText("Income")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Account")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
  });

  it("never renders a Payee, Merchant, posted-date, Transfer, status, or reconciliation field", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    expect(screen.queryByText(/payee/i)).toBeNull();
    expect(screen.queryByText(/merchant/i)).toBeNull();
    expect(screen.queryByText(/posted/i)).toBeNull();
    expect(screen.queryByText(/transfer/i)).toBeNull();
    expect(screen.queryByText(/status/i)).toBeNull();
    expect(screen.queryByText(/reconcil/i)).toBeNull();
    expect(screen.queryByText(/cleared/i)).toBeNull();
  });

  it("selects Expense by default", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Expense")).toBeChecked();
    expect(screen.getByLabelText("Income")).not.toBeChecked();
  });

  it("defaults the date to today's local calendar date", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Date")).toHaveValue("2026-07-19");
  });

  it("lists active accounts as options", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={[
          makeAccount({ id: 1, name: "Everyday Checking" }),
          makeAccount({ id: 2, name: "Savings" }),
        ]}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    expect(screen.getByText("Everyday Checking")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
  });

  it("includes an Uncategorized option plus every eligible category", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={[
          makeCategory({ id: 1, name: "Groceries", category_type: "expense" }),
          makeCategory({ id: 2, name: "Salary", category_type: "income" }),
        ]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    const select = screen.getByLabelText("Category") as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.text);
    expect(labels).toEqual(["Uncategorized", "Groceries", "Salary"]);
  });
});

describe("CreateTransactionDialog — no active accounts", () => {
  it("explains that an active account is required and disables submission", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={[]}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/an active account is required/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Account")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Create Transaction" }),
    ).toBeDisabled();
  });

  it("still allows closing the dialog", () => {
    const onClose = vi.fn();
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={[]}
        categories={ONE_CATEGORY}
        onClose={onClose}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call createTransaction even if submit is force-triggered", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={[]}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    const form = screen
      .getByRole("button", { name: "Create Transaction" })
      .closest("form")!;
    fireEvent.submit(form);
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });
});

describe("CreateTransactionDialog — amount and direction", () => {
  it("blocks submission on empty amount", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Groceries run" },
    });
    fireEvent.change(screen.getByLabelText("Account"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(
      screen.getByText("Enter a valid amount, e.g. 42.50."),
    ).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("blocks submission on negative amount input", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(
      screen.getByText("Enter a valid amount, e.g. 42.50."),
    ).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("blocks submission on more than two decimal places", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "10.123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(
      screen.getByText("Enter a valid amount, e.g. 42.50."),
    ).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("blocks submission on malformed amount input", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(
      screen.getByText("Enter a valid amount, e.g. 42.50."),
    ).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("blocks submission on a zero amount and keeps zero from becoming -0", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(
      screen.getByText("Amount must be greater than zero."),
    ).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("converts an expense magnitude to negative minor units", async () => {
    mockCreateTransaction.mockResolvedValue(makeTransaction({}));
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        1,
        1,
        -4250,
        "Groceries run",
        "2026-07-19",
        undefined,
        undefined,
      ),
    );
  });

  it("converts an income magnitude to positive minor units", async () => {
    mockCreateTransaction.mockResolvedValue(makeTransaction({}));
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByLabelText("Income"));
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        1,
        1,
        4250,
        "Groceries run",
        "2026-07-19",
        undefined,
        undefined,
      ),
    );
  });
});

describe("CreateTransactionDialog — other validation", () => {
  it("requires a date", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(screen.getByText("Date is required.")).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("requires a description", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Account"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(screen.getByText("Description is required.")).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only description", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("Account"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(screen.getByText("Description is required.")).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("rejects a description longer than 500 characters", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "x".repeat(501) },
    });
    fireEvent.change(screen.getByLabelText("Account"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(
      screen.getByText("Description cannot exceed 500 characters."),
    ).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("rejects notes longer than 2000 characters", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "x".repeat(2001) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(
      screen.getByText("Notes cannot exceed 2000 characters."),
    ).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("requires an account to be selected", () => {
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Groceries run" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(screen.getByText("Account is required.")).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });
});

describe("CreateTransactionDialog — submission payload", () => {
  it("omits category when Uncategorized is selected", async () => {
    mockCreateTransaction.mockResolvedValue(makeTransaction({}));
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalled());
    // Positional argument 6 (index 5) is categoryId.
    expect(mockCreateTransaction.mock.calls[0][5]).toBeUndefined();
  });

  it("submits the selected category's id", async () => {
    mockCreateTransaction.mockResolvedValue(makeTransaction({}));
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={[makeCategory({ id: 42, name: "Groceries" })]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "42" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        1,
        1,
        -4250,
        "Groceries run",
        "2026-07-19",
        42,
        undefined,
      ),
    );
  });

  it("omits notes when left blank", async () => {
    mockCreateTransaction.mockResolvedValue(makeTransaction({}));
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalled());
    // Positional argument 7 (index 6) is notes.
    expect(mockCreateTransaction.mock.calls[0][6]).toBeUndefined();
  });

  it("submits populated notes, trimmed", async () => {
    mockCreateTransaction.mockResolvedValue(makeTransaction({}));
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "  Weekly shop  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        1,
        1,
        -4250,
        "Groceries run",
        "2026-07-19",
        undefined,
        "Weekly shop",
      ),
    );
  });

  it("trims the description before submission", async () => {
    mockCreateTransaction.mockResolvedValue(makeTransaction({}));
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "42.50" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "  Groceries run  " },
    });
    fireEvent.change(screen.getByLabelText("Account"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        1,
        1,
        -4250,
        "Groceries run",
        "2026-07-19",
        undefined,
        undefined,
      ),
    );
  });

  it("never sends more than the seven arguments the contract expects", async () => {
    mockCreateTransaction.mockResolvedValue(makeTransaction({}));
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalled());
    expect(mockCreateTransaction.mock.calls[0]).toHaveLength(7);
  });
});

describe("CreateTransactionDialog — submission lifecycle", () => {
  it("prevents duplicate submissions while a request is in flight", async () => {
    let resolveCreate: (transaction: Transaction) => void = () => {};
    mockCreateTransaction.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    const submitButton = screen.getByRole("button", {
      name: "Create Transaction",
    });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(mockCreateTransaction).toHaveBeenCalledTimes(1);

    resolveCreate(makeTransaction({}));
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("disables Cancel while submitting", () => {
    mockCreateTransaction.mockReturnValue(new Promise(() => {}));
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("keeps the dialog's onClose uncalled and preserves entered values on API failure", async () => {
    mockCreateTransaction.mockRejectedValue(
      '{"code":"validation_error","message":"Transaction amount cannot be zero."}',
    );
    const onClose = vi.fn();
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={onClose}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() =>
      expect(
        screen.getByText("Transaction amount cannot be zero."),
      ).toBeInTheDocument(),
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Amount")).toHaveValue("42.50");
    expect(screen.getByLabelText("Description")).toHaveValue("Groceries run");
    expect(screen.queryByText(/rusqlite|sqlite|tauri|panic/i)).toBeNull();
  });

  it("calls onCreated and resets the form on success", async () => {
    const created = makeTransaction({ id: 9 });
    mockCreateTransaction.mockResolvedValue(created);
    const onCreated = vi.fn();
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={onCreated}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(screen.getByLabelText("Amount")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
  });
});

describe("CreateTransactionDialog — cancel and reopen", () => {
  it("discards entered values on cancel", () => {
    const onClose = vi.fn();
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={onClose}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("restores defaults on a genuine reopen transition", async () => {
    mockCreateTransaction.mockRejectedValue(
      '{"code":"validation_error","message":"Something went wrong."}',
    );
    const { rerender } = render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Transaction" }));
    await waitFor(() =>
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument(),
    );

    rerender(
      <CreateTransactionDialog
        open={false}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    rerender(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(
        screen.queryByText("Something went wrong."),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Amount")).toHaveValue("");
    expect(screen.getByLabelText("Expense")).toBeChecked();
  });
});

describe("CreateTransactionDialog — workspace change", () => {
  it("closes the dialog when the workspace changes while open", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={onClose}
        onCreated={vi.fn()}
      />,
    );
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <CreateTransactionDialog
        open={true}
        workspaceId={2}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={onClose}
        onCreated={vi.fn()}
      />,
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose on mount just because a workspaceId is set", () => {
    const onClose = vi.fn();
    render(
      <CreateTransactionDialog
        open={true}
        workspaceId={1}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        onClose={onClose}
        onCreated={vi.fn()}
      />,
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
