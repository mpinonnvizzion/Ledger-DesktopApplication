import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { AmountInput } from "@/components/ui/AmountInput";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { createTransaction } from "@/api/transactions";
import { parseCommandError } from "@/lib/errors";
import {
  applyTransactionDirection,
  parseAmountMagnitudeToMinorUnits,
} from "@/lib/transactionHelpers";
import type { Account, Category, Direction, Transaction } from "@/types/domain";

interface CreateTransactionDialogProps {
  open: boolean;
  workspaceId: number;
  /** Active accounts only (Product Decision 5) - the same selector list
   * `useTransactionReferenceData` already exposes for this purpose. Not the
   * unfiltered `accountsById` historical lookup used by the read-only table. */
  accounts: Account[];
  /** All workspace categories, in the backend's own `category_type, name`
   * order - preserved as-is per Product Decision 4. */
  categories: Category[];
  onClose: () => void;
  onCreated: (transaction: Transaction) => void;
}

interface FormState {
  direction: Direction;
  amount: string;
  date: string;
  description: string;
  accountId: string;
  categoryId: string;
  notes: string;
}

// Matches src-tauri/src/repositories/transaction.rs's MAX_DESCRIPTION_LENGTH
// and MAX_NOTES_LENGTH exactly, mirrored client-side per this phase's
// explicit validation requirements.
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;

/**
 * Today's date as a local `YYYY-MM-DD` string, using local `Date` accessors
 * (`getFullYear`/`getMonth`/`getDate`) rather than `toISOString()`, which is
 * UTC-based and can report the wrong calendar day near local midnight.
 */
function todayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDefaultForm(): FormState {
  return {
    direction: "expense",
    amount: "",
    date: todayLocalDateString(),
    description: "",
    accountId: "",
    categoryId: "",
    notes: "",
  };
}

/**
 * Sprint 6 Phase B2: create a single income or expense transaction. A
 * dedicated component (not a shared Create/Edit form) per this phase's
 * architecture constraints - edit is a different, not-yet-built phase.
 */
export function CreateTransactionDialog({
  open,
  workspaceId,
  accounts,
  categories,
  onClose,
  onCreated,
}: CreateTransactionDialogProps) {
  const [form, setForm] = useState<FormState>(buildDefaultForm);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const directionGroupName = useId();
  const expenseRadioId = useId();
  const incomeRadioId = useId();
  const amountInputId = useId();
  const dateInputId = useId();
  const descriptionInputId = useId();
  const accountSelectId = useId();
  const categorySelectId = useId();
  const notesInputId = useId();

  const wasOpenRef = useRef(open);
  const prevWorkspaceIdRef = useRef(workspaceId);

  const hasNoActiveAccounts = accounts.length === 0;

  // Reopening the dialog (a genuine closed->open transition, not the initial
  // mount) must never show a previous attempt's values or errors. setState
  // calls run inside a Promise callback (not synchronously in the effect
  // body) to satisfy react-hooks/set-state-in-effect, matching
  // CreateAccountDialog's established pattern.
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setForm(buildDefaultForm());
      setAmountError(null);
      setDateError(null);
      setDescriptionError(null);
      setAccountError(null);
      setNotesError(null);
      setFormError(null);
      setSubmitting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // The native <dialog> auto-focuses the first focusable descendant on
  // showModal(), which would otherwise be the header's close button.
  useEffect(() => {
    if (!open) return;
    document.getElementById(expenseRadioId)?.focus();
  }, [open, expenseRadioId]);

  // A workspace change while this dialog is open must close it - stale
  // account/category IDs selected against the previous workspace must never
  // survive into a submission against the new one. The next open (against
  // the new workspace) already resets via the effect above.
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== workspaceId) {
      prevWorkspaceIdRef.current = workspaceId;
      if (open) onClose();
    }
  }, [workspaceId, open, onClose]);

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || hasNoActiveAccounts) return;

    let hasError = false;

    const magnitude = parseAmountMagnitudeToMinorUnits(form.amount);
    if (magnitude === null) {
      setAmountError("Enter a valid amount, e.g. 42.50.");
      hasError = true;
    } else if (magnitude === 0) {
      // The parser itself accepts zero (it has no opinion on business
      // rules), but a zero-value transaction has no financial effect and
      // would create ambiguous history - rejected here as a UI validation
      // decision, mirroring the backend's own independent rejection of
      // amount_minor == 0 (see repositories/transaction.rs
      // validate_create_input) rather than inventing a new rule.
      setAmountError("Amount must be greater than zero.");
      hasError = true;
    } else {
      setAmountError(null);
    }

    if (!form.date) {
      setDateError("Date is required.");
      hasError = true;
    } else {
      setDateError(null);
    }

    const trimmedDescription = form.description.trim();
    if (!trimmedDescription) {
      setDescriptionError("Description is required.");
      hasError = true;
    } else if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setDescriptionError(
        `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
      );
      hasError = true;
    } else {
      setDescriptionError(null);
    }

    if (!form.accountId) {
      setAccountError("Account is required.");
      hasError = true;
    } else {
      setAccountError(null);
    }

    const trimmedNotes = form.notes.trim();
    if (trimmedNotes.length > MAX_NOTES_LENGTH) {
      setNotesError(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters.`);
      hasError = true;
    } else {
      setNotesError(null);
    }

    if (hasError || magnitude === null || magnitude === 0) return;

    setFormError(null);
    setSubmitting(true);

    const amountMinor = applyTransactionDirection(magnitude, form.direction);
    const accountId = Number(form.accountId);
    // categoryId's TS contract is `number | undefined` for create (unlike
    // update's later patch-style `number | null | undefined`) - Uncategorized
    // omits the argument entirely rather than sending null or "".
    const categoryId = form.categoryId ? Number(form.categoryId) : undefined;
    // notes' TS contract is likewise `string | undefined` for create, not
    // nullable - blank notes are omitted, not sent as explicit null. This is
    // a different contract from account editing's institution-clearing
    // semantics and is not reused here.
    const notes = trimmedNotes ? trimmedNotes : undefined;

    createTransaction(
      workspaceId,
      accountId,
      amountMinor,
      trimmedDescription,
      form.date,
      categoryId,
      notes,
    )
      .then((transaction) => {
        setForm(buildDefaultForm());
        onCreated(transaction);
      })
      .catch((err: unknown) => {
        setFormError(parseCommandError(err).message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  const accountOptions = accounts.map((account) => ({
    value: String(account.id),
    label: account.name,
  }));
  const categoryOptions = [
    { value: "", label: "Uncategorized" },
    ...categories.map((category) => ({
      value: String(category.id),
      label: category.name,
    })),
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New Transaction"
      preventClose={submitting}
    >
      <p className="mb-4 text-sm text-gray-600">
        Record an income or expense transaction for this workspace.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-gray-700">
            Direction
          </legend>
          <div className="flex gap-4">
            <label
              htmlFor={expenseRadioId}
              className="flex items-center gap-2 text-sm text-gray-900"
            >
              <input
                id={expenseRadioId}
                type="radio"
                name={directionGroupName}
                value="expense"
                checked={form.direction === "expense"}
                onChange={() =>
                  setForm((f) => ({ ...f, direction: "expense" }))
                }
                disabled={submitting}
              />
              Expense
            </label>
            <label
              htmlFor={incomeRadioId}
              className="flex items-center gap-2 text-sm text-gray-900"
            >
              <input
                id={incomeRadioId}
                type="radio"
                name={directionGroupName}
                value="income"
                checked={form.direction === "income"}
                onChange={() => setForm((f) => ({ ...f, direction: "income" }))}
                disabled={submitting}
              />
              Income
            </label>
          </div>
        </fieldset>

        <AmountInput
          id={amountInputId}
          label="Amount"
          value={form.amount}
          onChange={(value) => setForm((f) => ({ ...f, amount: value }))}
          error={amountError ?? undefined}
          disabled={submitting}
          required
        />

        <Input
          id={dateInputId}
          type="date"
          label="Date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          error={dateError ?? undefined}
          disabled={submitting}
          required
        />

        <Input
          id={descriptionInputId}
          label="Description"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          error={descriptionError ?? undefined}
          disabled={submitting}
          required
          autoComplete="off"
        />

        {hasNoActiveAccounts ? (
          <div>
            <p className="mb-1 block text-sm font-medium text-gray-700">
              Account
            </p>
            <p className="text-sm text-gray-600">
              An active account is required to record a transaction. Create or
              restore an account before recording one.
            </p>
          </div>
        ) : (
          <Select
            id={accountSelectId}
            label="Account"
            value={form.accountId}
            onChange={(e) =>
              setForm((f) => ({ ...f, accountId: e.target.value }))
            }
            options={accountOptions}
            placeholder="Select account"
            error={accountError ?? undefined}
            disabled={submitting}
            required
          />
        )}

        <Select
          id={categorySelectId}
          label="Category"
          value={form.categoryId}
          onChange={(e) =>
            setForm((f) => ({ ...f, categoryId: e.target.value }))
          }
          options={categoryOptions}
          disabled={submitting}
        />

        <Textarea
          id={notesInputId}
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          error={notesError ?? undefined}
          disabled={submitting}
        />

        {formError && <ErrorMessage message={formError} />}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={hasNoActiveAccounts}
          >
            Create Transaction
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
