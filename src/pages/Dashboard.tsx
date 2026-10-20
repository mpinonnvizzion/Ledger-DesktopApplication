import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { listAccountsByWorkspace } from "@/api/accounts";
import { listCategoriesByWorkspace } from "@/api/categories";
import { listTransactions, getTransactionSummary } from "@/api/transactions";
import { parseCommandError } from "@/lib/errors";
import { formatAmount } from "@/lib/format";
import type { Account, Category, Transaction } from "@/types/domain";
import {
  accountDisplayLabel,
  amountDisplayClass,
  categoryDisplayLabel,
  formatSignedAmount,
  formatTransactionDate,
} from "@/lib/transactionHelpers";
import { PageLoadingState } from "@/components/ui/LoadingSpinner";
import { PageErrorState } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";

const RECENT_TRANSACTIONS_LIMIT = 10;

const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function currentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${day}`,
  };
}

function currentMonthLabel(): string {
  const now = new Date();
  return `${FULL_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

export default function Dashboard() {
  const { currentWorkspaceId } = useWorkspace();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [summaryIncome, setSummaryIncome] = useState(0);
  const [summaryExpense, setSummaryExpense] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );

  const [accountsById, setAccountsById] = useState<Map<number, Account>>(
    new Map(),
  );
  const [categoriesById, setCategoriesById] = useState<Map<number, Category>>(
    new Map(),
  );

  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (currentWorkspaceId === null) return;

    let cancelled = false;
    const { dateFrom, dateTo } = currentMonthRange();

    Promise.resolve().then(() => {
      if (cancelled) return;

      setAccountsLoading(true);
      setAccountsError(null);
      setAccountsLoaded(false);
      listAccountsByWorkspace(currentWorkspaceId)
        .then((list) => {
          if (cancelled) return;
          setAccounts(list);
          setAccountsLoaded(true);
          setAccountsById(new Map(list.map((a) => [a.id, a])));
        })
        .catch((err: unknown) => {
          if (!cancelled) setAccountsError(parseCommandError(err).message);
        })
        .finally(() => {
          if (!cancelled) setAccountsLoading(false);
        });

      setSummaryLoading(true);
      setSummaryError(null);
      getTransactionSummary(currentWorkspaceId, dateFrom, dateTo)
        .then((summary) => {
          if (cancelled) return;
          setSummaryIncome(summary.income_minor);
          setSummaryExpense(summary.expense_minor);
        })
        .catch((err: unknown) => {
          if (!cancelled) setSummaryError(parseCommandError(err).message);
        })
        .finally(() => {
          if (!cancelled) setSummaryLoading(false);
        });

      setTransactionsLoading(true);
      setTransactionsError(null);
      Promise.all([
        listTransactions({
          workspaceId: currentWorkspaceId,
          limit: RECENT_TRANSACTIONS_LIMIT,
        }),
        listCategoriesByWorkspace(currentWorkspaceId),
      ])
        .then(([result, categoryList]) => {
          if (cancelled) return;
          setTransactions(result.transactions);
          setCategoriesById(new Map(categoryList.map((c) => [c.id, c])));
        })
        .catch((err: unknown) => {
          if (!cancelled) setTransactionsError(parseCommandError(err).message);
        })
        .finally(() => {
          if (!cancelled) setTransactionsLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, retryToken]);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.is_active),
    [accounts],
  );
  const totalBalance = useMemo(
    () => activeAccounts.reduce((sum, a) => sum + a.balance, 0),
    [activeAccounts],
  );

  function handleRetry() {
    setRetryToken((t) => t + 1);
  }

  const allLoading = accountsLoading && summaryLoading && transactionsLoading;
  const allFailed = accountsError && summaryError && transactionsError;
  const hasNoAccounts =
    !accountsLoading &&
    !accountsError &&
    accountsLoaded &&
    accounts.length === 0;

  if (allLoading) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <PageLoadingState label="Loading dashboard…" />
      </div>
    );
  }

  if (allFailed) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <PageErrorState message={accountsError} onRetry={handleRetry} />
      </div>
    );
  }

  if (hasNoAccounts) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <EmptyState
          title="Welcome to Ledger"
          description="Create your first account to start tracking your finances."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {accountsError ? (
          <Card>
            <p className="text-sm text-gray-500">Total Balance</p>
            <p className="mt-1 text-sm text-red-600">Failed to load</p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-gray-500">Total Balance</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
              {accountsLoading ? "…" : `$${formatAmount(totalBalance)}`}
            </p>
          </Card>
        )}

        {accountsError ? (
          <Card>
            <p className="text-sm text-gray-500">Active Accounts</p>
            <p className="mt-1 text-sm text-red-600">Failed to load</p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-gray-500">Active Accounts</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {accountsLoading ? "…" : activeAccounts.length}
            </p>
          </Card>
        )}

        {summaryError ? (
          <Card>
            <p className="text-sm text-gray-500">Monthly Income</p>
            <p className="mt-1 text-sm text-red-600">Failed to load</p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-gray-500">Monthly Income</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-green-700">
              {summaryLoading ? "…" : `$${formatAmount(summaryIncome)}`}
            </p>
          </Card>
        )}

        {summaryError ? (
          <Card>
            <p className="text-sm text-gray-500">Monthly Expenses</p>
            <p className="mt-1 text-sm text-red-600">Failed to load</p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-gray-500">Monthly Expenses</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-red-700">
              {summaryLoading
                ? "…"
                : `$${formatAmount(Math.abs(summaryExpense))}`}
            </p>
          </Card>
        )}
      </div>

      <section>
        <h3 className="text-lg font-medium text-gray-900">
          Recent Transactions
        </h3>

        {transactionsLoading && (
          <p className="mt-3 text-sm text-gray-500">Loading transactions…</p>
        )}

        {!transactionsLoading && transactionsError && (
          <PageErrorState message={transactionsError} onRetry={handleRetry} />
        )}

        {!transactionsLoading &&
          !transactionsError &&
          transactions.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">No transactions yet.</p>
          )}

        {!transactionsLoading &&
          !transactionsError &&
          transactions.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <caption className="sr-only">
                  Recent transactions, newest first
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
                      className="px-4 py-3 text-right text-xs font-medium tracking-wide text-gray-500 uppercase"
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t) => {
                    const account = accountsById.get(t.account_id);
                    const category =
                      t.category_id !== null
                        ? categoriesById.get(t.category_id)
                        : null;

                    return (
                      <tr key={t.id}>
                        <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                          {formatTransactionDate(t.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {t.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {accountDisplayLabel(account)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {categoryDisplayLabel(category)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right text-sm tabular-nums ${amountDisplayClass(t.amount_minor)}`}
                        >
                          {`$${formatSignedAmount(t.amount_minor)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </div>
  );
}

function DashboardHeader() {
  return (
    <header>
      <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
      <p className="mt-1 text-sm text-gray-600">
        Your financial overview for {currentMonthLabel()}.
      </p>
    </header>
  );
}
