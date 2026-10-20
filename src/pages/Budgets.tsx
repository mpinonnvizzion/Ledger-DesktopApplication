import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { listBudgets, getCategorySpending } from "@/api/budgets";
import { listCategoriesByWorkspace } from "@/api/categories";
import type { Budget, Category, CategorySpending } from "@/types/domain";
import { parseCommandError } from "@/lib/errors";
import { formatAmount } from "@/lib/format";
import { PageLoadingState } from "@/components/ui/LoadingSpinner";
import { PageErrorState } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

const MONTH_NAMES = [
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

function currentMonth(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function monthLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function prevMonth(
  month: number,
  year: number,
): { month: number; year: number } {
  return month === 1
    ? { month: 12, year: year - 1 }
    : { month: month - 1, year };
}

function nextMonth(
  month: number,
  year: number,
): { month: number; year: number } {
  return month === 12
    ? { month: 1, year: year + 1 }
    : { month: month + 1, year };
}

export default function Budgets() {
  const { currentWorkspaceId } = useWorkspace();
  const initial = currentMonth();
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  useEffect(() => {
    if (currentWorkspaceId === null) return;

    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      listBudgets(currentWorkspaceId, month, year),
      getCategorySpending(currentWorkspaceId, month, year),
      listCategoriesByWorkspace(currentWorkspaceId),
    ])
      .then(([budgetList, spendingList, categoryList]) => {
        if (cancelled) return;
        setBudgets(budgetList);
        setSpending(spendingList);
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
  }, [currentWorkspaceId, month, year, retryToken]);

  const categoryMap = useMemo(() => {
    const map = new Map<number, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const spendingMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of spending) map.set(s.category_id, s.spent_minor);
    return map;
  }, [spending]);

  const overBudgetCount = useMemo(() => {
    return budgets.filter((b) => {
      const spent = spendingMap.get(b.category_id) ?? 0;
      return spent >= b.amount_minor;
    }).length;
  }, [budgets, spendingMap]);

  function handlePrev() {
    const p = prevMonth(month, year);
    setMonth(p.month);
    setYear(p.year);
  }

  function handleNext() {
    const n = nextMonth(month, year);
    setMonth(n.month);
    setYear(n.year);
  }

  function handleRetry() {
    setRetryToken((t) => t + 1);
  }

  function refresh() {
    setRetryToken((t) => t + 1);
  }

  function handleBudgetCreated() {
    setShowCreateDialog(false);
    refresh();
  }

  function handleBudgetUpdated() {
    setEditingBudget(null);
    refresh();
  }

  function handleDeleteConfirmed() {
    setDeleteTarget(null);
    refresh();
  }

  if (currentWorkspaceId === null) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Budgets</h2>
          <p className="mt-1 text-sm text-gray-600">
            Set monthly spending limits and track your progress.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>New Budget</Button>
      </header>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="secondary" size="sm" onClick={handlePrev}>
          ← Previous
        </Button>
        <span className="min-w-[10rem] text-center text-sm font-medium text-gray-900">
          {monthLabel(month, year)}
        </span>
        <Button variant="secondary" size="sm" onClick={handleNext}>
          Next →
        </Button>
      </div>

      {loading && <PageLoadingState label="Loading budgets…" />}

      {!loading && error && (
        <PageErrorState message={error} onRetry={handleRetry} />
      )}

      {!loading && !error && budgets.length === 0 && (
        <EmptyState
          title={`No budgets for ${monthLabel(month, year)}`}
          description="Create one to start tracking your spending."
          action={{
            label: "New Budget",
            onClick: () => setShowCreateDialog(true),
          }}
        />
      )}

      {!loading && !error && budgets.length > 0 && (
        <>
          <BudgetSummary total={budgets.length} overBudget={overBudgetCount} />
          <div className="space-y-3">
            {budgets.map((budget) => {
              const categoryName =
                categoryMap.get(budget.category_id)?.name ?? "Unknown";
              const spent = spendingMap.get(budget.category_id) ?? 0;

              return (
                <BudgetRow
                  key={budget.id}
                  budget={budget}
                  categoryName={categoryName}
                  spent={spent}
                  onEdit={() => setEditingBudget(budget)}
                  onDelete={() => setDeleteTarget(budget)}
                />
              );
            })}
          </div>
        </>
      )}

      {showCreateDialog && (
        <CreateBudgetDialog
          workspaceId={currentWorkspaceId}
          month={month}
          year={year}
          existingCategoryIds={budgets.map((b) => b.category_id)}
          categories={categories}
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleBudgetCreated}
        />
      )}

      {editingBudget && (
        <EditBudgetDialog
          budget={editingBudget}
          categoryName={
            categoryMap.get(editingBudget.category_id)?.name ?? "Unknown"
          }
          onClose={() => setEditingBudget(null)}
          onUpdated={handleBudgetUpdated}
        />
      )}

      {deleteTarget && (
        <DeleteBudgetDialog
          budget={deleteTarget}
          categoryName={
            categoryMap.get(deleteTarget.category_id)?.name ?? "Unknown"
          }
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleteConfirmed}
        />
      )}
    </div>
  );
}

function BudgetSummary({
  total,
  overBudget,
}: {
  total: number;
  overBudget: number;
}) {
  const onTrack = total - overBudget;
  return (
    <p className="text-sm text-gray-600">
      {overBudget === 0 ? (
        <span className="font-medium text-green-700">
          All {total} budget{total !== 1 ? "s" : ""} on track
        </span>
      ) : (
        <>
          <span className="font-medium text-red-700">
            {overBudget} of {total} over budget
          </span>
          {onTrack > 0 && <span className="ml-1">· {onTrack} on track</span>}
        </>
      )}
    </p>
  );
}

function BudgetRow({
  budget,
  categoryName,
  spent,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  categoryName: string;
  spent: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const percentage =
    budget.amount_minor > 0 ? (spent / budget.amount_minor) * 100 : 0;
  const barWidth = Math.min(percentage, 100);
  const remaining = budget.amount_minor - spent;
  const overBy = spent > budget.amount_minor ? spent - budget.amount_minor : 0;

  let barColor: string;
  if (percentage >= 100) {
    barColor = "bg-red-500";
  } else if (percentage >= 80) {
    barColor = "bg-yellow-500";
  } else {
    barColor = "bg-green-500";
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              {categoryName}
            </h3>
            <span className="text-sm text-gray-500">
              ${formatAmount(spent)} of ${formatAmount(budget.amount_minor)}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuenow={Math.round(percentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${categoryName} budget progress`}
          >
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>

          {/* Status text */}
          <p className="mt-1 text-xs text-gray-500">
            {overBy > 0 ? (
              <span className="font-medium text-red-600">
                Over by ${formatAmount(overBy)}
              </span>
            ) : (
              <span>${formatAmount(remaining)} remaining</span>
            )}
            <span className="ml-2">({Math.round(percentage)}%)</span>
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            aria-label={`Edit ${categoryName} budget`}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDelete}
            aria-label={`Delete ${categoryName} budget`}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Dialogs (Phase C inline since they're small) ---

import { createBudget, updateBudget, deleteBudget } from "@/api/budgets";
import { AmountInput } from "@/components/ui/AmountInput";

function CreateBudgetDialog({
  workspaceId,
  month,
  year,
  existingCategoryIds,
  categories,
  onClose,
  onCreated,
}: {
  workspaceId: number;
  month: number;
  year: number;
  existingCategoryIds: number[];
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const eligibleCategories = useMemo(() => {
    const existing = new Set(existingCategoryIds);
    return categories
      .filter((c) => c.category_type === "expense" && !existing.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, existingCategoryIds]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (categoryId === "" || !amount.trim()) return;

    const amountMinor = parseAmountToMinor(amount);
    if (amountMinor <= 0) {
      setSubmitError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    createBudget(workspaceId, categoryId, amountMinor, month, year)
      .then(() => onCreated())
      .catch((err: unknown) => setSubmitError(parseCommandError(err).message))
      .finally(() => setSubmitting(false));
  }

  return (
    <DialogOverlay onClose={onClose}>
      <h2 className="text-lg font-semibold text-gray-900">New Budget</h2>
      <p className="mt-1 text-sm text-gray-500">{monthLabel(month, year)}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="budget-category"
            className="block text-sm font-medium text-gray-700"
          >
            Category
          </label>
          {eligibleCategories.length === 0 ? (
            <p className="mt-1 text-sm text-gray-500">
              All expense categories already have budgets for this month.
            </p>
          ) : (
            <select
              id="budget-category"
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value ? Number(e.target.value) : "")
              }
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            >
              <option value="">Select a category</option>
              {eligibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label
            htmlFor="budget-amount"
            className="block text-sm font-medium text-gray-700"
          >
            Monthly limit
          </label>
          <AmountInput
            id="budget-amount"
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
          />
        </div>
        {submitError && (
          <p className="text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={
              categoryId === "" ||
              !amount.trim() ||
              eligibleCategories.length === 0
            }
          >
            Create Budget
          </Button>
        </div>
      </form>
    </DialogOverlay>
  );
}

function EditBudgetDialog({
  budget,
  categoryName,
  onClose,
  onUpdated,
}: {
  budget: Budget;
  categoryName: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [amount, setAmount] = useState(formatAmount(budget.amount_minor));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountMinor = parseAmountToMinor(amount);
    if (amountMinor <= 0) {
      setSubmitError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    updateBudget(budget.id, amountMinor)
      .then(() => onUpdated())
      .catch((err: unknown) => setSubmitError(parseCommandError(err).message))
      .finally(() => setSubmitting(false));
  }

  return (
    <DialogOverlay onClose={onClose}>
      <h2 className="text-lg font-semibold text-gray-900">Edit Budget</h2>
      <p className="mt-1 text-sm text-gray-500">{categoryName}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="edit-budget-amount"
            className="block text-sm font-medium text-gray-700"
          >
            Monthly limit
          </label>
          <AmountInput
            id="edit-budget-amount"
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
          />
        </div>
        {submitError && (
          <p className="text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={!amount.trim()}>
            Save
          </Button>
        </div>
      </form>
    </DialogOverlay>
  );
}

function DeleteBudgetDialog({
  budget,
  categoryName,
  onClose,
  onDeleted,
}: {
  budget: Budget;
  categoryName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleConfirm() {
    setDeleting(true);
    setDeleteError(null);

    deleteBudget(budget.id)
      .then(() => onDeleted())
      .catch((err: unknown) => setDeleteError(parseCommandError(err).message))
      .finally(() => setDeleting(false));
  }

  return (
    <DialogOverlay onClose={onClose}>
      <h2 className="text-lg font-semibold text-gray-900">Delete Budget?</h2>
      <p className="mt-2 text-sm text-gray-600">
        Remove the ${formatAmount(budget.amount_minor)} monthly budget for{" "}
        <strong>{categoryName}</strong>? This cannot be undone.
      </p>
      {deleteError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {deleteError}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={deleting}
        >
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} loading={deleting}>
          Delete Budget
        </Button>
      </div>
    </DialogOverlay>
  );
}

function DialogOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

function parseAmountToMinor(display: string): number {
  const trimmed = display.trim().replace(/[,$]/g, "");
  if (!trimmed) return 0;
  const parts = trimmed.split(".");
  const dollars = parseInt(parts[0] || "0", 10);
  const cents = parseInt((parts[1] || "0").padEnd(2, "0").slice(0, 2), 10);
  return dollars * 100 + cents;
}
