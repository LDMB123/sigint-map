"use client";

import { useRef } from "react";

import type { InstallCapabilities } from "@/lib/types";
import { useModalSurface } from "@/lib/use-modal-surface";

export function InstallPrompt({
  capabilities,
  visible,
  onInstall,
  onDismiss,
}: {
  capabilities: InstallCapabilities;
  visible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useModalSurface<HTMLDivElement>(visible && !capabilities.isStandalone, onDismiss, closeButtonRef);

  if (!visible || capabilities.isStandalone) return null;

  let copy = "Install this tracker for a faster app-like launch experience.";
  let title = "Install the tracker";

  if (capabilities.canInstallPrompt) {
    copy = "Install this tracker in your browser for a standalone desktop experience.";
  } else if (capabilities.isIOS) {
    copy = "On iPhone, use Share → Add to Home Screen to install this tracker.";
  } else if (capabilities.isMacOS && capabilities.isSafari) {
    copy = "In Safari on macOS, use File → Add to Dock to install this tracker.";
  } else if (capabilities.isMacOS) {
    title = "Install or pin the tracker";
  }

  return (
    <div
      id="installPromptDialog"
      ref={containerRef}
      className={`sheet sheet--open install-sheet`}
      aria-modal="true"
      role="dialog"
      aria-labelledby="installPromptTitle"
      aria-describedby="installPromptCopy"
    >
      <div className="sheet-header">
        <div className="section-heading">
          <div>
            <h3 id="installPromptTitle">{title}</h3>
            <p id="installPromptCopy">{copy}</p>
          </div>
        </div>
        <button ref={closeButtonRef} type="button" className="btn btn-secondary" onClick={onDismiss}>Close</button>
      </div>
      <div className="disp-card-actions">
        {capabilities.canInstallPrompt ? (
          <button type="button" className="btn btn-accent" onClick={onInstall}>Install app</button>
        ) : null}
        <button type="button" className="btn btn-secondary" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
