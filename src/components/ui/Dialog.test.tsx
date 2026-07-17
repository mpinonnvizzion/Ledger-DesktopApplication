import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Dialog } from "./Dialog";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

describe("Dialog", () => {
  it("renders title and children when open", () => {
    render(
      <Dialog open={true} onClose={() => {}} title="My Dialog">
        <p>Dialog content</p>
      </Dialog>,
    );
    expect(screen.getByText("My Dialog")).toBeInTheDocument();
    expect(screen.getByText("Dialog content")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Dialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape key is pressed on document", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose} title="Escape test">
        <p>Content</p>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not respond to Escape when dialog is closed", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={false} onClose={onClose} title="Closed">
        <p>Content</p>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls showModal when open becomes true", () => {
    const { rerender } = render(
      <Dialog open={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Dialog>,
    );
    rerender(
      <Dialog open={true} onClose={() => {}} title="Test">
        <p>Content</p>
      </Dialog>,
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("calls close when open becomes false", () => {
    const { rerender } = render(
      <Dialog open={true} onClose={() => {}} title="Test">
        <p>Content</p>
      </Dialog>,
    );
    rerender(
      <Dialog open={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Dialog>,
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });
});
