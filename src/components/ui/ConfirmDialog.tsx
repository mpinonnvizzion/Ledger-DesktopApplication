import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { ErrorMessage } from "./ErrorMessage";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use danger variant for destructive actions */
  destructive?: boolean;
  loading?: boolean;
  /** Sanitized error from a failed confirm attempt, shown inside the dialog */
  error?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      preventClose={loading}
    >
      <p className="text-sm text-gray-700">{message}</p>
      {error && (
        <div className="mt-3">
          <ErrorMessage message={error} />
        </div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        {/* autoFocus ensures initial focus lands on the safe Cancel action */}
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={loading}
          autoFocus
        >
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "danger" : "primary"}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
