import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { AmountInput } from "@/components/ui/AmountInput";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { updateTransaction } from "@/api/transactions";
import { parseCommandError } from "@/lib/errors";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
  applyTransactionDirection,
  directionFromAmount,
  formatMinorUnits,
  parseAmountMagnitudeToMinorUnits,
} from "@/lib/transactionHelpers";
import type { Account, Category, Direction, Transaction } from "@/types/domain";

interface EditTransactionDialogProps {
  open: boolean;
  workspaceId: number;
  /** The transaction being edited. `null` means either nothing is selected
   * yet or the previously selected transaction is no longer present in the
   * latest fetched page (e.g. after a refetch) - the dialog closes itself
   * safely in that case rather than rendering a stale/blank form. */
  transaction: Transaction | null;
  /** Active accounts only (Product Decision 5) - the same selector list
   * `useTransactionReferenceData` exposes for new selections. */
  accounts: Account[];
  /** All workspace categories, in the backend's own `category_type, name`
   * order - preserved as-is per Product Decision 4. */
  categories: Category[];
  /** Unfiltered account lookup (includes archived accounts) - used only to
   * resolve whether the transaction's *current* account is archived, so it
   * can still be shown (and kept, without forcing a change) as an option.
   * Kept structurally separate from `accounts` per the architecture
   * constraint of not mixing selector data with historical lookup data. */
  accountsById: Map<number, Account>;
  onClose: () => void;
  onUpdated: (transaction: Transaction) => void;
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

const EMPTY_FORM: FormState = {
  direction: "expense",
  amount: "",
  date: "",
  description: "",
  accountId: "",
  categoryId: "",
  notes: "",
};

function formFromTransaction(transaction: Transaction): FormState {
  return {
    direction: directionFromAmount(transaction.amount_minor),
    amount: formatMinorUnits(Math.abs(transaction.amount_minor)),
    date: transaction.date,
    description: transaction.description,
    accountId: String(transaction.account_id),
    categoryId:
      transaction.category_id !== null ? String(transaction.category_id) : "",
    notes: transaction.notes ?? "",
  };
}

/**
 * Sprint 6 Phase B3: edit an existing transaction. A dedicated component,
 * not a shared Create/Edit form - see this phase's sprint notes for why
 * extraction was rejected (the two dialogs' semantics have already
 * diverged: three-state category/notes clearing, change detection, and
 * archived-current-account handling exist only here).
 */
export function EditTransactionDialog({
  open,
  workspaceId,
  transaction,
  accounts,
  categories,
  accountsById,
  onClose,
  onUpdated,
}: EditTransactionDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    transaction ? formFromTransaction(transaction) : EMPTY_FORM,
  );
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
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

  // Reopening (a genuine closed->open transition) must populate the form
  // from the currently selected transaction and clear any stale errors from
  // a previous edit, whether of this transaction or a different one.
  // setState calls run inside a Promise callback (not synchronously in the
  // effect body) to satisfy react-hooks/set-state-in-effect, matching
  // EditAccountDialog's established pattern exactly.
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen || !transaction) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setForm(formFromTransaction(transaction));
      setAmountError(null);
      setDateError(null);
      setDescriptionError(null);
      setNotesError(null);
      setFormError(null);
      setSubmitting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, transaction]);

  // The native <dialog> auto-focuses the first focusable descendant on
  // showModal(), which would otherwise be the header's close button.
  useEffect(() => {
    if (!open) return;
    document.getElementById(expenseRadioId)?.focus();
  }, [open, expenseRadioId]);

  // A workspace change while this dialog is open must close it - stale
  // account/category IDs selected against the previous workspace must never
  // survive into a submission against the new one.
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== workspaceId) {
      prevWorkspaceIdRef.current = workspaceId;
      if (open) onClose();
    }
  }, [workspaceId, open, onClose]);

  // If the selected transaction disappears from the latest fetched page
  // (Transactions.tsx re-derives `transaction` from its current list on
  // every render), close safely rather than rendering a dialog bound to
  // nothing.
  useEffect(() => {
    if (open && transaction === null) {
      onClose();
    }
  }, [open, transaction, onClose]);

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  // Archived accounts are excluded from `accounts` (Product Decision 5),
  // but the transaction's own current account must still be shown and kept
  // selected without forcing a change - the backend itself places no
  // is_active restriction on the account a transaction may reference (see
  // TransactionRepository::update, which validates only workspace
  // membership when the account_id actually changes).
  const currentAccount = transaction
    ? (accountsById.get(transaction.account_id) ?? null)
    : null;
  const currentAccountIsArchived =
    currentAccount !== null && !currentAccount.is_active;
  const accountOptions = [
    ...(currentAccountIsArchived && currentAccount
      ? [
          {
            value: String(currentAccount.id),
            label: `${currentAccount.name} (Archived)`,
          },
        ]
      : []),
    ...accounts.map((account) => ({
      value: String(account.id),
      label: account.name,
    })),
  ];
  const categoryOptions = [
    { value: "", label: "Uncategorized" },
    ...categories.map((category) => ({
      value: String(category.id),
      label: category.name,
    })),
  ];

  // Normalized current-form values, computed on every render (not only on
  // submit) so the Save button can react live - and reused verbatim inside
  // handleSubmit to build the payload, so change detection and submission
  // can never drift apart.
  const magnitude = parseAmountMagnitudeToMinorUnits(form.amount);
  const isAmountValid = magnitude !== null && magnitude !== 0;
  const signedAmount = isAmountValid
    ? applyTransactionDirection(magnitude, form.direction)
    : null;
  const trimmedDescription = form.description.trim();
  const isDescriptionValid =
    trimmedDescription.length > 0 &&
    trimmedDescription.length <= MAX_DESCRIPTION_LENGTH;
  const trimmedNotes = form.notes.trim();
  const isNotesValid = trimmedNotes.length <= MAX_NOTES_LENGTH;
  const isDateValid = form.date !== "";
  const isAccountValid = form.accountId !== "";
  const isFormValid =
    isAmountValid &&
    isDescriptionValid &&
    isNotesValid &&
    isDateValid &&
    isAccountValid;

  const normalizedAccountId = isAccountValid ? Number(form.accountId) : null;
  const normalizedCategoryId = form.categoryId ? Number(form.categoryId) : null;
  const normalizedNotes = trimmedNotes ? trimmedNotes : null;

  const hasChanges =
    transaction !== null &&
    isFormValid &&
    (normalizedAccountId !== transaction.account_id ||
      signedAmount !== transaction.amount_minor ||
      trimmedDescription !== transaction.description ||
      form.date !== transaction.date ||
      normalizedCategoryId !== (transaction.category_id ?? null) ||
      normalizedNotes !== (transaction.notes ? transaction.notes : null));

  const canSave = isFormValid && hasChanges && !submitting;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !transaction) return;

    let hasError = false;

    if (magnitude === null) {
      setAmountError("Enter a valid amount, e.g. 42.50.");
      hasError = true;
    } else if (magnitude === 0) {
      setAmountError("Amount must be greater than zero.");
      hasError = true;
    } else {
      setAmountError(null);
    }

    if (!isDateValid) {
      setDateError("Date is required.");
      hasError = true;
    } else {
      setDateError(null);
    }

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

    if (trimmedNotes.length > MAX_NOTES_LENGTH) {
      setNotesError(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters.`);
      hasError = true;
    } else {
      setNotesError(null);
    }

    if (hasError || !isFormValid || !hasChanges || signedAmount === null) {
      return;
    }

    setFormError(null);
    setSubmitting(true);

    // Only fields that actually differ from the transaction's current
    // values are included - `updateTransaction` treats an omitted
    // (undefined) argument as "leave unchanged." category_id/notes use the
    // verified three-state contract (undefined = unchanged, null = clear,
    // value = set) rather than create's two-state contract.
    const accountId =
      normalizedAccountId !== transaction.account_id
        ? normalizedAccountId!
        : undefined;
    const amountMinor =
      signedAmount !== transaction.amount_minor ? signedAmount : undefined;
    const description =
      trimmedDescription !== transaction.description
        ? trimmedDescription
        : undefined;
    const date = form.date !== transaction.date ? form.date : undefined;
    const categoryId =
      normalizedCategoryId !== (transaction.category_id ?? null)
        ? normalizedCategoryId
        : undefined;
    const notes =
      normalizedNotes !== (transaction.notes ? transaction.notes : null)
        ? normalizedNotes
        : undefined;

    updateTransaction(
      transaction.id,
      accountId,
      categoryId,
      amountMinor,
      description,
      date,
      notes,
    )
      .then((updated) => {
        onUpdated(updated);
      })
      .catch((err: unknown) => {
        setFormError(parseCommandError(err).message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Edit Transaction"
      preventClose={submitting}
    >
      {transaction && (
        <>
          <p className="mb-4 text-sm text-gray-600">
            Update this transaction&rsquo;s details.
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
                    onChange={() =>
                      setForm((f) => ({ ...f, direction: "income" }))
                    }
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

            <Select
              id={accountSelectId}
              label="Account"
              value={form.accountId}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountId: e.target.value }))
              }
              options={accountOptions}
              disabled={submitting}
              required
            />
            {currentAccountIsArchived && (
              <p className="-mt-3 text-xs text-gray-500">
                The current account is archived. You may keep it or choose an
                active account.
              </p>
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
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
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
              <Button type="submit" loading={submitting} disabled={!canSave}>
                Save Changes
              </Button>
            </div>
          </form>
        </>
      )}
    </Dialog>
  );
}
