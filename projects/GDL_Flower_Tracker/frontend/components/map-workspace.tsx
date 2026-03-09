"use client";

import { formatDistance, getFocusedDispensaryModel, getMapSidebarItems, pluralize } from "@/lib/dashboard";
import type { DashboardPayload, VisibleModel } from "@/lib/types";
import { SectionHeading } from "@/components/ui";
import { MapPanel } from "@/components/map-panel";

export function MapWorkspace({
  payload,
  model,
  selectedDispensary,
  theme,
  offline,
  onSelect,
}: {
  payload: DashboardPayload;
  model: VisibleModel;
  selectedDispensary: string;
  theme: "dark" | "light";
  offline: boolean;
  onSelect: (name: string) => void;
}) {
  const sidebarItems = getMapSidebarItems(model);
  const focusedStore = getFocusedDispensaryModel(model, selectedDispensary || null);

  return (
    <section id="panel-map" className="tab-panel" role="tabpanel" aria-labelledby="tab-map">
      <div className="map-layout">
        <aside className="map-sidebar">
          <div className="map-sidebar-header">
            <SectionHeading title="Destination Chooser" subtitle="List-first ranking so the map stays supportive, not dominant." />
            <p id="mapSummary" className="muted">
              {sidebarItems.length} dispensaries mapped from the current view.
              {offline ? " Offline mode keeps the ranked list available even if tiles are unavailable." : ""}
            </p>
          </div>
          <div id="mapList" className="map-list">
            {sidebarItems.map((item) => (
              <button
                key={item.dispensary.name}
                type="button"
                className={`map-list-card ${item.dispensary.name === selectedDispensary ? "active" : ""}`}
                onClick={() => onSelect(item.dispensary.name)}
              >
                <div>
                  <div className="disp-name">{item.dispensary.name}</div>
                  <div className="disp-card-subtitle">
                    {formatDistance(item.dispensary.distance)} · {pluralize(item.dispensary.productCount, "product")}
                  </div>
                </div>
                <div className="disp-card-meta">
                  <span className="summary-pill">{item.badge}</span>
                  <span className="summary-pill">{item.coverage}% priced</span>
                </div>
              </button>
            ))}
          </div>
        </aside>
        <div className="map-stage">
          <MapPanel
            payload={payload}
            visibleDispensaries={sidebarItems}
            theme={theme}
            selectedDispensary={selectedDispensary}
            onSelect={onSelect}
            offline={offline}
          />
        </div>
      </div>
      {focusedStore ? (
        <article id="focusedStoreMapDetail" className="card map-detail-card">
          <SectionHeading title="Focused Store Summary" subtitle="Why this stop is worth the drive right now." />
          <div className="focused-store-grid">
            <div>
              <div className="disp-name">{focusedStore.dispensary.name}</div>
              <div className="disp-card-subtitle">
                {formatDistance(focusedStore.dispensary.distance)} away · {focusedStore.bestPriceLabel}
              </div>
            </div>
            <div className="status-band-metrics">
              <span className="summary-pill">{focusedStore.coverage}% priced</span>
              <span className="summary-pill">{focusedStore.dispensary.productCount} visible products</span>
              <span className="summary-pill">{focusedStore.bestUnitPriceLabel}</span>
            </div>
          </div>
        </article>
      ) : null}
    </section>
  );
}
