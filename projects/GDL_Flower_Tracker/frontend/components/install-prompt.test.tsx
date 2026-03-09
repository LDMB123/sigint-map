import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InstallPrompt } from "@/components/install-prompt";

describe("install prompt", () => {
  it("stays hidden until explicitly opened", () => {
    render(
      <InstallPrompt
        capabilities={{
          isStandalone: false,
          isIOS: false,
          isMacOS: false,
          isSafari: false,
          canInstallPrompt: true,
        }}
        visible={false}
        onInstall={() => undefined}
        onDismiss={() => undefined}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as an accessible dialog and focuses the close button", async () => {
    const onDismiss = vi.fn();
    render(
      <InstallPrompt
        capabilities={{
          isStandalone: false,
          isIOS: false,
          isMacOS: false,
          isSafari: false,
          canInstallPrompt: true,
        }}
        visible
        onInstall={() => undefined}
        onDismiss={onDismiss}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Install the tracker" });
    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(dialog).toHaveAttribute("aria-describedby", "installPromptCopy");
    await waitFor(() => expect(closeButton).toHaveFocus());
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("falls back to dialog copy for Safari-style install guidance", () => {
    render(
      <InstallPrompt
        capabilities={{
          isStandalone: false,
          isIOS: false,
          isMacOS: true,
          isSafari: true,
          canInstallPrompt: false,
        }}
        visible
        onInstall={() => undefined}
        onDismiss={() => undefined}
      />,
    );

    const dialog = screen.getAllByRole("dialog", { name: "Install the tracker" }).at(-1);
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/File → Add to Dock/i)).toBeInTheDocument();
    expect(dialog?.textContent).not.toContain("Install app");
  });
});
