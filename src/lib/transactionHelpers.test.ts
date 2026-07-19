import { describe, expect, it } from "vitest";
import {
  accountDisplayLabel,
  amountDisplayClass,
  applyTransactionDirection,
  categoryDisplayLabel,
  directionFromAmount,
  directionLabel,
  formatMinorUnits,
  formatSignedAmount,
  formatTransactionDate,
  parseAmountMagnitudeToMinorUnits,
} from "./transactionHelpers";

describe("parseAmountMagnitudeToMinorUnits", () => {
  it("parses a whole number", () => {
    expect(parseAmountMagnitudeToMinorUnits("10")).toBe(1000);
  });

  it("parses one decimal place", () => {
    expect(parseAmountMagnitudeToMinorUnits("10.5")).toBe(1050);
  });

  it("parses two decimal places", () => {
    expect(parseAmountMagnitudeToMinorUnits("10.50")).toBe(1050);
  });

  it("parses a leading decimal value", () => {
    expect(parseAmountMagnitudeToMinorUnits(".50")).toBe(50);
  });

  it("trims surrounding whitespace", () => {
    expect(parseAmountMagnitudeToMinorUnits("  10.50  ")).toBe(1050);
  });

  it("rejects whitespace-only input", () => {
    expect(parseAmountMagnitudeToMinorUnits("   ")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(parseAmountMagnitudeToMinorUnits("")).toBeNull();
  });

  it("parses zero", () => {
    expect(parseAmountMagnitudeToMinorUnits("0")).toBe(0);
    expect(parseAmountMagnitudeToMinorUnits("0.00")).toBe(0);
  });

  it("rejects a negative sign (magnitude only; direction is separate)", () => {
    expect(parseAmountMagnitudeToMinorUnits("-10")).toBeNull();
    expect(parseAmountMagnitudeToMinorUnits("-10.50")).toBeNull();
  });

  it("rejects more than two decimal places", () => {
    expect(parseAmountMagnitudeToMinorUnits("10.123")).toBeNull();
  });

  it("rejects thousands separators", () => {
    expect(parseAmountMagnitudeToMinorUnits("1,234.56")).toBeNull();
  });

  it("rejects malformed strings", () => {
    expect(parseAmountMagnitudeToMinorUnits("abc")).toBeNull();
    expect(parseAmountMagnitudeToMinorUnits("12.34.56")).toBeNull();
    expect(parseAmountMagnitudeToMinorUnits("$10")).toBeNull();
    expect(parseAmountMagnitudeToMinorUnits("10.")).toBeNull();
    expect(parseAmountMagnitudeToMinorUnits(".")).toBeNull();
  });

  it("parses large valid values without floating-point drift", () => {
    expect(parseAmountMagnitudeToMinorUnits("999999.99")).toBe(99999999);
  });
});

describe("applyTransactionDirection", () => {
  it("negates the magnitude for an expense", () => {
    expect(applyTransactionDirection(1000, "expense")).toBe(-1000);
  });

  it("keeps the magnitude positive for income", () => {
    expect(applyTransactionDirection(1000, "income")).toBe(1000);
  });

  it("normalizes zero to positive zero regardless of direction", () => {
    expect(Object.is(applyTransactionDirection(0, "expense"), -0)).toBe(false);
    expect(applyTransactionDirection(0, "expense")).toBe(0);
    expect(applyTransactionDirection(0, "income")).toBe(0);
  });
});

describe("directionFromAmount", () => {
  it("derives income from a positive amount", () => {
    expect(directionFromAmount(4250)).toBe("income");
  });

  it("derives expense from a negative amount", () => {
    expect(directionFromAmount(-1500)).toBe("expense");
  });
});

describe("directionLabel", () => {
  it("labels income and expense", () => {
    expect(directionLabel("income")).toBe("Income");
    expect(directionLabel("expense")).toBe("Expense");
  });
});

describe("formatMinorUnits", () => {
  it("formats positive minor units", () => {
    expect(formatMinorUnits(4250)).toBe("42.50");
  });

  it("formats negative minor units", () => {
    expect(formatMinorUnits(-1500)).toBe("-15.00");
  });
});

describe("formatSignedAmount", () => {
  it("prefixes a positive amount with +", () => {
    expect(formatSignedAmount(4250)).toBe("+42.50");
  });

  it("keeps the existing - prefix for a negative amount", () => {
    expect(formatSignedAmount(-1500)).toBe("-15.00");
  });
});

describe("formatTransactionDate", () => {
  it("formats a date without shifting through a timezone", () => {
    expect(formatTransactionDate("2026-07-19")).toBe("Jul 19, 2026");
  });

  it("does not zero-pad the day", () => {
    expect(formatTransactionDate("2026-01-05")).toBe("Jan 5, 2026");
  });

  it("formats December correctly", () => {
    expect(formatTransactionDate("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("falls back to the raw string for unparseable input", () => {
    expect(formatTransactionDate("not-a-date")).toBe("not-a-date");
  });
});

describe("categoryDisplayLabel", () => {
  it("returns the category name when present", () => {
    expect(categoryDisplayLabel({ name: "Groceries" })).toBe("Groceries");
  });

  it("returns Uncategorized when null", () => {
    expect(categoryDisplayLabel(null)).toBe("Uncategorized");
  });

  it("returns Uncategorized when undefined", () => {
    expect(categoryDisplayLabel(undefined)).toBe("Uncategorized");
  });
});

describe("accountDisplayLabel", () => {
  it("returns the account name when present", () => {
    expect(accountDisplayLabel({ name: "Checking" })).toBe("Checking");
  });

  it("returns a fallback when null", () => {
    expect(accountDisplayLabel(null)).toBe("Unknown account");
  });

  it("returns a fallback when undefined", () => {
    expect(accountDisplayLabel(undefined)).toBe("Unknown account");
  });
});

describe("amountDisplayClass", () => {
  it("classifies positive amounts", () => {
    expect(amountDisplayClass(100)).toBe("text-green-700");
  });

  it("classifies negative amounts", () => {
    expect(amountDisplayClass(-100)).toBe("text-red-700");
  });
});
