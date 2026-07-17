import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Account } from "@/types/domain";
import { CreateAccountDialog } from "./CreateAccountDialog";

vi.mock("@/api/accounts", () => ({
  createAccount: vi.fn(),
}));

import { createAccount } from "@/api/accounts";

const mockCreateAccount = vi.mocked(createAccount);

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
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Account Name"), {
    target: { value: "Everyday Checking" },
  });
  fireEvent.change(screen.getByLabelText("Account Type"), {
    target: { value: "checking" },
  });
}

describe("CreateAccountDialog — open/close", () => {
  it("closes when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={onClose}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("CreateAccountDialog — supported account types", () => {
  it("renders all supported account type options", () => {
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    const select = screen.getByLabelText("Account Type") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual([
      "",
      "checking",
      "savings",
      "credit_card",
      "cash",
      "investment",
      "loan",
      "other",
    ]);
    expect(screen.getByText("Credit Card")).toBeInTheDocument();
  });
});

describe("CreateAccountDialog — validation", () => {
  it("requires an account name", () => {
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Account Type"), {
      target: { value: "checking" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByText("Account name is required.")).toBeInTheDocument();
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only account name", () => {
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Account Name"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("Account Type"), {
      target: { value: "checking" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByText("Account name is required.")).toBeInTheDocument();
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it("requires an account type", () => {
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Account Name"), {
      target: { value: "Everyday Checking" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByText("Account type is required.")).toBeInTheDocument();
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });
});

describe("CreateAccountDialog — submission", () => {
  it("calls createAccount with the workspace id and trimmed, matching API contract", async () => {
    mockCreateAccount.mockResolvedValue(makeAccount({ id: 7 }));
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={9}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Account Name"), {
      target: { value: "  Everyday Checking  " },
    });
    fireEvent.change(screen.getByLabelText("Account Type"), {
      target: { value: "checking" },
    });
    fireEvent.change(screen.getByLabelText("Institution (optional)"), {
      target: { value: "  Chase  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() =>
      expect(mockCreateAccount).toHaveBeenCalledWith(
        9,
        "Everyday Checking",
        "checking",
        undefined,
        "Chase",
      ),
    );
  });

  it("omits institution when left blank", async () => {
    mockCreateAccount.mockResolvedValue(makeAccount({ id: 7 }));
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() =>
      expect(mockCreateAccount).toHaveBeenCalledWith(
        1,
        "Everyday Checking",
        "checking",
        undefined,
        undefined,
      ),
    );
  });

  it("prevents duplicate submissions while a request is in flight", async () => {
    let resolveCreate: (account: Account) => void = () => {};
    mockCreateAccount.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    const submitButton = screen.getByRole("button", { name: "Create Account" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(mockCreateAccount).toHaveBeenCalledTimes(1);

    resolveCreate(makeAccount({ id: 1 }));
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("disables Cancel while submitting", () => {
    mockCreateAccount.mockReturnValue(new Promise(() => {}));
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("calls onCreated and clears the form on success", async () => {
    const created = makeAccount({ id: 5, name: "Everyday Checking" });
    mockCreateAccount.mockResolvedValue(created);
    const onCreated = vi.fn();
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={onCreated}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));

    const nameInput = screen.getByLabelText("Account Name") as HTMLInputElement;
    expect(nameInput.value).toBe("");
  });
});

describe("CreateAccountDialog — API failure", () => {
  it("preserves entered values and shows a sanitized error", async () => {
    mockCreateAccount.mockRejectedValue(
      '{"code":"validation_error","message":"Account name cannot be empty."}',
    );
    render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() =>
      expect(
        screen.getByText("Account name cannot be empty."),
      ).toBeInTheDocument(),
    );

    const nameInput = screen.getByLabelText("Account Name") as HTMLInputElement;
    expect(nameInput.value).toBe("Everyday Checking");
    expect(screen.queryByText(/sqlite/i)).not.toBeInTheDocument();
  });
});

describe("CreateAccountDialog — reopening", () => {
  it("clears stale errors and values when reopened", async () => {
    mockCreateAccount.mockRejectedValue(
      '{"code":"validation_error","message":"Something went wrong."}',
    );
    const { rerender } = render(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    await waitFor(() =>
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument(),
    );

    rerender(
      <CreateAccountDialog
        open={false}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    rerender(
      <CreateAccountDialog
        open={true}
        workspaceId={1}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(
        screen.queryByText("Something went wrong."),
      ).not.toBeInTheDocument(),
    );
    const nameInput = screen.getByLabelText("Account Name") as HTMLInputElement;
    expect(nameInput.value).toBe("");
  });
});
