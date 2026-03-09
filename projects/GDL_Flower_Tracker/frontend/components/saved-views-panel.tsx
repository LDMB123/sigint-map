"use client";

import { useRef, useState } from "react";

import { formatRelativeTime } from "@/lib/dashboard";
import type { FilterState, SavedView } from "@/lib/types";
import { useModalSurface } from "@/lib/use-modal-surface";
import { SectionHeading } from "@/components/ui";

export function SavedViewsPanel({
  open,
  savedViews,
  currentState,
  onClose,
  onSave,
  onApply,
  onDelete,
}: {
  open: boolean;
  savedViews: SavedView[];
  currentState: FilterState;
  onClose: () => void;
  onSave: (label: string, state: FilterState) => void;
  onApply: (view: SavedView) => void;
  onDelete: (id: string) => void;
}) {
  const [draftLabel, setDraftLabel] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useModalSurface<HTMLElement>(open, onClose, inputRef);

  if (!open) return null;

  return (
    <aside
      id="savedViewsPanel"
      ref={containerRef}
      className={`sheet ${open ? "sheet--open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Saved Views"
    >
      <div className="sheet-header">
        <SectionHeading title="Saved Views" subtitle="Local-device view presets that continue to work offline." />
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
      <form
        className="saved-view-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draftLabel.trim()) return;
          onSave(draftLabel.trim(), currentState);
          setDraftLabel("");
        }}
      >
        <input
          ref={inputRef}
          aria-label="Saved view name"
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          placeholder="Weekend MED scan"
        />
        <button type="submit" className="btn btn-accent">Save current view</button>
      </form>
      <div className="activity-list">
        {savedViews.length ? savedViews.map((view) => (
          <div key={view.id} className="activity-item">
            <div>
              <div className="activity-title">{view.name}</div>
              <div className="activity-meta">Updated {formatRelativeTime(view.updatedAt)}</div>
            </div>
            <div className="disp-card-actions">
              <button type="button" className="btn btn-secondary" onClick={() => onApply(view)}>Apply</button>
              <button type="button" className="btn btn-secondary" onClick={() => onDelete(view.id)}>Delete</button>
            </div>
          </div>
        )) : <p className="muted">No saved views yet.</p>}
      </div>
    </aside>
  );
}
