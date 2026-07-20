import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteTransaction } from "@/api/transactions";
import { parseCommandError } from "@/lib/errors";
import {
  accountDisplayLabel,
  amountDisplayClass,
  directionFromAmount,
  directionLabel,
  formatSignedAmount,
  formatTransactionDate,
} from "@/lib/transactionHelpers";
import type { Account, Transaction } from "@/types/domain";

interface DeleteTransactionDialogProps {
  open: boolean;
  workspaceId: number;
  /** The transaction being deleted. `null` means either nothing is selected
   * yet or the previously selected transaction is no longer present in the
   * latest fetched page (e.g. after a refetch) - the dialog closes itself
   * safely in that case rather than confirming deletion of nothing. */
  transaction: Transaction | null;
  /** Unfiltered account lookup (includes archived accounts) - the same
   * historical-lookup map the read-only table uses, so an archived
   * account's name still resolves in the confirmation summary. */
  accountsById: Map<number, Account>;
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * Sprint 6 Phase B4: permanently delete a single transaction, with explicit
 * confirmation. Built on the existing `ConfirmDialog` primitive (extended
 * with an optional `children` slot for this dialog's transaction summary)
 * rather than a new bespoke dialog shell, matching the destructive-action
 * convention already established by Accounts' archive confirmation.
 */
export function DeleteTransactionDialog({
  open,
  workspaceId,
  transaction,
  accountsById,
  onClose,
  onDeleted,
}: DeleteTransactionDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wasOpenRef = useRef(open);
  const prevWorkspaceIdRef = useRef(workspaceId);

  // Reopening (a genuine closed->open transition) must clear any stale
  // error/deleting state from a previous attempt, whether on this
  // transaction or a different one. setState calls run inside a Promise
  // callback (not synchronously in the effect body) to satisfy
  // react-hooks/set-state-in-effect, matching the established pattern.
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setDeleting(false);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // A workspace change while this dialog is open must close it - a stale
  // transaction id from the previous workspace must never be deleted
  // against the new one.
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== workspaceId) {
      prevWorkspaceIdRef.current = workspaceId;
      if (open) onClose();
    }
  }, [workspaceId, open, onClose]);

  // If the selected transaction disappears from the latest fetched page
  // (Transactions.tsx re-derives `transaction` from its current list on
  // every render), close safely rather than confirming deletion of a
  // transaction that no longer exists.
  useEffect(() => {
    if (open && transaction === null) {
      onClose();
    }
  }, [open, transaction, onClose]);

  function handleClose() {
    if (deleting) return;
    onClose();
  }

  function handleConfirm() {
    if (deleting || !transaction) return;

    setError(null);
    setDeleting(true);

    deleteTransaction(transaction.id)
      .then(() => {
        onDeleted();
      })
      .catch((err: unknown) => {
        setError(parseCommandError(err).message);
      })
      .finally(() => {
        setDeleting(false);
      });
  }

  const direction = transaction
    ? directionFromAmount(transaction.amount_minor)
    : null;
  const account = transaction
    ? (accountsById.get(transaction.account_id) ?? null)
    : null;

  return (
    <ConfirmDialog
      open={open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Delete transaction?"
      message="You are about to permanently delete this transaction. This cannot be undone."
      confirmLabel="Delete Transaction"
      cancelLabel="Cancel"
      destructive
      loading={deleting}
      error={error ?? undefined}
    >
      {transaction && (
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Description</dt>
            <dd className="text-right font-medium text-gray-900">
              {transaction.description}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Amount</dt>
            <dd
              className={`text-right font-medium tabular-nums ${amountDisplayClass(transaction.amount_minor)}`}
            >
              {`$${formatSignedAmount(transaction.amount_minor)}`}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Type</dt>
            <dd className="text-right font-medium text-gray-900">
              {direction ? directionLabel(direction) : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Account</dt>
            <dd className="text-right font-medium text-gray-900">
              {accountDisplayLabel(account)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Date</dt>
            <dd className="text-right font-medium text-gray-900">
              {formatTransactionDate(transaction.date)}
            </dd>
          </div>
        </dl>
      )}
    </ConfirmDialog>
  );
}
