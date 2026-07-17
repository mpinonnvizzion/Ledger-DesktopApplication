import { Dialog } from "./Dialog";
import { Button } from "./Button";

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
