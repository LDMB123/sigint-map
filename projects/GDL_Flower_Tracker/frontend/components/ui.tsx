"use client";

import type { ReactNode } from "react";

export function SectionHeading({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}
