import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { listAccountsByWorkspace } from "@/api/accounts";
import type { Account, AccountType } from "@/types/domain";
import { formatAmount } from "@/lib/format";
import { parseCommandError } from "@/lib/errors";
import { PageLoadingState } from "@/components/ui/LoadingSpinner";
import { PageErrorState } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  cash: "Cash",
  investment: "Investment",
  loan: "Loan",
  other: "Other",
};

function formatAccountType(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type];
}

// Active accounts first, then archived; alphabetical by name within each group.
// The backend does not guarantee this ordering, so it's applied client-side.
function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => {
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export default function Accounts() {
  const { currentWorkspaceId } = useWorkspace();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (currentWorkspaceId === null) {
      return;
    }

    let cancelled = false;

    // setLoading/setError reset happens inside a Promise callback (not
    // synchronously in the effect body) to satisfy react-hooks/set-state-in-effect.
    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setLoading(true);
        setError(null);
        return listAccountsByWorkspace(currentWorkspaceId);
      })
      .then((list) => {
        if (!cancelled && list) setAccounts(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(parseCommandError(err).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, retryToken]);

  const sortedAccounts = useMemo(() => sortAccounts(accounts), [accounts]);
  const activeAccounts = useMemo(
    () => sortedAccounts.filter((account) => account.is_active),
    [sortedAccounts],
  );
  const archivedCount = sortedAccounts.length - activeAccounts.length;
  const totalActiveBalance = useMemo(
    () => activeAccounts.reduce((sum, account) => sum + account.balance, 0),
    [activeAccounts],
  );

  function handleRetry() {
    setRetryToken((token) => token + 1);
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-gray-900">Accounts</h2>
        <p className="mt-1 text-sm text-gray-600">
          A read-only view of your accounts and balances.
        </p>
      </header>

      {loading && <PageLoadingState label="Loading accounts…" />}

      {!loading && error && (
        <PageErrorState message={error} onRetry={handleRetry} />
      )}

      {!loading && !error && sortedAccounts.length === 0 && (
        <EmptyState
          title="No accounts yet"
          description="Account creation is coming in a future update."
        />
      )}

      {!loading && !error && sortedAccounts.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-gray-500">Total Balance (Active)</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {`$${formatAmount(totalActiveBalance)}`}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Active Accounts</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {activeAccounts.length}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Archived Accounts</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {archivedCount}
              </p>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <caption className="sr-only">
                Accounts, with active accounts listed first and archived
                accounts last, alphabetically by name within each group
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Account
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Balance
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedAccounts.map((account) => {
                  const textClass = account.is_active
                    ? "text-gray-900"
                    : "text-gray-400";
                  return (
                    <tr
                      key={account.id}
                      className={account.is_active ? undefined : "bg-gray-50"}
                    >
                      <td className="px-4 py-3 text-sm">
                        <div className={`font-medium ${textClass}`}>
                          {account.name}
                        </div>
                        {account.institution_name && (
                          <div
                            className={`text-xs ${
                              account.is_active
                                ? "text-gray-500"
                                : "text-gray-400"
                            }`}
                          >
                            {account.institution_name}
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm ${textClass}`}>
                        {formatAccountType(account.account_type)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-sm tabular-nums ${textClass}`}
                      >
                        {`$${formatAmount(account.balance)}`}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {account.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Archived</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
