import { useEffect, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { createCategory } from "@/api/categories";
import { parseCommandError } from "@/lib/errors";
import type { Category, CategoryType } from "@/types/domain";

interface CreateCategoryDialogProps {
  open: boolean;
  workspaceId: number;
  onClose: () => void;
  onCreated: (category: Category) => void;
}

interface FormState {
  name: string;
  categoryType: CategoryType | "";
}

const EMPTY_FORM: FormState = {
  name: "",
  categoryType: "",
};

const CATEGORY_TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

const NAME_INPUT_ID = "create-category-name";

export function CreateCategoryDialog({
  open,
  workspaceId,
  onClose,
  onCreated,
}: CreateCategoryDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wasOpenRef = useRef(open);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setForm(EMPTY_FORM);
      setNameError(null);
      setTypeError(null);
      setFormError(null);
      setSubmitting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

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
    if (submitting) return;

    const trimmedName = form.name.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError("Category name is required.");
      hasError = true;
    } else {
      setNameError(null);
    }

    if (!form.categoryType) {
      setTypeError("Category type is required.");
      hasError = true;
    } else {
      setTypeError(null);
    }

    if (hasError) return;

    setFormError(null);
    setSubmitting(true);

    createCategory(workspaceId, trimmedName, form.categoryType as CategoryType)
      .then((category) => {
        setForm(EMPTY_FORM);
        onCreated(category);
      })
      .catch((err: unknown) => {
        setFormError(parseCommandError(err).message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New Category"
      preventClose={submitting}
    >
      <p className="mb-4 text-sm text-gray-600">
        Add a category to organize your transactions.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          id={NAME_INPUT_ID}
          label="Category Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          error={nameError ?? undefined}
          disabled={submitting}
          required
          autoComplete="off"
        />

        <Select
          id="create-category-type"
          label="Type"
          value={form.categoryType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              categoryType: e.target.value as CategoryType,
            }))
          }
          options={CATEGORY_TYPE_OPTIONS}
          placeholder="Select type"
          error={typeError ?? undefined}
          disabled={submitting}
          required
        />

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
            Create Category
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
