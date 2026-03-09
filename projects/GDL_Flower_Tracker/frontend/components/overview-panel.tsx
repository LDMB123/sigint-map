"use client";

import { lazy, Suspense, useEffect, useState } from "react";

import {
  getCompareCards,
  getFocusedDispensaryModel,
  getRecommendationCards,
  selectOverviewPreviewStores,
  formatDistance,
  formatPrice,
  formatRelativeTime,
  formatThc,
  formatUnitPrice,
} from "@/lib/dashboard";
import type {
  CompareCardModel,
  DashboardPayload,
  FocusedDispensaryModel,
  OverviewPreviewStoreModel,
  VisibleModel,
} from "@/lib/types";
import { useDeferredActivation } from "@/lib/use-deferred-activation";
import { RecommendationGrid } from "@/components/dashboard-shell";
import { SectionHeading, StatPill } from "@/components/ui";

const OverviewAnalytics = lazy(() =>
  import("@/components/overview-analytics").then((module) => ({ default: module.OverviewAnalytics })),
);

export function OverviewHero({
  storesInView,
  latestActivity,
  focusedStoreName,
}: {
  storesInView: number;
  latestActivity: string | null | undefined;
  focusedStoreName: string | null;
}) {
  return (
    <div className="status-band card overview-hero">
      <div>
        <div className="eyebrow">Market Status</div>
        <h2>Scan the current market, then choose a destination with confidence.</h2>
      </div>
      <div className="status-band-metrics">
        <StatPill label="Stores" value={String(storesInView)} />
        <StatPill label="Latest drop" value={latestActivity ? formatRelativeTime(latestActivity) : "—"} />
        <StatPill label="Focus" value={focusedStoreName || "None"} />
      </div>
    </div>
  );
}

export function CompareStrip({ cards }: { cards: CompareCardModel[] }) {
  return (
    <section className="compare-strip">
      <SectionHeading title="Quick Compare" subtitle="Three stable comparison anchors that stay honest while you scan." />
      <div className="compare-grid">
        {cards.map((card) => (
          <article key={card.kind} className="compare-card">
            <div className="compare-metric-label">{card.title}</div>
            <div className="compare-card-title">{card.dispensary?.name || "No match"}</div>
            <div className="compare-metric-value">
              {card.kind === "closestOption"
                ? card.dispensary?.distance != null
                  ? formatDistance(card.dispensary.distance)
                  : "—"
                : card.kind === "widestSelection"
                  ? card.dispensary
                    ? `${card.dispensary.uniqueStrainCount}`
                    : "—"
                  : card.dispensary?.minPrice != null
                    ? formatPrice(card.dispensary.minPrice)
                    : "—"}
            </div>
            <p className="compare-card-reason">{card.reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function OverviewAnalyticsSkeleton() {
  return (
    <div className="overview-analytics" data-testid="overview-analytics-skeleton">
      <article className="card analytics-card">
        <SectionHeading title="Top Strains" subtitle="Most widely visible matches across the current filtered market." />
        <div className="chart-wrap chart-wrap--compact analytics-placeholder" />
      </article>
      <article className="card analytics-card">
        <SectionHeading title="Price Range" subtitle="Average visible pricing by store for the currently dominant size." />
        <div className="chart-wrap chart-wrap--compact analytics-placeholder" />
      </article>
    </div>
  );
}

function DeferredOverviewAnalytics({ model }: { model: VisibleModel }) {
  const [activatedByScroll, setActivatedByScroll] = useState(false);
  const { activated, ref } = useDeferredActivation<HTMLDivElement>({
    enabled: activatedByScroll,
    mode: "visible-after-idle",
    rootMargin: "0px",
    threshold: 0.6,
  });

  useEffect(() => {
    const updateScrollState = () => {
      if (window.scrollY > 0) {
        setActivatedByScroll(true);
      }
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  return (
    <div ref={ref}>
      {activated ? (
        <Suspense fallback={<OverviewAnalyticsSkeleton />}>
          <OverviewAnalytics model={model} />
        </Suspense>
      ) : (
        <OverviewAnalyticsSkeleton />
      )}
    </div>
  );
}

export function FocusedStoreSummary({ focusedStore }: { focusedStore: FocusedDispensaryModel }) {
  return (
    <article id="focusedStoreOverviewSummary" className="focused-store-summary">
      <div>
        <div className="eyebrow">Focused Store</div>
        <div className="disp-name">{focusedStore.dispensary.name}</div>
        <p className="disp-card-subtitle">
          {formatDistance(focusedStore.dispensary.distance)} away · {focusedStore.dispensary.productCount} visible matches
        </p>
      </div>
      <div className="status-band-metrics">
        <StatPill label="Best price" value={focusedStore.bestPriceLabel} />
        <StatPill label="Unit" value={focusedStore.bestUnitPriceLabel} />
        <StatPill label="Coverage" value={`${focusedStore.coverage}% priced`} />
      </div>
    </article>
  );
}

export function StorePreviewSection({
  stores,
  focusedStore,
  onFocusStore,
  onOpenMap,
  onViewTable,
  offline,
}: {
  stores: OverviewPreviewStoreModel[];
  focusedStore: FocusedDispensaryModel | null;
  onFocusStore: (name: string) => void;
  onOpenMap: (name?: string) => void;
  onViewTable: () => void;
  offline: boolean;
}) {
  return (
    <section id="storePreviewSection" className="store-preview-section">
      <SectionHeading
        title="Store Preview"
        subtitle="A tighter shortlist for fast scanning. Full inventory stays in the table view."
        actions={
          <>
            <button type="button" className="btn btn-secondary" id="viewFullTableBtn" onClick={onViewTable}>View full table</button>
            <button type="button" className="btn btn-secondary" id="openMapListBtn" onClick={() => onOpenMap(focusedStore?.dispensary.name)}>
              Open destination list in map
            </button>
          </>
        }
      />
      {focusedStore ? <FocusedStoreSummary focusedStore={focusedStore} /> : null}
      <div className="dispensary-grid preview-grid">
        {stores.map((store) => {
          const { dispensary, coverage, topRows, summary } = store;
          const isSelected = focusedStore?.dispensary.name === dispensary.name;
          return (
            <article key={dispensary.name} data-dispensary={dispensary.name} className={`disp-card preview-card ${isSelected ? "is-selected" : ""}`}>
              <div className="disp-card-header">
                <div>
                  <div className="disp-name">{dispensary.name}</div>
                  <div className="disp-card-subtitle">
                    {formatDistance(dispensary.distance)} away · {summary}
                  </div>
                </div>
                <div className="disp-card-meta">
                  <span className="summary-pill">{dispensary.minPrice != null ? `from ${formatPrice(dispensary.minPrice)}` : "No price"}</span>
                  <span className="summary-pill">{coverage}% priced</span>
                </div>
              </div>
              <div className="disp-card-actions">
                <button type="button" className="btn btn-secondary" data-focus-store={dispensary.name} onClick={() => onFocusStore(dispensary.name)}>Focus store</button>
                <button type="button" className="btn btn-secondary" onClick={() => onOpenMap(dispensary.name)}>Open map</button>
                {dispensary.menuUrl ? (
                  offline ? (
                    <span className="btn btn-link" aria-disabled="true">Menu offline</span>
                  ) : (
                    <a className="btn btn-link" href={dispensary.menuUrl} target="_blank" rel="noreferrer">Open menu</a>
                  )
                ) : null}
              </div>
              <div className="disp-products">
                {topRows.map((product) => (
                  <div key={`${dispensary.name}-${product.strain}-${product.size}-${product.type}`} className="product-chip">
                    <strong className="strain-name">{product.strain}</strong>
                    <span className="size-chip">{product.size}</span>
                    <span className={`product-price ${product.price == null ? "product-price--muted" : ""}`}>
                      {product.price != null ? formatPrice(product.price) : "No price"}
                    </span>
                    <span className="product-unit">{formatUnitPrice(product.unitPrice)}</span>
                    <span className="product-unit">{formatThc(product.thcValue)}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function OverviewPanel({
  payload,
  model,
  selectedDispensary,
  isMobile,
  onFocusStore,
  onOpenMap,
  onViewTable,
  offline,
}: {
  payload: DashboardPayload | undefined;
  model: VisibleModel;
  selectedDispensary: string;
  isMobile: boolean;
  onFocusStore: (name: string) => void;
  onOpenMap: (name?: string) => void;
  onViewTable: () => void;
  offline: boolean;
}) {
  const recommendations = getRecommendationCards(model);
  const compareCards = getCompareCards(model);
  const focusedStore = getFocusedDispensaryModel(model, selectedDispensary || null);
  const previewStores = selectOverviewPreviewStores(model, isMobile ? 4 : 6, isMobile ? 2 : 3);
  const storesInView = model.dispensaries.length;

  return (
    <section id="panel-overview" className="tab-panel" role="tabpanel" aria-labelledby="tab-overview">
      <div className="stack-xl">
        <OverviewHero
          storesInView={storesInView}
          latestActivity={payload?.status?.lastActivity}
          focusedStoreName={focusedStore?.dispensary.name || null}
        />
        <RecommendationGrid recommendations={recommendations} onFocus={onFocusStore} offline={offline} />
        <CompareStrip cards={compareCards} />
        <DeferredOverviewAnalytics model={model} />
        <StorePreviewSection
          stores={previewStores}
          focusedStore={focusedStore}
          onFocusStore={onFocusStore}
          onOpenMap={onOpenMap}
          onViewTable={onViewTable}
          offline={offline}
        />
      </div>
    </section>
  );
}
