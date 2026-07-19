import { useTransactionReferenceData } from "@/hooks/useTransactionReferenceData";
import { PageLoadingState } from "@/components/ui/LoadingSpinner";
import { PageErrorState } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Sprint 6 Phase A shell. Loads the account/category reference data that
 * later phases' forms will need (see `useTransactionReferenceData`), but
 * does not fetch, display, create, edit, delete, filter, search, or
 * paginate any transaction. That is Phase B1 onward - see
 * docs/sprint-notes/sprint-6.md.
 */
export default function Transactions() {
  const { loading, error, retry } = useTransactionReferenceData();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-gray-900">Transactions</h2>
        <p className="mt-1 text-sm text-gray-600">
          Record and review income and expenses across your accounts.
          Transaction entry is being built next — this page cannot yet create,
          edit, or delete transactions.
        </p>
      </header>

      {loading && (
        <PageLoadingState label="Loading account and category data…" />
      )}

      {!loading && error && <PageErrorState message={error} onRetry={retry} />}

      {!loading && !error && (
        <EmptyState
          title="No transactions yet"
          description="Transaction tracking is coming in a future update."
        />
      )}
    </div>
  );
}
