import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

describe("<ConfirmDialog />", () => {
  function setup(propsOverrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const utils = render(
      <ConfirmDialog
        open={true}
        title="Delete this meeting?"
        description="It cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...propsOverrides}
      />,
    );
    return { onConfirm, onCancel, ...utils };
  }

  it("renders title and description with the correct aria attributes", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Delete this meeting?")).toBeInTheDocument();
    expect(screen.getByText("It cannot be undone.")).toBeInTheDocument();
  });

  it("invokes onConfirm when the confirm button is clicked", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("invokes onCancel when Escape is pressed", () => {
    const { onCancel } = setup();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onCancel on Escape while loading", () => {
    const { onCancel } = setup({ loading: true });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("disables both buttons while loading and shows the spinner text", () => {
    setup({ loading: true });
    const cancel = screen.getByRole("button", { name: /cancel/i });
    const confirm = screen.getByRole("button", { name: /working/i });
    expect(cancel).toBeDisabled();
    expect(confirm).toBeDisabled();
  });

  it("renders nothing when open is false", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
