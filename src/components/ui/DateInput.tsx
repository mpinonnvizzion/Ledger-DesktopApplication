import type { InputHTMLAttributes } from "react";

interface DateInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  id: string;
  label?: string;
  error?: string;
}

export function DateInput({
  id,
  label,
  error,
  className = "",
  ...rest
}: DateInputProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type="date"
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        className={[
          "block w-full rounded-md border px-3 py-2 text-sm text-gray-900",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
          error ? "border-error" : "border-gray-300",
          className,
        ].join(" ")}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
