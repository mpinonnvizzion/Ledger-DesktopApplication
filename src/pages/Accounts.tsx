import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { listAccountsByWorkspace, updateAccount } from "@/api/accounts";
import type { Account } from "@/types/domain";
import { formatAmount } from "@/lib/format";
import { parseCommandError } from "@/lib/errors";
import { formatAccountType } from "@/lib/accountTypes";
import { PageLoadingState } from "@/components/ui/LoadingSpinner";
import { ErrorMessage, PageErrorState } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateAccountDialog } from "@/components/accounts/CreateAccountDialog";
import { EditAccountDialog } from "@/components/accounts/EditAccountDialog";

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Account | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [restoringIds, setRestoringIds] = useState<Set<number>>(new Set());
  const [restoreError, setRestoreError] = useState<string | null>(null);

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

  function handleAccountCreated() {
    setShowCreateDialog(false);
    setRetryToken((token) => token + 1);
  }

  function handleEditClick(account: Account) {
    setEditingAccount(account);
    setShowEditDialog(true);
  }

  function handleEditClose() {
    setShowEditDialog(false);
  }

  function handleAccountUpdated() {
    setShowEditDialog(false);
    setRetryToken((token) => token + 1);
  }

  function handleArchiveClick(account: Account) {
    setArchiveTarget(account);
    setArchiveError(null);
  }

  function handleArchiveCancel() {
    if (archiving) return;
    setArchiveTarget(null);
    setArchiveError(null);
  }

  function handleArchiveConfirm() {
    if (archiving || !archiveTarget) return;

    setArchiveError(null);
    setArchiving(true);

    updateAccount(archiveTarget.id, undefined, undefined, false)
      .then(() => {
        setArchiveTarget(null);
        setRetryToken((token) => token + 1);
      })
      .catch((err: unknown) => {
        setArchiveError(parseCommandError(err).message);
      })
      .finally(() => {
        setArchiving(false);
      });
  }

  function handleRestoreClick(account: Account) {
    if (restoringIds.has(account.id)) return;

    setRestoreError(null);
    setRestoringIds((ids) => new Set(ids).add(account.id));

    updateAccount(account.id, undefined, undefined, true)
      .then(() => {
        setRetryToken((token) => token + 1);
      })
      .catch((err: unknown) => {
        setRestoreError(parseCommandError(err).message);
      })
      .finally(() => {
        setRestoringIds((ids) => {
          const next = new Set(ids);
          next.delete(account.id);
          return next;
        });
      });
  }

  // Only the initial fetch (no accounts rendered yet) shows the full-page
  // spinner; a post-create refresh must not replace an already-visible table.
  const showFullPageLoading = loading && accounts.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Accounts</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your financial accounts and balances.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>New Account</Button>
      </header>

      {showFullPageLoading && <PageLoadingState label="Loading accounts…" />}

      {!showFullPageLoading && error && (
        <PageErrorState message={error} onRetry={handleRetry} />
      )}

      {!showFullPageLoading && !error && sortedAccounts.length === 0 && (
        <EmptyState
          title="No accounts yet"
          description="Add your first financial account to begin tracking balances and transactions."
          action={{
            label: "New Account",
            onClick: () => setShowCreateDialog(true),
          }}
        />
      )}

      {!showFullPageLoading && !error && restoreError && (
        <ErrorMessage message={restoreError} />
      )}

      {!showFullPageLoading && !error && sortedAccounts.length > 0 && (
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
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Actions
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
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditClick(account)}
                            aria-label={`Edit ${account.name}`}
                          >
                            Edit
                          </Button>
                          {account.is_active ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleArchiveClick(account)}
                              aria-label={`Archive ${account.name}`}
                            >
                              Archive
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRestoreClick(account)}
                              loading={restoringIds.has(account.id)}
                              aria-label={`Restore ${account.name}`}
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {currentWorkspaceId !== null && (
        <CreateAccountDialog
          open={showCreateDialog}
          workspaceId={currentWorkspaceId}
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleAccountCreated}
        />
      )}

      {currentWorkspaceId !== null && (
        <EditAccountDialog
          open={showEditDialog}
          account={editingAccount}
          onClose={handleEditClose}
          onUpdated={handleAccountUpdated}
        />
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={handleArchiveCancel}
        onConfirm={handleArchiveConfirm}
        title="Archive account?"
        message={`Archive "${archiveTarget?.name ?? ""}"? The account and its history will remain in Ledger, and you can restore it at any time.`}
        confirmLabel="Archive Account"
        cancelLabel="Cancel"
        loading={archiving}
        error={archiveError ?? undefined}
      />
    </div>
  );
}
