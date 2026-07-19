import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { listAccountsByWorkspace } from "@/api/accounts";
import { listCategoriesByWorkspace } from "@/api/categories";
import { parseCommandError } from "@/lib/errors";
import type { Account, Category } from "@/types/domain";

interface TransactionReferenceData {
  accounts: Account[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Loads the account and category reference data that later transaction
 * forms (Phase B2+) will need for their selectors, scoped to the current
 * workspace. This hook does not fetch or expose any transaction data itself
 * - it exists only for the two reference lists a transaction form depends
 * on.
 *
 * Accounts: `list_accounts_by_workspace` returns rows `ORDER BY id`
 * (insertion order), not name, so this hook re-sorts them alphabetically
 * client-side for a predictable selector - the same reasoning already
 * applied to the Accounts page's own list. Archived accounts are excluded
 * per Product Decision 5 in docs/sprint-notes/sprint-6.md: a user archives
 * an account to signal "I'm done actively using this," so it should not be
 * offered as a destination for a brand-new transaction. (An existing
 * transaction already on an archived account must still display it in
 * Phase B1's list/edit views - that is a Phase B concern, not this hook's,
 * since this hook only serves the "eligible for a new/edited selection"
 * list.)
 *
 * Categories: `list_categories_by_workspace` already returns rows
 * `ORDER BY category_type, name` from the backend - deterministic and
 * already grouped by type, matching Product Decision 4's "grouped visually
 * by Income/Expense" requirement. That order is passed through unchanged
 * rather than re-sorted, per the "never override backend ordering"
 * architecture constraint. Categories have no `is_active`/archival concept
 * at all (confirmed against `src-tauri/src/models/category.rs`), so there
 * is nothing to filter out.
 */
export function useTransactionReferenceData(): TransactionReferenceData {
  const { currentWorkspaceId } = useWorkspace();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (currentWorkspaceId === null) {
      return;
    }

    let cancelled = false;

    // setLoading/setError reset happens inside a Promise callback (not
    // synchronously in the effect body) to satisfy react-hooks/set-state-in-effect,
    // matching the established pattern in src/pages/Accounts.tsx.
    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setLoading(true);
        setError(null);
        return Promise.all([
          listAccountsByWorkspace(currentWorkspaceId),
          listCategoriesByWorkspace(currentWorkspaceId),
        ]);
      })
      .then((result) => {
        if (cancelled || !result) return;
        const [accountList, categoryList] = result;
        const activeAccountsSorted = accountList
          .filter((account) => account.is_active)
          .sort((a, b) => a.name.localeCompare(b.name));
        setAccounts(activeAccountsSorted);
        setCategories(categoryList);
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

  function retry() {
    setRetryToken((token) => token + 1);
  }

  return { accounts, categories, loading, error, retry };
}
