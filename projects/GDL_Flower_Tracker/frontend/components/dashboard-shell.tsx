"use client";

import type { ActiveFilterChip, FilterState, InstallCapabilities, QuickIntent, RecommendationCardModel, ThemeMode } from "@/lib/types";
import { formatRelativeTime, formatShortDate } from "@/lib/dashboard";
import { StatPill } from "@/components/ui";

export function DashboardHeader({
  theme,
  onThemeToggle,
  onShare,
  onToggleOps,
  onInstall,
  opsOpen,
  installOpen,
  latestActivity,
  priceCoverage,
  savedViewCount,
  installCapabilities,
  onToggleSavedViews,
  savedViewsOpen,
}: {
  theme: ThemeMode;
  onThemeToggle: () => void;
  onShare: () => void;
  onToggleOps: () => void;
  onInstall: () => void;
  opsOpen: boolean;
  installOpen: boolean;
  latestActivity: string | null;
  priceCoverage: number | null | undefined;
  savedViewCount: number;
  installCapabilities: InstallCapabilities;
  onToggleSavedViews: () => void;
  savedViewsOpen: boolean;
}) {
  return (
    <header className="app-header app-shell-header">
      <div className="header-copy">
        <div className="eyebrow">Green Dot Labs · Colorado Springs</div>
        <h1>Find the right pickup faster.</h1>
        <p className="header-summary">
          Scan the local market, compare stores honestly, and reopen the latest snapshot even when your connection drops.
        </p>
        <div className="header-meta">
          <StatPill label="Freshness" value={latestActivity ? formatRelativeTime(latestActivity) : "No snapshot"} />
          <StatPill label="Coverage" value={priceCoverage != null ? `${priceCoverage}% priced` : "Coverage —"} />
          <StatPill label="Saved views" value={`${savedViewCount}`} />
          <StatPill label="Install" value={installCapabilities.isStandalone ? "Installed" : installCapabilities.isIOS ? "Add to Home Screen" : installCapabilities.isMacOS ? "Add to Dock" : "Install"} />
        </div>
      </div>
      <div className="shell-actions">
        <button type="button" className="btn btn-secondary" id="shareViewBtn" onClick={onShare}>Share view</button>
        <button
          type="button"
          className="btn btn-secondary"
          id="savedViewsBtn"
          aria-haspopup="dialog"
          aria-expanded={savedViewsOpen}
          aria-controls="savedViewsPanel"
          onClick={onToggleSavedViews}
        >
          Saved views
        </button>
        {!installCapabilities.isStandalone ? (
          <button
            type="button"
            className="btn btn-secondary"
            id="installAppBtn"
            aria-haspopup="dialog"
            aria-expanded={installOpen}
            aria-controls="installPromptDialog"
            onClick={onInstall}
          >
            {installCapabilities.canInstallPrompt ? "Install app" : "How to install"}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary"
          id="trackerOpsBtn"
          aria-haspopup="dialog"
          aria-expanded={opsOpen}
          aria-controls="trackerOpsPanel"
          onClick={onToggleOps}
        >
          Tracker Ops
        </button>
        <button type="button" className="btn btn-icon" data-theme-toggle onClick={onThemeToggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          {theme === "dark" ? "☼" : "☾"}
        </button>
      </div>
    </header>
  );
}

export function TabNav({
  activeTab,
  onChange,
}: {
  activeTab: FilterState["activeTab"];
  onChange: (tab: FilterState["activeTab"]) => void;
}) {
  return (
    <nav className="tab-bar" role="tablist" aria-label="Main navigation">
      {(["overview", "insights", "table", "map"] as const).map((tab) => (
        <button
          type="button"
          key={tab}
          className={`tab ${activeTab === tab ? "active" : ""}`}
          role="tab"
          id={`tab-${tab}`}
          aria-selected={activeTab === tab}
          aria-controls={`panel-${tab}`}
          data-tab={tab}
          onClick={() => onChange(tab)}
        >
          {tab[0].toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </nav>
  );
}

export function QuickIntentRow({
  intents,
  onApply,
}: {
  intents: QuickIntent[];
  onApply: (intent: QuickIntent) => void;
}) {
  return (
    <section className="intent-row" aria-label="Quick intents">
      {intents.map((intent) => (
        <button
          key={intent.id}
          type="button"
          className="intent-card"
          onClick={() => onApply(intent)}
          aria-label={`${intent.label}. ${intent.description}`}
        >
          <strong>{intent.label}</strong>
          <span className="intent-card-copy">{intent.description}</span>
        </button>
      ))}
    </section>
  );
}

export function FilterShelf({
  state,
  chips,
  searchDraft,
  resultCount,
  onSearchDraftChange,
  onPatch,
  onClear,
  rootId = "filterBar",
}: {
  state: FilterState;
  chips: ActiveFilterChip[];
  searchDraft: string;
  resultCount: number;
  onSearchDraftChange: (value: string) => void;
  onPatch: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  rootId?: string;
}) {
  return (
    <section className="filter-shelf" id={rootId}>
      <div className="filter-grid">
        <div className="filter-group">
          <label>Type</label>
          <div className="toggle-group" id="typeFilter">
            {(["ALL", "REC", "MED"] as const).map((value) => (
              <button key={value} type="button" className={`toggle-btn ${state.activeType === value ? "active" : ""}`} onClick={() => onPatch({ activeType: value })}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <label>Size</label>
          <div className="toggle-group" id="sizeFilter">
            {(["ALL", "3.5g", "7g", "14g", "28g"] as const).map((value) => (
              <button key={value} type="button" className={`toggle-btn ${state.activeSize === value ? "active" : ""}`} onClick={() => onPatch({ activeSize: value })}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group search-group">
          <label htmlFor="strainSearch">Search</label>
          <input id="strainSearch" value={searchDraft} onChange={(event) => onSearchDraftChange(event.target.value)} placeholder="Search strains or shops…" />
        </div>
        <div className="filter-group">
          <label htmlFor="sortSelect">Sort</label>
          <select
            id="sortSelect"
            value={state.sortField === "price" ? `price-${state.sortDir}` : state.sortField === "unitPrice" ? "unit-price" : state.sortField === "drop" ? "drop-date" : state.sortField}
            onChange={(event) => {
              const value = event.target.value;
              const patch =
                value === "unit-price"
                  ? { sortField: "unitPrice" as const, sortDir: "asc" as const }
                  : value === "price-desc"
                    ? { sortField: "price" as const, sortDir: "desc" as const }
                    : value === "price-asc"
                      ? { sortField: "price" as const, sortDir: "asc" as const }
                      : value === "drop-date"
                        ? { sortField: "drop" as const, sortDir: "desc" as const }
                        : { sortField: value as FilterState["sortField"], sortDir: "asc" as const };
              onPatch(patch);
            }}
          >
            <option value="distance">Distance</option>
            <option value="unit-price">$/g</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="strain">Strain A–Z</option>
            <option value="dispensary">Dispensary</option>
            <option value="size">Size</option>
            <option value="type">Type</option>
            <option value="thc">THC%</option>
            <option value="drop-date">Drop date</option>
          </select>
        </div>
      </div>
      <div className="filter-footer">
        <div className="filter-actions">
          <button type="button" id="pricedOnlyBtn" className={`btn btn-secondary ${state.pricedOnly ? "active" : ""}`} aria-pressed={state.pricedOnly} onClick={() => onPatch({ pricedOnly: !state.pricedOnly })}>
            {state.pricedOnly ? "Priced only ✓" : "Priced only"}
          </button>
          <button type="button" id="clearFiltersBtn" className="btn btn-secondary" onClick={onClear}>Reset view</button>
          <span id="resultCount" className="mono">{resultCount} rows</span>
        </div>
        <div className="chip-row">
          {chips.map((chip) => (
            <button key={chip.id} type="button" className="chip" onClick={() => onPatch(chip.removePatch)}>
              {chip.label} ×
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RecommendationGrid({
  recommendations,
  onFocus,
  offline,
}: {
  recommendations: RecommendationCardModel[];
  onFocus: (dispensary: string) => void;
  offline: boolean;
}) {
  return (
    <section className="recommendation-grid">
      {recommendations.map((item) => (
        <article key={item.kind} className="card recommendation-card" id={item.kind === "bestValue" ? "spotlightCard" : undefined}>
          <div className="card-eyebrow">{item.eyebrow}</div>
          <h3>{item.title}</h3>
          {item.row ? (
            <>
              <div className={`recommendation-price ${item.kind === "freshestDrop" ? "recommendation-price--meta" : ""}`}>
                {item.kind === "freshestDrop" ? formatShortDate(item.row.dropDate) : item.row.price != null ? `$${item.row.price.toFixed(2)}` : "No price"}
              </div>
              <strong>{item.row.strain}</strong>
              <p>{item.row.dispensary}</p>
              <p className="muted">{item.row.size} · {item.row.type} · {item.reason}</p>
              <div className="card-inline-actions">
                <button type="button" className="btn btn-secondary" onClick={() => onFocus(item.row!.dispensary)}>Focus store</button>
                {item.row.menuUrl ? (
                  offline ? (
                    <span className="btn btn-secondary" aria-disabled="true">Menu unavailable offline</span>
                  ) : (
                    <a className="btn btn-secondary" href={item.row.menuUrl} target="_blank" rel="noreferrer">Open menu</a>
                  )
                ) : null}
              </div>
            </>
          ) : (
            <p className="muted">{item.reason}</p>
          )}
        </article>
      ))}
    </section>
  );
}
