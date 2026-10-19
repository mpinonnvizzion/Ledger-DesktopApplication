import { useEffect, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { updateCategory } from "@/api/categories";
import { parseCommandError } from "@/lib/errors";
import type { Category } from "@/types/domain";

interface EditCategoryDialogProps {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onUpdated: (category: Category) => void;
}

const NAME_INPUT_ID = "edit-category-name";

export function EditCategoryDialog({
  open,
  category,
  onClose,
  onUpdated,
}: EditCategoryDialogProps) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wasOpenRef = useRef(open);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen || !category) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setName(category.name);
      setNameError(null);
      setFormError(null);
      setSubmitting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, category]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(NAME_INPUT_ID)?.focus();
  }, [open]);

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !category) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Category name is required.");
      return;
    }
    setNameError(null);
    setFormError(null);
    setSubmitting(true);

    updateCategory(category.id, trimmedName)
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

  const typeLabel = category?.category_type === "income" ? "Income" : "Expense";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Edit Category"
      preventClose={submitting}
    >
      <p className="mb-4 text-sm text-gray-600">
        Update this category&rsquo;s details.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          id={NAME_INPUT_ID}
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError ?? undefined}
          disabled={submitting}
          required
          autoComplete="off"
        />

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Type
          </span>
          <p className="text-sm text-gray-600">{typeLabel}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Category type cannot be changed after creation.
          </p>
        </div>

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
          <Button type="submit" loading={submitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
