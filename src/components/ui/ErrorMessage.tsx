interface ErrorMessageProps {
  message: string;
  /** Show a retry action */
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3"
    >
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Full-page centered error state */
export function PageErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <ErrorMessage message={message} onRetry={onRetry} />
      </div>
    </div>
  );
}
