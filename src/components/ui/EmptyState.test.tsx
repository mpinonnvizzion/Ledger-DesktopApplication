import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No accounts yet" />);
    expect(screen.getByText("No accounts yet")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        title="No accounts"
        description="Create your first account to get started."
      />,
    );
    expect(
      screen.getByText("Create your first account to get started."),
    ).toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    render(
      <EmptyState
        title="No accounts"
        action={{ label: "Create account", onClick: vi.fn() }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("calls action onClick when button is clicked", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No accounts"
        action={{ label: "Create account", onClick: handleAction }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(handleAction).toHaveBeenCalledOnce();
  });

  it("does not render action button when no action provided", () => {
    render(<EmptyState title="No data" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(<EmptyState title="Title only" />);
    // Only title, no description paragraph
    expect(screen.getByText("Title only")).toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});
