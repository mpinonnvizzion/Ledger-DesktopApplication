import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount } from "./format";

describe("formatAmount", () => {
  it("formats zero", () => {
    expect(formatAmount(0)).toBe("0.00");
  });

  it("formats a typical amount", () => {
    expect(formatAmount(4250)).toBe("42.50");
  });

  it("formats a negative amount", () => {
    expect(formatAmount(-1500)).toBe("-15.00");
  });

  it("formats a large amount", () => {
    expect(formatAmount(999999999)).toBe("9999999.99");
  });

  it("formats single-digit cents", () => {
    expect(formatAmount(101)).toBe("1.01");
  });
});

describe("parseAmount", () => {
  it("parses a typical amount", () => {
    expect(parseAmount("42.50")).toBe(4250);
  });

  it("parses zero", () => {
    expect(parseAmount("0.00")).toBe(0);
  });

  it("parses a negative amount", () => {
    expect(parseAmount("-15.00")).toBe(-1500);
  });
});
