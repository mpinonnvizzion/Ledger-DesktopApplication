import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Transactions from "./Transactions";

vi.mock("@/hooks/useTransactionReferenceData", () => ({
  useTransactionReferenceData: vi.fn(),
}));

import { useTransactionReferenceData } from "@/hooks/useTransactionReferenceData";

const mockUseTransactionReferenceData = vi.mocked(useTransactionReferenceData);

function referenceDataValue(
  overrides: Partial<ReturnType<typeof useTransactionReferenceData>>,
) {
  return {
    accounts: [],
    categories: [],
    loading: false,
    error: null,
    retry: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Transactions page — title and foundation state", () => {
  it("renders the page title", () => {
    mockUseTransactionReferenceData.mockReturnValue(referenceDataValue({}));
    render(<Transactions />);
    expect(
      screen.getByRole("heading", { name: "Transactions" }),
    ).toBeInTheDocument();
  });

  it("does not imply transaction CRUD is available", () => {
    mockUseTransactionReferenceData.mockReturnValue(referenceDataValue({}));
    render(<Transactions />);
    expect(
      screen.queryByRole("button", { name: /new transaction/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /^edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^delete/i })).toBeNull();
  });

  it("shows no fake transaction rows or table", () => {
    mockUseTransactionReferenceData.mockReturnValue(referenceDataValue({}));
    render(<Transactions />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("row")).toBeNull();
  });
});

describe("Transactions page — reference-data loading", () => {
  it("shows a loading state while reference data loads", () => {
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({ loading: true }),
    );
    render(<Transactions />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows a sanitized error with retry when reference data fails to load", () => {
    const retry = vi.fn();
    mockUseTransactionReferenceData.mockReturnValue(
      referenceDataValue({
        error: "A database error occurred. Please try again.",
        retry,
      }),
    );
    render(<Transactions />);

    expect(
      screen.getByText("A database error occurred. Please try again."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Try again"));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("shows the foundational empty state once reference data has loaded", () => {
    mockUseTransactionReferenceData.mockReturnValue(referenceDataValue({}));
    render(<Transactions />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });
});
