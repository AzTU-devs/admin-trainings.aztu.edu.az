import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  // Regression: a rejected onConfirm (the category and user deletes) left the
  // dialog open with no word of why, and an unhandled rejection.
  it("shows the server's reason and stays open when the action fails", async () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <ConfirmDialog
          open
          onOpenChange={onOpenChange}
          title="Delete category?"
          confirmLabel="Delete"
          onConfirm={() => Promise.reject({ status: 409, message: "Category is in use by 3 courses", isNormalized: true })}
        />
        <Toaster />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Category is in use by 3 courses")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("closes after success", async () => {
    const onOpenChange = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Archive?" confirmLabel="Archive" onConfirm={async () => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
