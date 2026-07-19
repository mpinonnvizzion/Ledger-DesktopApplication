import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Account, Category, Transaction } from "@/types/domain";
import { EditTransactionDialog } from "./EditTransactionDialog";

vi.mock("@/api/transactions", () => ({
  updateTransaction: vi.fn(),
}));

import { updateTransaction } from "@/api/transactions";

const mockUpdateTransaction = vi.mocked(updateTransaction);

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
    description: "Original description",
    date: "2026-07-01",
    notes: null,
    status: "uncleared",
    source: "manual",
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

const ONE_ACCOUNT = [makeAccount({ id: 1, name: "Checking" })];
const TWO_ACCOUNTS = [
  makeAccount({ id: 1, name: "Checking" }),
  makeAccount({ id: 2, name: "Savings" }),
];
const ONE_CATEGORY = [makeCategory({ id: 1, name: "Groceries" })];

function accountsByIdFrom(accounts: Account[]): Map<number, Account> {
  return new Map(accounts.map((a) => [a.id, a]));
}

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
    accounts: Account[];
    categories: Category[];
    accountsById: Map<number, Account>;
    onClose: () => void;
    onUpdated: (t: Transaction) => void;
  }> = {},
) {
  const transaction =
    overrides.transaction !== undefined
      ? overrides.transaction
      : makeTransaction({});
  const accounts = overrides.accounts ?? ONE_ACCOUNT;
  return render(
    <EditTransactionDialog
      open={overrides.open ?? true}
      workspaceId={overrides.workspaceId ?? 1}
      transaction={transaction}
      accounts={accounts}
      categories={overrides.categories ?? ONE_CATEGORY}
      accountsById={overrides.accountsById ?? accountsByIdFrom(accounts)}
      onClose={overrides.onClose ?? vi.fn()}
      onUpdated={overrides.onUpdated ?? vi.fn()}
    />,
  );
}

describe("EditTransactionDialog — prepopulation", () => {
  it("derives Expense direction from a negative amount", () => {
    renderDialog({ transaction: makeTransaction({ amount_minor: -1500 }) });
    expect(screen.getByLabelText("Expense")).toBeChecked();
  });

  it("derives Income direction from a positive amount", () => {
    renderDialog({ transaction: makeTransaction({ amount_minor: 4250 }) });
    expect(screen.getByLabelText("Income")).toBeChecked();
  });

  it("displays the amount as a positive magnitude regardless of direction", () => {
    renderDialog({ transaction: makeTransaction({ amount_minor: -4250 }) });
    expect(screen.getByLabelText("Amount")).toHaveValue("42.50");
  });

  it("prepopulates the date exactly, unmodified", () => {
    renderDialog({ transaction: makeTransaction({ date: "2026-03-15" }) });
    expect(screen.getByLabelText("Date")).toHaveValue("2026-03-15");
  });

  it("prepopulates the description", () => {
    renderDialog({
      transaction: makeTransaction({ description: "Weekly groceries" }),
    });
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Weekly groceries",
    );
  });

  it("prepopulates the account", () => {
    renderDialog({
      transaction: makeTransaction({ account_id: 1 }),
      accounts: TWO_ACCOUNTS,
    });
    expect(screen.getByLabelText("Account")).toHaveValue("1");
  });

  it("prepopulates the existing category", () => {
    renderDialog({ transaction: makeTransaction({ category_id: 1 }) });
    expect(screen.getByLabelText("Category")).toHaveValue("1");
  });

  it("prepopulates Uncategorized when the category is absent", () => {
    renderDialog({ transaction: makeTransaction({ category_id: null }) });
    expect(screen.getByLabelText("Category")).toHaveValue("");
  });

  it("prepopulates existing notes", () => {
    renderDialog({ transaction: makeTransaction({ notes: "Paid in cash" }) });
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue(
      "Paid in cash",
    );
  });

  it("renders blank notes when notes are absent", () => {
    renderDialog({ transaction: makeTransaction({ notes: null }) });
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue("");
  });
});

describe("EditTransactionDialog — archived-account behavior", () => {
  it("shows the current archived account as the selected value, clearly labeled", () => {
    const archived = makeAccount({
      id: 9,
      name: "Old Savings",
      is_active: false,
    });
    renderDialog({
      transaction: makeTransaction({ account_id: 9 }),
      accounts: ONE_ACCOUNT,
      accountsById: accountsByIdFrom([...ONE_ACCOUNT, archived]),
    });
    const select = screen.getByLabelText("Account") as HTMLSelectElement;
    expect(select.value).toBe("9");
    expect(screen.getByText("Old Savings (Archived)")).toBeInTheDocument();
    expect(
      screen.getByText(/current account is archived/i),
    ).toBeInTheDocument();
  });

  it("excludes unrelated archived accounts from the options", () => {
    const currentArchived = makeAccount({
      id: 9,
      name: "Old Savings",
      is_active: false,
    });
    const unrelatedArchived = makeAccount({
      id: 10,
      name: "Unrelated Closed Account",
      is_active: false,
    });
    renderDialog({
      transaction: makeTransaction({ account_id: 9 }),
      accounts: ONE_ACCOUNT,
      accountsById: accountsByIdFrom([
        ...ONE_ACCOUNT,
        currentArchived,
        unrelatedArchived,
      ]),
    });
    expect(screen.queryByText("Unrelated Closed Account")).toBeNull();
  });

  it("keeps active accounts available for reassignment", () => {
    const archived = makeAccount({
      id: 9,
      name: "Old Savings",
      is_active: false,
    });
    renderDialog({
      transaction: makeTransaction({ account_id: 9 }),
      accounts: TWO_ACCOUNTS,
      accountsById: accountsByIdFrom([...TWO_ACCOUNTS, archived]),
    });
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
  });

  it("saves other field edits without forcing a change away from the archived account", async () => {
    const archived = makeAccount({
      id: 9,
      name: "Old Savings",
      is_active: false,
    });
    const transaction = makeTransaction({
      account_id: 9,
      description: "Original description",
    });
    mockUpdateTransaction.mockResolvedValue(
      makeTransaction({ ...transaction, description: "Updated" }),
    );
    renderDialog({
      transaction,
      accounts: ONE_ACCOUNT,
      accountsById: accountsByIdFrom([...ONE_ACCOUNT, archived]),
    });

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        undefined,
        "Updated",
        undefined,
        undefined,
      ),
    );
  });
});

describe("EditTransactionDialog — change detection", () => {
  it("disables Save when nothing has changed", () => {
    renderDialog({});
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("enables Save on a valid change", () => {
    renderDialog({});
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Changed" },
    });
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).not.toBeDisabled();
  });

  it("disables Save again after reverting the change", () => {
    renderDialog({ transaction: makeTransaction({ description: "Original" }) });
    const input = screen.getByLabelText("Description");
    fireEvent.change(input, { target: { value: "Changed" } });
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).not.toBeDisabled();
    fireEvent.change(input, { target: { value: "Original" } });
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("keeps Save disabled for an equivalent amount re-entered in a different string form", () => {
    renderDialog({ transaction: makeTransaction({ amount_minor: -4250 }) });
    // Baseline displays "42.50"; retyping the numerically-equivalent "42.5"
    // must not be treated as a change (normalized comparison, not raw string).
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "42.5" },
    });
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("enables Save when only direction is flipped (same magnitude)", () => {
    renderDialog({ transaction: makeTransaction({ amount_minor: -4250 }) });
    fireEvent.click(screen.getByLabelText("Income"));
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).not.toBeDisabled();
  });

  it("keeps Save disabled when the form is invalid, even if a field looks different", () => {
    renderDialog({});
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "" },
    });
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });
});

describe("EditTransactionDialog — payload mapping", () => {
  it("sends only the description for a description-only edit", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({});
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "New description" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        undefined,
        "New description",
        undefined,
        undefined,
      ),
    );
  });

  it("sends negative minor units for an expense amount change", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({ transaction: makeTransaction({ amount_minor: -1500 }) });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "20.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        -2000,
        undefined,
        undefined,
        undefined,
      ),
    );
  });

  it("sends positive minor units for an income amount change", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({ transaction: makeTransaction({ amount_minor: 1500 }) });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "20.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        2000,
        undefined,
        undefined,
        undefined,
      ),
    );
  });

  it("flips the sign correctly on a direction change", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({ transaction: makeTransaction({ amount_minor: -1500 }) });
    fireEvent.click(screen.getByLabelText("Income"));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        1500,
        undefined,
        undefined,
        undefined,
      ),
    );
  });

  it("maps an account change to the new account's numeric id", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({
      transaction: makeTransaction({ account_id: 1 }),
      accounts: TWO_ACCOUNTS,
    });
    fireEvent.change(screen.getByLabelText("Account"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        1,
        2,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ),
    );
  });

  it("maps a category change to the new category's id", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({
      transaction: makeTransaction({ category_id: null }),
      categories: [makeCategory({ id: 5, name: "Rent" })],
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        1,
        undefined,
        5,
        undefined,
        undefined,
        undefined,
        undefined,
      ),
    );
  });

  it("clears the category using explicit null, not undefined or an empty string", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({ transaction: makeTransaction({ category_id: 1 }) });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mockUpdateTransaction).toHaveBeenCalled());
    // Positional argument 3 (index 2) is categoryId.
    expect(mockUpdateTransaction.mock.calls[0][2]).toBeNull();
  });

  it("maps a notes change to the new trimmed text", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({ transaction: makeTransaction({ notes: null }) });
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "  New note  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "New note",
      ),
    );
  });

  it("clears notes using explicit null, not undefined or an empty string", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({ transaction: makeTransaction({ notes: "Existing note" }) });
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mockUpdateTransaction).toHaveBeenCalled());
    // Positional argument 7 (index 6) is notes.
    expect(mockUpdateTransaction.mock.calls[0][6]).toBeNull();
  });

  it("maps a date change", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({ transaction: makeTransaction({ date: "2026-07-01" }) });
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-08-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        undefined,
        undefined,
        "2026-08-15",
        undefined,
      ),
    );
  });

  it("never sends more than the seven arguments the contract expects", async () => {
    mockUpdateTransaction.mockResolvedValue(makeTransaction({}));
    renderDialog({});
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mockUpdateTransaction).toHaveBeenCalled());
    expect(mockUpdateTransaction.mock.calls[0]).toHaveLength(7);
  });
});

describe("EditTransactionDialog — submission lifecycle", () => {
  it("prevents duplicate submissions while a request is in flight", async () => {
    let resolveUpdate: (transaction: Transaction) => void = () => {};
    mockUpdateTransaction.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    renderDialog({});
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Changed" },
    });
    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(mockUpdateTransaction).toHaveBeenCalledTimes(1);

    resolveUpdate(makeTransaction({}));
    await waitFor(() => expect(saveButton).not.toBeDisabled());
  });

  it("disables Cancel while saving", () => {
    mockUpdateTransaction.mockReturnValue(new Promise(() => {}));
    renderDialog({});
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("keeps the dialog open and preserves entered values on API failure", async () => {
    mockUpdateTransaction.mockRejectedValue(
      '{"code":"validation_error","message":"Transaction amount cannot be zero."}',
    );
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Changed description" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(
        screen.getByText("Transaction amount cannot be zero."),
      ).toBeInTheDocument(),
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Changed description",
    );
    expect(screen.queryByText(/rusqlite|sqlite|tauri|panic/i)).toBeNull();
  });

  it("calls onUpdated with the backend-returned transaction on success", async () => {
    const updated = makeTransaction({ id: 1, description: "Saved" });
    mockUpdateTransaction.mockResolvedValue(updated);
    const onUpdated = vi.fn();
    renderDialog({ onUpdated });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Saved" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
  });
});

describe("EditTransactionDialog — dialog lifecycle", () => {
  it("discards unsaved changes on cancel", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Unsaved edit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("restores backend values on a genuine reopen transition", async () => {
    const transaction = makeTransaction({ description: "Backend value" });
    const { rerender } = render(
      <EditTransactionDialog
        open={true}
        workspaceId={1}
        transaction={transaction}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        accountsById={accountsByIdFrom(ONE_ACCOUNT)}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Unsaved edit" },
    });

    rerender(
      <EditTransactionDialog
        open={false}
        workspaceId={1}
        transaction={transaction}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        accountsById={accountsByIdFrom(ONE_ACCOUNT)}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    rerender(
      <EditTransactionDialog
        open={true}
        workspaceId={1}
        transaction={transaction}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        accountsById={accountsByIdFrom(ONE_ACCOUNT)}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Description")).toHaveValue("Backend value"),
    );
  });

  it("closes when the workspace changes while open", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <EditTransactionDialog
        open={true}
        workspaceId={1}
        transaction={makeTransaction({})}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        accountsById={accountsByIdFrom(ONE_ACCOUNT)}
        onClose={onClose}
        onUpdated={vi.fn()}
      />,
    );
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <EditTransactionDialog
        open={true}
        workspaceId={2}
        transaction={makeTransaction({})}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        accountsById={accountsByIdFrom(ONE_ACCOUNT)}
        onClose={onClose}
        onUpdated={vi.fn()}
      />,
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes safely if the selected transaction disappears while open", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <EditTransactionDialog
        open={true}
        workspaceId={1}
        transaction={makeTransaction({})}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        accountsById={accountsByIdFrom(ONE_ACCOUNT)}
        onClose={onClose}
        onUpdated={vi.fn()}
      />,
    );
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <EditTransactionDialog
        open={true}
        workspaceId={1}
        transaction={null}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        accountsById={accountsByIdFrom(ONE_ACCOUNT)}
        onClose={onClose}
        onUpdated={vi.fn()}
      />,
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not crash and does not call onClose when mounted closed with no transaction", () => {
    const onClose = vi.fn();
    render(
      <EditTransactionDialog
        open={false}
        workspaceId={1}
        transaction={null}
        accounts={ONE_ACCOUNT}
        categories={ONE_CATEGORY}
        accountsById={accountsByIdFrom(ONE_ACCOUNT)}
        onClose={onClose}
        onUpdated={vi.fn()}
      />,
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
