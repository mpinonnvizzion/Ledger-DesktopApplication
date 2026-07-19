import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTransactionReferenceData } from "@/hooks/useTransactionReferenceData";
import { listTransactions } from "@/api/transactions";
import { parseCommandError } from "@/lib/errors";
import type { Transaction } from "@/types/domain";
import {
  accountDisplayLabel,
  amountDisplayClass,
  categoryDisplayLabel,
  directionFromAmount,
  directionLabel,
  formatSignedAmount,
  formatTransactionDate,
} from "@/lib/transactionHelpers";
import { PageLoadingState } from "@/components/ui/LoadingSpinner";
import { ErrorMessage, PageErrorState } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";

// Matches the backend's own DEFAULT_LIMIT (src-tauri/src/repositories/transaction.rs).
// Passed explicitly for clarity rather than relying on the backend default silently.
const PAGE_SIZE = 50;

/**
 * Sprint 6 Phase B1: read-only transaction history. Fetches the first page
 * of transactions in the backend's own `date DESC, id DESC` order (never
 * re-sorted client-side) and resolves account/category labels for display.
 * No create, edit, delete, filter, search, or pagination controls exist yet
 * - see docs/sprint-notes/sprint-6.md for the full phase plan.
 */
export default function Transactions() {
  const { currentWorkspaceId } = useWorkspace();
  const {
    accountsById,
    categoriesById,
    loading: referenceLoading,
    error: referenceError,
    retry: retryReferenceData,
  } = useTransactionReferenceData();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (currentWorkspaceId === null) {
      return;
    }

    let cancelled = false;

    // setTransactionsLoading/setTransactionsError reset happens inside a
    // Promise callback (not synchronously in the effect body) to satisfy
    // react-hooks/set-state-in-effect, matching the established pattern in
    // src/pages/Accounts.tsx and useTransactionReferenceData.
    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setTransactionsLoading(true);
        setTransactionsError(null);
        return listTransactions({
          workspaceId: currentWorkspaceId,
          limit: PAGE_SIZE,
        });
      })
      .then((result) => {
        if (cancelled || !result) return;
        // Preserved exactly as returned - the backend's `date DESC, id DESC`
        // ordering is never overridden client-side.
        setTransactions(result.transactions);
        setTotalCount(result.total_count);
      })
      .catch((err: unknown) => {
        if (!cancelled) setTransactionsError(parseCommandError(err).message);
      })
      .finally(() => {
        if (!cancelled) setTransactionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, retryToken]);

  // Retry reloads both transaction data and reference data, regardless of
  // which one failed - see "Partial reference failure" below.
  function handleRetry() {
    setRetryToken((token) => token + 1);
    retryReferenceData();
  }

  const loading = transactionsLoading || referenceLoading;

  // A transaction-fetch failure blocks the whole page: there is no
  // meaningful table to show without transaction data. A reference-data
  // failure with transactions already loaded is treated as non-blocking -
  // the table still renders using the deterministic "Unknown
  // account"/"Uncategorized" fallbacks already built into
  // accountDisplayLabel/categoryDisplayLabel, with a non-destructive
  // warning banner above it rather than replacing the page. See
  // docs/sprint-notes/sprint-6.md's Phase B1 notes for the rationale.
  const blockingError = transactionsError;
  const showReferenceWarning =
    !loading && !blockingError && referenceError !== null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-gray-900">Transactions</h2>
        <p className="mt-1 text-sm text-gray-600">
          Review income and expenses across your accounts. Transaction entry is
          being built next — this page cannot yet create, edit, or delete
          transactions.
        </p>
      </header>

      {loading && <PageLoadingState label="Loading transactions…" />}

      {!loading && blockingError && (
        <PageErrorState message={blockingError} onRetry={handleRetry} />
      )}

      {!loading && !blockingError && (
        <>
          {showReferenceWarning && (
            <ErrorMessage
              message={`Account and category names could not be fully loaded, so some may show as placeholders: ${referenceError}`}
              onRetry={handleRetry}
            />
          )}

          {transactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Recorded transactions will appear here once transaction entry is available."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <caption className="sr-only">
                    Transactions, newest first
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
                      >
                        Account
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
                      >
                        Category
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-medium tracking-wide text-gray-500 uppercase"
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((transaction) => {
                      const direction = directionFromAmount(
                        transaction.amount_minor,
                      );
                      const account = accountsById.get(transaction.account_id);
                      const category =
                        transaction.category_id !== null
                          ? categoriesById.get(transaction.category_id)
                          : null;

                      return (
                        <tr key={transaction.id}>
                          <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                            {formatTransactionDate(transaction.date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {transaction.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {accountDisplayLabel(account)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {categoryDisplayLabel(category)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {directionLabel(direction)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right text-sm tabular-nums ${amountDisplayClass(transaction.amount_minor)}`}
                          >
                            {`$${formatSignedAmount(transaction.amount_minor)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalCount > transactions.length && (
                <p className="text-xs text-gray-500">
                  Showing the {transactions.length} most recent of {totalCount}{" "}
                  transactions.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
