import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { formatAmount, parseAmount } from "@/lib/format";

interface AmountInputProps {
  /** Value in cents */
  value: number;
  onChange: (cents: number) => void;
  id: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function AmountInput({
  value,
  onChange,
  id,
  label,
  error,
  disabled,
  placeholder = "0.00",
}: AmountInputProps) {
  const [display, setDisplay] = useState<string>(
    value === 0 ? "" : formatAmount(Math.abs(value)),
  );
  const prevValue = useRef(value);

  // Sync display when external value changes (e.g., form reset or prop update)
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setDisplay(value === 0 ? "" : formatAmount(Math.abs(value)));
    }
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow digits, one decimal point, leading minus
    if (raw !== "" && !/^-?\d*\.?\d{0,2}$/.test(raw)) return;
    setDisplay(raw);

    if (!raw.trim() || raw === "-") {
      onChange(0);
      return;
    }

    const parsed = parseAmount(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  }

  function handleBlur() {
    if (!display.trim()) return;
    const cents = parseAmount(display);
    if (!isNaN(cents)) {
      prevValue.current = cents;
      setDisplay(formatAmount(Math.abs(cents)));
    }
  }

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
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          className={[
            "block w-full rounded-md border py-2 pl-7 pr-3 text-sm text-gray-900",
            "placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
            error ? "border-error" : "border-gray-300",
          ].join(" ")}
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
