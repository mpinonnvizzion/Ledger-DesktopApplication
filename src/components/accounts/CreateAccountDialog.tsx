import { useEffect, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { createAccount } from "@/api/accounts";
import { parseCommandError } from "@/lib/errors";
import { ACCOUNT_TYPE_OPTIONS } from "@/lib/accountTypes";
import type { Account, AccountType } from "@/types/domain";

interface CreateAccountDialogProps {
  open: boolean;
  workspaceId: number;
  onClose: () => void;
  onCreated: (account: Account) => void;
}

interface FormState {
  name: string;
  accountType: AccountType | "";
  institutionName: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  accountType: "",
  institutionName: "",
};

const NAME_INPUT_ID = "create-account-name";

export function CreateAccountDialog({
  open,
  workspaceId,
  onClose,
  onCreated,
}: CreateAccountDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wasOpenRef = useRef(open);

  // Reopening the dialog (a genuine closed->open transition, not the initial
  // mount, since the form already starts empty) must never show a previous
  // attempt's values or errors. setState calls run inside a Promise callback
  // (not synchronously in the effect body) to satisfy react-hooks/set-state-in-effect.
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
    if (submitting) return;

    const trimmedName = form.name.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError("Account name is required.");
      hasError = true;
    } else {
      setNameError(null);
    }

    if (!form.accountType) {
      setTypeError("Account type is required.");
      hasError = true;
    } else {
      setTypeError(null);
    }

    if (hasError) return;

    setFormError(null);
    setSubmitting(true);

    const trimmedInstitution = form.institutionName.trim();

    createAccount(
      workspaceId,
      trimmedName,
      form.accountType as AccountType,
      undefined,
      trimmedInstitution ? trimmedInstitution : undefined,
    )
      .then((account) => {
        setForm(EMPTY_FORM);
        onCreated(account);
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
      title="New Account"
      preventClose={submitting}
    >
      <p className="mb-4 text-sm text-gray-600">
        Add an account to the current workspace.
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
          id="create-account-type"
          label="Account Type"
          value={form.accountType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              accountType: e.target.value as AccountType,
            }))
          }
          options={ACCOUNT_TYPE_OPTIONS}
          placeholder="Select account type"
          error={typeError ?? undefined}
          disabled={submitting}
          required
        />

        <Input
          id="create-account-institution"
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
            Create Account
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
