import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AmountInput } from "./AmountInput";

function ControlledAmountInput(props: {
  initialValue?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(props.initialValue ?? "");
  return (
    <AmountInput
      id="amount"
      label="Amount"
      value={value}
      error={props.error}
      disabled={props.disabled}
      required={props.required}
      onChange={(next) => {
        setValue(next);
        props.onChange?.(next);
      }}
    />
  );
}

describe("AmountInput", () => {
  it("associates the label with the input", () => {
    render(<ControlledAmountInput />);
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
  });

  it("is a controlled input that reflects the value prop", () => {
    render(<ControlledAmountInput initialValue="10.50" />);
    expect(screen.getByLabelText("Amount")).toHaveValue("10.50");
  });

  it("calls onChange with the raw typed string, unmodified", () => {
    const handleChange = vi.fn();
    render(<ControlledAmountInput onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "10.5" },
    });
    expect(handleChange).toHaveBeenCalledWith("10.5");
  });

  it("keeps invalid text visible instead of silently converting it", () => {
    render(<ControlledAmountInput />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "not-a-number" } });
    expect(input).toHaveValue("not-a-number");
  });

  it("supports the required state", () => {
    render(<ControlledAmountInput required />);
    expect(screen.getByLabelText("Amount")).toBeRequired();
  });

  it("supports the disabled state", () => {
    render(<ControlledAmountInput disabled />);
    expect(screen.getByLabelText("Amount")).toBeDisabled();
  });

  it("renders an error message and marks the field invalid", () => {
    render(<ControlledAmountInput error="Enter a valid amount" />);
    const input = screen.getByLabelText("Amount");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid amount")).toBeInTheDocument();
  });

  it("associates the error message via aria-describedby", () => {
    render(<ControlledAmountInput error="Enter a valid amount" />);
    const input = screen.getByLabelText("Amount");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Enter a valid amount",
    );
  });

  it("has no aria-describedby when there is no error", () => {
    render(<ControlledAmountInput />);
    expect(screen.getByLabelText("Amount")).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});
