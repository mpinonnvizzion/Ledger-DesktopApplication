import type { InputHTMLAttributes } from "react";

interface AmountInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> {
  label?: string;
  error?: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A controlled text field for entering a currency magnitude. It stores and
 * returns the raw, user-facing string exactly as typed - it never parses
 * the value to a number, never stores a float, and never silently rewrites
 * invalid input into something valid. Parsing (via
 * `parseAmountMagnitudeToMinorUnits`) and direction (income/expense) are
 * both the caller's responsibility; this component only presents the field
 * accessibly. It does not call any backend API.
 */
export function AmountInput({
  label,
  error,
  id,
  value,
  onChange,
  className = "",
  ...rest
}: AmountInputProps) {
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
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500"
        >
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          className={[
            "block w-full rounded-md border py-2 pr-3 pl-7 text-sm text-gray-900",
            "placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
            error ? "border-error" : "border-gray-300",
            className,
          ].join(" ")}
          {...rest}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
