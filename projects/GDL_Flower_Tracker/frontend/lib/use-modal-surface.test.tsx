import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { useModalSurface } from "@/lib/use-modal-surface";

function ModalHarness() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useModalSurface<HTMLDivElement>(open, () => setOpen(false), closeRef);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <button type="button">Outside action</button>
      {open ? (
        <div ref={containerRef} role="dialog" aria-modal="true" aria-label="Test modal">
          <button ref={closeRef} type="button" onClick={() => setOpen(false)}>
            Close modal
          </button>
          <button type="button">Secondary action</button>
        </div>
      ) : null}
    </div>
  );
}

describe("useModalSurface", () => {
  it("traps focus and restores it to the trigger on close", async () => {
    render(<ModalHarness />);

    const trigger = screen.getByRole("button", { name: "Open modal" });
    const outside = screen.getByRole("button", { name: "Outside action" });

    trigger.focus();
    fireEvent.click(trigger);

    const close = await screen.findByRole("button", { name: "Close modal" });
    await waitFor(() => expect(close).toHaveFocus());

    outside.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
