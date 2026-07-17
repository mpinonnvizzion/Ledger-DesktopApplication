import { useEffect, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { updateAccount } from "@/api/accounts";
import { parseCommandError } from "@/lib/errors";
import { ACCOUNT_TYPE_OPTIONS } from "@/lib/accountTypes";
import type { Account } from "@/types/domain";

interface EditAccountDialogProps {
  open: boolean;
  account: Account | null;
  onClose: () => void;
  onUpdated: (account: Account) => void;
}

interface FormState {
  name: string;
  institutionName: string;
}

const NAME_INPUT_ID = "edit-account-name";

function formFromAccount(account: Account): FormState {
  return {
    name: account.name,
    institutionName: account.institution_name ?? "",
  };
}

export function EditAccountDialog({
  open,
  account,
  onClose,
  onUpdated,
}: EditAccountDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    account ? formFromAccount(account) : { name: "", institutionName: "" },
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wasOpenRef = useRef(open);

  // Reopening (a genuine closed->open transition) must populate the form
  // from the currently selected account and clear any stale errors from a
  // previous edit, whether of this account or a different one. setState
  // calls run inside a Promise callback (not synchronously in the effect
  // body) to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen || !account) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setForm(formFromAccount(account));
      setNameError(null);
      setFormError(null);
      setSubmitting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, account]);

  // The native <dialog> auto-focuses the first focusable descendant on
  // showModal(), which would otherwise be the header's close button.
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
    if (submitting || !account) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setNameError("Account name is required.");
      return;
    }
    setNameError(null);
    setFormError(null);
    setSubmitting(true);

    // Unlike create, the update repository treats an omitted
    // institution_name as "preserve existing value" rather than "clear it."
    // A trimmed empty string must be sent explicitly so clearing the field
    // actually clears it, rather than silently leaving the old value.
    const trimmedInstitution = form.institutionName.trim();

    updateAccount(account.id, trimmedName, trimmedInstitution, undefined)
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Edit Account"
      preventClose={submitting}
    >
      <p className="mb-4 text-sm text-gray-600">
        Update this account&rsquo;s details.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          id={NAME_INPUT_ID}
          label="Account Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          error={nameError ?? undefined}
          disabled={submitting}
          required
          autoComplete="off"
        />

        <Select
          id="edit-account-type"
          label="Account Type"
          value={account?.account_type ?? ""}
          onChange={() => {}}
          options={ACCOUNT_TYPE_OPTIONS}
          disabled
        />
        <p className="-mt-3 text-xs text-gray-500">
          Account type cannot be changed after creation.
        </p>

        <Input
          id="edit-account-institution"
          label="Institution (optional)"
          value={form.institutionName}
          onChange={(e) =>
            setForm((f) => ({ ...f, institutionName: e.target.value }))
          }
          disabled={submitting}
          autoComplete="off"
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
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
