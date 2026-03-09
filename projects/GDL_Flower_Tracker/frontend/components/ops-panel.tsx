"use client";

import { useRef } from "react";

import { formatRelativeTime } from "@/lib/dashboard";
import type { DashboardPayload } from "@/lib/types";
import { useModalSurface } from "@/lib/use-modal-surface";
import { SectionHeading } from "@/components/ui";

export function OpsPanel({
  payload,
  open,
  actionPending,
  onClose,
  onRun,
  offline,
}: {
  payload: DashboardPayload | undefined;
  open: boolean;
  actionPending: boolean;
  onClose: () => void;
  onRun: (kind: "refresh" | "sync" | "scrape") => void;
  offline: boolean;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useModalSurface<HTMLElement>(open, onClose, closeButtonRef);

  if (!open) return null;
  const adminEnabled = payload?.status?.adminActionsEnabled ?? true;
  const disabledMessage = offline
    ? "Admin actions are unavailable offline."
    : payload?.status?.adminActionsMessage || "";

  return (
    <aside
      id="trackerOpsPanel"
      ref={containerRef}
      className={`sheet ${open ? "sheet--open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Tracker Ops"
    >
      <div className="sheet-header">
        <SectionHeading title="Tracker Ops" subtitle="Operational controls are intentionally separate from shopper controls." />
        <button ref={closeButtonRef} type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
      {(disabledMessage || !adminEnabled) ? (
        <div id="adminActionsNotice" className="app-alert">{disabledMessage || "Admin actions are disabled."}</div>
      ) : null}
      <div className="activity-list">
        <div className="activity-item">
          <div>
              <div className="activity-title">Latest success</div>
              <div className="activity-meta">
              {payload?.status?.lastActivity ? formatRelativeTime(payload.status.lastActivity) : "No successful run recorded"}
              </div>
          </div>
        </div>
        <div className="activity-item">
          <div>
            <div className="activity-title">Job runner</div>
            <div className="activity-meta">{payload?.status?.jobRunning ? "A job is currently running" : "Idle"}</div>
          </div>
        </div>
      </div>
      <div className="ops-actions">
        <button id="refreshBtn" type="button" className="btn btn-accent" disabled={!adminEnabled || offline || actionPending} onClick={() => onRun("refresh")}>
          Refresh
        </button>
        <button id="syncBtn" type="button" className="btn btn-secondary" disabled={!adminEnabled || offline || actionPending} onClick={() => onRun("sync")}>
          Sync
        </button>
        <button id="scrapeBtn" type="button" className="btn btn-secondary" disabled={!adminEnabled || offline || actionPending} onClick={() => onRun("scrape")}>
          Scrape
        </button>
      </div>
    </aside>
  );
}
