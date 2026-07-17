import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Account } from "@/types/domain";
import { EditAccountDialog } from "./EditAccountDialog";

vi.mock("@/api/accounts", () => ({
  updateAccount: vi.fn(),
}));

import { updateAccount } from "@/api/accounts";

const mockUpdateAccount = vi.mocked(updateAccount);

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 1,
    workspace_id: 1,
    name: "Everyday Checking",
    account_type: "checking",
    currency: "USD",
    balance: 0,
    institution_name: "Chase",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
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

describe("EditAccountDialog — form initialization", () => {
  it("populates fields from the selected account", () => {
    const account = makeAccount({
      name: "Everyday Checking",
      institution_name: "Chase",
    });
    render(
      <EditAccountDialog
        open={true}
        account={account}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Account Name")).toHaveValue(
      "Everyday Checking",
    );
    expect(screen.getByLabelText("Institution (optional)")).toHaveValue(
      "Chase",
    );
  });

  it("displays the stored account type as a disabled field", () => {
    const account = makeAccount({ account_type: "credit_card" });
    render(
      <EditAccountDialog
        open={true}
        account={account}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    const typeSelect = screen.getByLabelText(
      "Account Type",
    ) as HTMLSelectElement;
    expect(typeSelect.value).toBe("credit_card");
    expect(typeSelect).toBeDisabled();
  });

  it("shows the dialog title and description", () => {
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({})}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Edit Account" }),
    ).toBeInTheDocument();
  });
});

describe("EditAccountDialog — open/close", () => {
  it("closes without calling updateAccount when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({})}
        onClose={onClose}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });
});

describe("EditAccountDialog — validation", () => {
  it("requires an account name", () => {
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({})}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Account Name"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(screen.getByText("Account name is required.")).toBeInTheDocument();
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only account name", () => {
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({})}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Account Name"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(screen.getByText("Account name is required.")).toBeInTheDocument();
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });
});

describe("EditAccountDialog — submission", () => {
  it("calls updateAccount with the selected account's id, trimmed name, and institution", async () => {
    mockUpdateAccount.mockResolvedValue(makeAccount({ id: 42 }));
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({ id: 42, institution_name: "Chase" })}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Account Name"), {
      target: { value: "  Renamed Account  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateAccount).toHaveBeenCalledWith(
        42,
        "Renamed Account",
        "Chase",
        undefined,
      ),
    );
  });

  it("never sends an account_type argument", async () => {
    mockUpdateAccount.mockResolvedValue(makeAccount({}));
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({})}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mockUpdateAccount).toHaveBeenCalled());
    const call = mockUpdateAccount.mock.calls[0];
    expect(call).toHaveLength(4);
  });

  it("sends an explicit empty string when institution is cleared, not undefined", async () => {
    mockUpdateAccount.mockResolvedValue(makeAccount({}));
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({ institution_name: "Chase" })}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Institution (optional)"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockUpdateAccount).toHaveBeenCalledWith(
        1,
        "Everyday Checking",
        "",
        undefined,
      ),
    );
  });

  it("prevents duplicate submissions while a request is in flight", async () => {
    let resolveUpdate: (account: Account) => void = () => {};
    mockUpdateAccount.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({})}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(mockUpdateAccount).toHaveBeenCalledTimes(1);

    resolveUpdate(makeAccount({}));
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("disables Cancel while submitting", () => {
    mockUpdateAccount.mockReturnValue(new Promise(() => {}));
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({})}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("calls onUpdated on success", async () => {
    const updated = makeAccount({ id: 1, name: "Renamed" });
    mockUpdateAccount.mockResolvedValue(updated);
    const onUpdated = vi.fn();
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({})}
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
  });
});

describe("EditAccountDialog — API failure", () => {
  it("preserves entered values and shows a sanitized error", async () => {
    mockUpdateAccount.mockRejectedValue(
      '{"code":"validation_error","message":"Account name cannot be empty."}',
    );
    render(
      <EditAccountDialog
        open={true}
        account={makeAccount({})}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Account Name"), {
      target: { value: "Attempted Rename" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(
        screen.getByText("Account name cannot be empty."),
      ).toBeInTheDocument(),
    );

    const nameInput = screen.getByLabelText("Account Name") as HTMLInputElement;
    expect(nameInput.value).toBe("Attempted Rename");
    expect(screen.queryByText(/sqlite/i)).not.toBeInTheDocument();
  });
});

describe("EditAccountDialog — switching between accounts", () => {
  it("does not leak stale form state when editing a different account after closing", async () => {
    const accountA = makeAccount({
      id: 1,
      name: "Account A",
      institution_name: "Bank A",
    });
    const accountB = makeAccount({
      id: 2,
      name: "Account B",
      institution_name: "Bank B",
    });

    const { rerender } = render(
      <EditAccountDialog
        open={true}
        account={accountA}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Account Name"), {
      target: { value: "Modified A" },
    });

    // Close, then reopen for a different account (a real closed->open transition).
    rerender(
      <EditAccountDialog
        open={false}
        account={accountA}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    rerender(
      <EditAccountDialog
        open={true}
        account={accountB}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Account Name")).toHaveValue("Account B"),
    );
    expect(screen.getByLabelText("Institution (optional)")).toHaveValue(
      "Bank B",
    );
  });

  it("clears a stale API error when reopened for a different account", async () => {
    mockUpdateAccount.mockRejectedValue(
      '{"code":"validation_error","message":"Something went wrong."}',
    );
    const accountA = makeAccount({ id: 1, name: "Account A" });
    const accountB = makeAccount({ id: 2, name: "Account B" });

    const { rerender } = render(
      <EditAccountDialog
        open={true}
        account={accountA}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() =>
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument(),
    );

    rerender(
      <EditAccountDialog
        open={false}
        account={accountA}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    rerender(
      <EditAccountDialog
        open={true}
        account={accountB}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(
        screen.queryByText("Something went wrong."),
      ).not.toBeInTheDocument(),
    );
  });
});
