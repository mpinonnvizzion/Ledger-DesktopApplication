import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Account, Transaction } from "@/types/domain";
import { DeleteTransactionDialog } from "./DeleteTransactionDialog";

vi.mock("@/api/transactions", () => ({
  deleteTransaction: vi.fn(),
}));

import { deleteTransaction } from "@/api/transactions";

const mockDeleteTransaction = vi.mocked(deleteTransaction);

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

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    workspace_id: 1,
    account_id: 1,
    category_id: null,
    amount_minor: -1500,
    description: "Coffee shop",
    date: "2026-07-01",
    notes: null,
    status: "uncleared",
    source: "manual",
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

const ONE_ACCOUNT = new Map([[1, makeAccount({ id: 1, name: "Checking" })]]);

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
});

function renderDialog(
  overrides: Partial<{
    open: boolean;
    workspaceId: number;
    transaction: Transaction | null;
    accountsById: Map<number, Account>;
    onClose: () => void;
    onDeleted: () => void;
  }> = {},
) {
  const transaction =
    overrides.transaction !== undefined
      ? overrides.transaction
      : makeTransaction({});
  return render(
    <DeleteTransactionDialog
      open={overrides.open ?? true}
      workspaceId={overrides.workspaceId ?? 1}
      transaction={transaction}
      accountsById={overrides.accountsById ?? ONE_ACCOUNT}
      onClose={overrides.onClose ?? vi.fn()}
      onDeleted={overrides.onDeleted ?? vi.fn()}
    />,
  );
}

describe("DeleteTransactionDialog — confirmation content", () => {
  it("states that deletion is permanent and cannot be undone", () => {
    renderDialog({});
    expect(
      screen.getByRole("heading", { name: "Delete transaction?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/permanently delete this transaction/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("shows the transaction description", () => {
    renderDialog({
      transaction: makeTransaction({ description: "Coffee shop" }),
    });
    expect(screen.getByText("Coffee shop")).toBeInTheDocument();
  });

  it("shows the amount, sign-formatted", () => {
    renderDialog({ transaction: makeTransaction({ amount_minor: -1500 }) });
    expect(screen.getByText("$-15.00")).toBeInTheDocument();
  });

  it("shows Expense for a negative amount", () => {
    renderDialog({ transaction: makeTransaction({ amount_minor: -1500 }) });
    expect(screen.getByText("Expense")).toBeInTheDocument();
  });

  it("shows Income for a positive amount", () => {
    renderDialog({ transaction: makeTransaction({ amount_minor: 4250 }) });
    expect(screen.getByText("Income")).toBeInTheDocument();
  });

  it("shows the account name", () => {
    renderDialog({
      transaction: makeTransaction({ account_id: 1 }),
      accountsById: new Map([
        [1, makeAccount({ id: 1, name: "Everyday Checking" })],
      ]),
    });
    expect(screen.getByText("Everyday Checking")).toBeInTheDocument();
  });

  it("resolves an archived account's name correctly", () => {
    renderDialog({
      transaction: makeTransaction({ account_id: 9 }),
      accountsById: new Map([
        [9, makeAccount({ id: 9, name: "Old Savings", is_active: false })],
      ]),
    });
    expect(screen.getByText("Old Savings")).toBeInTheDocument();
  });

  it("falls back safely when the account cannot be resolved", () => {
    renderDialog({
      transaction: makeTransaction({ account_id: 999 }),
      accountsById: new Map(),
    });
    expect(screen.getByText("Unknown account")).toBeInTheDocument();
  });

  it("shows the transaction date", () => {
    renderDialog({ transaction: makeTransaction({ date: "2026-03-15" }) });
    expect(screen.getByText("Mar 15, 2026")).toBeInTheDocument();
  });

  it("does not display unsupported fields", () => {
    renderDialog({});
    expect(screen.queryByText(/payee/i)).toBeNull();
    expect(screen.queryByText(/merchant/i)).toBeNull();
    expect(screen.queryByText(/status/i)).toBeNull();
    expect(screen.queryByText(/reconcil/i)).toBeNull();
    expect(screen.queryByText(/transfer/i)).toBeNull();
  });
});

describe("DeleteTransactionDialog — cancel behavior", () => {
  it("closes without calling deleteTransaction", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockDeleteTransaction).not.toHaveBeenCalled();
  });
});

describe("DeleteTransactionDialog — delete submission", () => {
  it("calls deleteTransaction with exactly the transaction id", async () => {
    mockDeleteTransaction.mockResolvedValue(undefined);
    renderDialog({ transaction: makeTransaction({ id: 42 }) });
    fireEvent.click(screen.getByRole("button", { name: "Delete Transaction" }));
    await waitFor(() => expect(mockDeleteTransaction).toHaveBeenCalledWith(42));
    expect(mockDeleteTransaction).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate confirmation clicks from duplicating the request", async () => {
    let resolveDelete: () => void = () => {};
    mockDeleteTransaction.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    renderDialog({});
    const confirmButton = screen.getByRole("button", {
      name: "Delete Transaction",
    });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(mockDeleteTransaction).toHaveBeenCalledTimes(1);

    resolveDelete();
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
  });

  it("disables Cancel while deleting", () => {
    mockDeleteTransaction.mockReturnValue(new Promise(() => {}));
    renderDialog({});
    fireEvent.click(screen.getByRole("button", { name: "Delete Transaction" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("keeps the dialog open and preserves the transaction summary on failure", async () => {
    mockDeleteTransaction.mockRejectedValue(
      '{"code":"database_error","message":"A database error occurred. Please try again."}',
    );
    const onClose = vi.fn();
    const onDeleted = vi.fn();
    renderDialog({
      onClose,
      onDeleted,
      transaction: makeTransaction({ description: "Coffee shop" }),
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete Transaction" }));

    await waitFor(() =>
      expect(
        screen.getByText("A database error occurred. Please try again."),
      ).toBeInTheDocument(),
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByText("Coffee shop")).toBeInTheDocument();
    expect(screen.queryByText(/rusqlite|sqlite|tauri|panic/i)).toBeNull();
  });

  it("calls onDeleted on success and does not call onClose directly", async () => {
    mockDeleteTransaction.mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    renderDialog({ onDeleted });
    fireEvent.click(screen.getByRole("button", { name: "Delete Transaction" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
  });

  it("succeeds without a duplicate call after a prior failure", async () => {
    mockDeleteTransaction
      .mockRejectedValueOnce(
        '{"code":"database_error","message":"First failure"}',
      )
      .mockResolvedValueOnce(undefined);
    const onDeleted = vi.fn();
    renderDialog({ onDeleted });
    const confirmButton = screen.getByRole("button", {
      name: "Delete Transaction",
    });

    fireEvent.click(confirmButton);
    await waitFor(() =>
      expect(screen.getByText("First failure")).toBeInTheDocument(),
    );

    fireEvent.click(confirmButton);
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(mockDeleteTransaction).toHaveBeenCalledTimes(2);
  });
});

describe("DeleteTransactionDialog — lifecycle", () => {
  it("loads the correct transaction's summary when reopened for a different row", async () => {
    const first = makeTransaction({ id: 1, description: "First" });
    const second = makeTransaction({ id: 2, description: "Second" });
    const { rerender } = render(
      <DeleteTransactionDialog
        open={true}
        workspaceId={1}
        transaction={first}
        accountsById={ONE_ACCOUNT}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.getByText("First")).toBeInTheDocument();

    rerender(
      <DeleteTransactionDialog
        open={false}
        workspaceId={1}
        transaction={first}
        accountsById={ONE_ACCOUNT}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    rerender(
      <DeleteTransactionDialog
        open={true}
        workspaceId={1}
        transaction={second}
        accountsById={ONE_ACCOUNT}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("Second")).toBeInTheDocument());
  });

  it("closes when the workspace changes while open", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <DeleteTransactionDialog
        open={true}
        workspaceId={1}
        transaction={makeTransaction({})}
        accountsById={ONE_ACCOUNT}
        onClose={onClose}
        onDeleted={vi.fn()}
      />,
    );
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <DeleteTransactionDialog
        open={true}
        workspaceId={2}
        transaction={makeTransaction({})}
        accountsById={ONE_ACCOUNT}
        onClose={onClose}
        onDeleted={vi.fn()}
      />,
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes safely if the selected transaction disappears while open", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <DeleteTransactionDialog
        open={true}
        workspaceId={1}
        transaction={makeTransaction({})}
        accountsById={ONE_ACCOUNT}
        onClose={onClose}
        onDeleted={vi.fn()}
      />,
    );
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <DeleteTransactionDialog
        open={true}
        workspaceId={1}
        transaction={null}
        accountsById={ONE_ACCOUNT}
        onClose={onClose}
        onDeleted={vi.fn()}
      />,
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not crash and does not call onClose when mounted closed with no transaction", () => {
    const onClose = vi.fn();
    render(
      <DeleteTransactionDialog
        open={false}
        workspaceId={1}
        transaction={null}
        accountsById={ONE_ACCOUNT}
        onClose={onClose}
        onDeleted={vi.fn()}
      />,
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
