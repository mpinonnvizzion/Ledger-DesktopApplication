import { useRef, useEffect, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Maximum width class. Defaults to max-w-lg */
  maxWidth?: string;
  /** Block close via Escape or the X button (e.g. during an async submit). */
  preventClose?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
  preventClose = false,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // Open/close native dialog
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  // Handle native cancel event (Escape key in browser)
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    function handleCancel(e: Event) {
      e.preventDefault();
      if (!preventClose) onClose();
    }

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose, preventClose]);

  // Fallback Escape handler for test environments and non-modal usage
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!preventClose) onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, preventClose]);

  return (
    <dialog
      ref={ref}
      className={[
        "w-full rounded-lg bg-white p-0 shadow-xl",
        "backdrop:bg-black/50",
        maxWidth,
      ].join(" ")}
      aria-labelledby="dialog-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 id="dialog-title" className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        {!preventClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-4">{children}</div>
    </dialog>
  );
}
