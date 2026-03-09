"use client";

export function UpdateBanner({
  visible,
  onReload,
  onDismiss,
}: {
  visible: boolean;
  onReload: () => void;
  onDismiss: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="install-banner install-banner--update">
      <span>A newer app version is ready. Reload when convenient to pick it up.</span>
      <div className="disp-card-actions">
        <button type="button" className="btn btn-accent" onClick={onReload}>Reload</button>
        <button type="button" className="btn btn-secondary" onClick={onDismiss}>Later</button>
      </div>
    </div>
  );
}
