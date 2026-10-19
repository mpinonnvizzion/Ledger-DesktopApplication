import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { listCategoriesByWorkspace, deleteCategory } from "@/api/categories";
import { listTransactions } from "@/api/transactions";
import type { Category } from "@/types/domain";
import { parseCommandError } from "@/lib/errors";
import { PageLoadingState } from "@/components/ui/LoadingSpinner";
import { PageErrorState } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateCategoryDialog } from "@/components/categories/CreateCategoryDialog";
import { EditCategoryDialog } from "@/components/categories/EditCategoryDialog";

export default function Categories() {
  const { currentWorkspaceId } = useWorkspace();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteTransactionCount, setDeleteTransactionCount] = useState<
    number | null
  >(null);
  const [deleteCountLoading, setDeleteCountLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspaceId === null) return;

    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setLoading(true);
        setError(null);
        return listCategoriesByWorkspace(currentWorkspaceId);
      })
      .then((list) => {
        if (!cancelled && list) setCategories(list);
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

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.category_type === "income"),
    [categories],
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.category_type === "expense"),
    [categories],
  );

  function handleRetry() {
    setRetryToken((t) => t + 1);
  }

  function handleCategoryCreated() {
    setShowCreateDialog(false);
    setRetryToken((t) => t + 1);
  }

  function handleEditClick(category: Category) {
    setEditingCategory(category);
    setShowEditDialog(true);
  }

  function handleEditClose() {
    setShowEditDialog(false);
  }

  function handleCategoryUpdated() {
    setShowEditDialog(false);
    setRetryToken((t) => t + 1);
  }

  function handleDeleteClick(category: Category) {
    setDeleteTarget(category);
    setDeleteError(null);
    setDeleteTransactionCount(null);
    setDeleteCountLoading(true);

    if (currentWorkspaceId === null) return;

    listTransactions({
      workspaceId: currentWorkspaceId,
      categoryId: category.id,
      limit: 1,
    })
      .then((result) => {
        setDeleteTransactionCount(result.total_count);
      })
      .catch(() => {
        setDeleteTransactionCount(null);
      })
      .finally(() => {
        setDeleteCountLoading(false);
      });
  }

  function handleDeleteCancel() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  function handleDeleteConfirm() {
    if (deleting || !deleteTarget) return;

    setDeleteError(null);
    setDeleting(true);

    deleteCategory(deleteTarget.id)
      .then(() => {
        setDeleteTarget(null);
        setRetryToken((t) => t + 1);
      })
      .catch((err: unknown) => {
        setDeleteError(parseCommandError(err).message);
      })
      .finally(() => {
        setDeleting(false);
      });
  }

  function deleteMessage(): string {
    if (!deleteTarget) return "";
    if (deleteCountLoading) return "Checking for affected transactions…";
    if (deleteTransactionCount === null)
      return `Delete "${deleteTarget.name}"? This cannot be undone.`;
    if (deleteTransactionCount === 0)
      return `Delete "${deleteTarget.name}"? No transactions use this category. This cannot be undone.`;
    return `Delete "${deleteTarget.name}"? ${deleteTransactionCount} transaction${deleteTransactionCount === 1 ? "" : "s"} will become uncategorized. This cannot be undone.`;
  }

  const showFullPageLoading = loading && categories.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Categories</h2>
          <p className="mt-1 text-sm text-gray-600">
            Organize your transactions by income and expense categories.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>New Category</Button>
      </header>

      {showFullPageLoading && <PageLoadingState label="Loading categories…" />}

      {!showFullPageLoading && error && (
        <PageErrorState message={error} onRetry={handleRetry} />
      )}

      {!showFullPageLoading && !error && categories.length === 0 && (
        <EmptyState
          title="No categories yet"
          description="Categories help you organize and track your income and expenses."
          action={{
            label: "New Category",
            onClick: () => setShowCreateDialog(true),
          }}
        />
      )}

      {!showFullPageLoading && !error && categories.length > 0 && (
        <>
          <CategorySection
            title="Income Categories"
            categories={incomeCategories}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
          <CategorySection
            title="Expense Categories"
            categories={expenseCategories}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        </>
      )}

      {currentWorkspaceId !== null && (
        <CreateCategoryDialog
          open={showCreateDialog}
          workspaceId={currentWorkspaceId}
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleCategoryCreated}
        />
      )}

      {currentWorkspaceId !== null && (
        <EditCategoryDialog
          open={showEditDialog}
          category={editingCategory}
          onClose={handleEditClose}
          onUpdated={handleCategoryUpdated}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete category?"
        message={deleteMessage()}
        confirmLabel="Delete Category"
        cancelLabel="Cancel"
        destructive
        loading={deleting || deleteCountLoading}
        error={deleteError ?? undefined}
      />
    </div>
  );
}

function CategorySection({
  title,
  categories,
  onEdit,
  onDelete,
}: {
  title: string;
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 text-lg font-medium text-gray-900">
        {title}{" "}
        <span className="text-sm font-normal text-gray-500">
          ({categories.length})
        </span>
      </h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                Category
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
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 text-sm">
                  <span className="font-medium text-gray-900">
                    {category.name}
                  </span>
                  {category.is_system && (
                    <span className="ml-2 inline-block">
                      <Badge variant="default">System</Badge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(category)}
                      aria-label={`Edit ${category.name}`}
                    >
                      Edit
                    </Button>
                    {!category.is_system && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onDelete(category)}
                        aria-label={`Delete ${category.name}`}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
