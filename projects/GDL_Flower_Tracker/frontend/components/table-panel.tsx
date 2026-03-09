"use client";

import { formatDistance, formatPrice, formatThc, formatUnitPrice } from "@/lib/dashboard";
import type { ActiveFilterChip, EmptyStateReason, VisibleRow } from "@/lib/types";
import { EmptyState, SectionHeading } from "@/components/ui";

export function TablePanel({
  rows,
  activeFilterChips,
  emptyState,
  onExport,
  onFocusStore,
  isMobile,
}: {
  rows: VisibleRow[];
  activeFilterChips: ActiveFilterChip[];
  emptyState: EmptyStateReason;
  onExport: (format: "csv" | "json") => void;
  onFocusStore: (name: string) => void;
  isMobile: boolean;
}) {
  return (
    <section id="panel-table" className="tab-panel" role="tabpanel" aria-labelledby="tab-table">
      <div className="panel-toolbar">
        <div>
          <SectionHeading title="Table Workspace" subtitle="The dense, exportable view of the current filtered market." />
          <div className="chip-row">
            {activeFilterChips.length ? activeFilterChips.map((chip) => <span key={chip.id} className="summary-pill">{chip.label}</span>) : <span className="summary-pill">All visible results</span>}
          </div>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-secondary" onClick={() => onExport("csv")}>Export CSV</button>
          <button type="button" className="btn btn-secondary" onClick={() => onExport("json")}>Export JSON</button>
        </div>
      </div>

      {!rows.length ? (
        <article className="card">
          <EmptyState
            title="No rows"
            message={
              emptyState === "noPricedResults"
                ? "No priced results match the current view."
                : emptyState === "noHistory"
                  ? "No history data matches the current slice."
                  : "No rows match the current filters."
            }
          />
        </article>
      ) : isMobile ? (
        <div className="mobile-table-list">
          {rows.map((row) => (
            <article key={`${row.dispensary}-${row.strain}-${row.size}-${row.type}`} className="mobile-table-card">
              <div className="disp-card-header">
                <div>
                  <div className="disp-name">{row.strain}</div>
                  <div className="disp-card-subtitle">
                    {row.dispensary} · {row.type} · {row.size}
                  </div>
                </div>
                <button type="button" className="btn btn-secondary" onClick={() => onFocusStore(row.dispensary)}>
                  Focus
                </button>
              </div>
              <div className="mobile-table-metrics">
                <span className="summary-pill">{row.price != null ? formatPrice(row.price) : "No price"}</span>
                <span className="summary-pill">{formatUnitPrice(row.unitPrice)}</span>
                <span className="summary-pill">{formatDistance(row.distance)}</span>
                <span className="summary-pill">{formatThc(row.thcValue)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Strain</th>
                <th>Store</th>
                <th>Type</th>
                <th>Size</th>
                <th>Price</th>
                <th>Unit</th>
                <th>Distance</th>
                <th>THC</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.dispensary}-${row.strain}-${row.size}-${row.type}`}>
                  <td>{row.strain}</td>
                  <td>{row.dispensary}</td>
                  <td>{row.type}</td>
                  <td>{row.size}</td>
                  <td className="td-price">{row.price != null ? formatPrice(row.price) : "No price"}</td>
                  <td>{formatUnitPrice(row.unitPrice)}</td>
                  <td>{formatDistance(row.distance)}</td>
                  <td>{formatThc(row.thcValue)}</td>
                  <td>
                    <button type="button" className="btn btn-secondary" onClick={() => onFocusStore(row.dispensary)}>
                      Focus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
