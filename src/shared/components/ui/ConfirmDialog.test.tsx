import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog, DialogContent, DialogTitle } from "./Dialog";

/*
 * Where focus goes when a dialog closes. None of the app's dialogs has a
 * Radix DialogTrigger (they are opened from state), so the shared
 * DialogContent puts focus back on whatever opened them itself.
 */

function ConfirmFromButton({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button">Before</button>
      <button type="button" onClick={() => setOpen(true)}>
        Delete row
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this row?"
        onConfirm={onConfirm}
        destructive
      />
    </>
  );
}

/** A dialog that only exists while open, like the attendance page's "Change mark". */
function MountedWhileOpen() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Change mark
      </button>
      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent>
            <DialogTitle>Change mark</DialogTitle>
            <button type="button" onClick={() => setOpen(false)}>
              Save mark
            </button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

describe("dialog focus on close", () => {
  it("goes back to the button that opened the confirm, after Escape, Cancel and the action", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmFromButton onConfirm={onConfirm} />);
    const opener = screen.getByRole("button", { name: "Delete row" });

    await user.click(opener);
    await screen.findByRole("dialog", { name: "Delete this row?" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());

    await user.click(opener);
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }),
    );
    await waitFor(() => expect(opener).toHaveFocus());

    await user.click(opener);
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm" }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("goes back to the opener of a dialog that unmounts as it closes", async () => {
    const user = userEvent.setup();
    render(<MountedWhileOpen />);
    const opener = screen.getByRole("button", { name: "Change mark" });

    await user.click(opener);
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Save mark" }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("leaves focus to the caller when it moves focus itself", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Delete row
          </button>
          <h2 tabIndex={-1}>Rows</h2>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="Delete this row?"
            onConfirm={() => undefined}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              screen.getByRole("heading", { name: "Rows" }).focus();
            }}
          />
        </>
      );
    }
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Delete row" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm" }),
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Rows" })).toHaveFocus());
  });
});
