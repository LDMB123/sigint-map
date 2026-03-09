"use client";

import dynamic from "next/dynamic";
import { Suspense, lazy, startTransition, useEffect, useRef, useState } from "react";
import { useDeferredValue } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchDashboardShell, fetchJobs, fetchPriceHistory, postRefresh, postScrape, postSync } from "@/lib/api";
import {
  QUICK_INTENTS,
  DEFAULT_STATE,
  buildActiveFilterChips,
  buildCSV,
  buildUrlFromState,
  buildVisibleModel,
  formatRelativeTime,
  getActionSummary,
  getEmptyStateReason,
  getFreshestTimestamp,
  loadStoredState,
  parseStateFromSearchParams,
  persistState,
} from "@/lib/dashboard";
import { useDeferredActivation } from "@/lib/use-deferred-activation";
import { useModalSurface } from "@/lib/use-modal-surface";
import { useDashboardLifecycle } from "@/lib/use-dashboard-lifecycle";
import {
  deleteSavedView,
  getLatestSnapshot,
  listSavedViews,
  saveSnapshot,
  setInstallPref,
  upsertSavedView,
} from "@/lib/storage";
import type { DashboardPayload, FilterState, QuickIntent, SavedView } from "@/lib/types";
import { DashboardHeader, FilterShelf, QuickIntentRow, TabNav } from "@/components/dashboard-shell";
import { HeroSceneShell } from "@/components/hero-scene-shell";
import { InstallPrompt } from "@/components/install-prompt";
import { TablePanel } from "@/components/table-panel";
import { UpdateBanner } from "@/components/update-banner";

const OverviewPanel = lazy(() => import("@/components/overview-panel").then((module) => ({ default: module.OverviewPanel })));
const InsightsPanel = lazy(() => import("@/components/insights-panel").then((module) => ({ default: module.InsightsPanel })));
const OpsPanel = dynamic(() => import("@/components/ops-panel").then((module) => module.OpsPanel), {
  loading: () => null,
});
const SavedViewsPanel = dynamic(() => import("@/components/saved-views-panel").then((module) => module.SavedViewsPanel), {
  loading: () => null,
});
const MapWorkspace = dynamic(() => import("@/components/map-workspace").then((module) => module.MapWorkspace), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});

function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.resolve();
}

function downloadText(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function OverviewPanelSkeleton() {
  return (
    <section id="panel-overview" className="tab-panel" role="tabpanel" aria-labelledby="tab-overview" aria-busy="true">
      <div className="overview-panel-skeleton">
        <div className="card overview-skeleton-block overview-skeleton-block--hero analytics-placeholder" />
        <div className="overview-skeleton-grid">
          <div className="card overview-skeleton-block analytics-placeholder" />
          <div className="card overview-skeleton-block analytics-placeholder" />
          <div className="card overview-skeleton-block analytics-placeholder" />
        </div>
        <div className="card overview-skeleton-block overview-skeleton-block--preview analytics-placeholder" />
      </div>
    </section>
  );
}

function readDashboardStateFromLocation() {
  const stored = loadStoredState();
  if (typeof window === "undefined") return stored;
  return { ...stored, ...parseStateFromSearchParams(new URLSearchParams(window.location.search)) };
}

function useDashboardState() {
  const [state, setState] = useState<FilterState>(() => readDashboardStateFromLocation());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncStateFromLocation = () => {
      const next = readDashboardStateFromLocation();
      setState((current) => (buildUrlFromState(current) === buildUrlFromState(next) ? current : next));
    };

    window.addEventListener("popstate", syncStateFromLocation);
    return () => window.removeEventListener("popstate", syncStateFromLocation);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    persistState(state);
    document.documentElement.dataset.theme = state.theme;
    const query = buildUrlFromState(state);
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      startTransition(() => {
        window.history.replaceState(window.history.state, "", nextUrl);
      });
    }
  }, [state]);

  return [state, setState] as const;
}

export function DashboardApp() {
  const queryClient = useQueryClient();
  const [state, setState] = useDashboardState();
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedDispensary, setSelectedDispensary] = useState("");
  const [opsOpen, setOpsOpen] = useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<{ payload: DashboardPayload; capturedAt: string } | null>(null);
  const [retainHeroScene, setRetainHeroScene] = useState(false);
  const latestSnapshotRef = useRef<typeof latestSnapshot>(null);
  const [installVisible, setInstallVisible] = useState(false);
  const filterCloseRef = useRef<HTMLButtonElement | null>(null);
  const filterSheetRef = useModalSurface<HTMLDivElement>(filtersOpen, () => setFiltersOpen(false), filterCloseRef);
  const deferredSearch = useDeferredValue(searchDraft);
  const {
    installCapabilities,
    installPromptRef,
    isMobile,
    isOffline,
    setUpdateReady,
    updateReady,
  } = useDashboardLifecycle(queryClient);

  useEffect(() => {
    setSearchDraft(state.searchQuery);
  }, [state.searchQuery]);

  useEffect(() => {
    if (deferredSearch === state.searchQuery) return;
    setState((current) => ({ ...current, searchQuery: deferredSearch }));
  }, [deferredSearch, setState, state.searchQuery]);

  useEffect(() => {
    void listSavedViews().then(setSavedViews);
    void getLatestSnapshot().then(setLatestSnapshot);
  }, []);

  useEffect(() => {
    latestSnapshotRef.current = latestSnapshot;
  }, [latestSnapshot]);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "shell"],
    queryFn: fetchDashboardShell,
    placeholderData: (previous) => previous,
    retry: 1,
    refetchInterval: (query) => (query.state.data?.status?.jobRunning ? 4_000 : false),
  });

  const historyQuery = useQuery({
    queryKey: ["dashboard", "history"],
    queryFn: () => fetchPriceHistory(),
    enabled: state.activeTab === "insights",
    placeholderData: (previous) => previous,
    retry: 1,
  });

  const jobsQuery = useQuery({
    queryKey: ["dashboard", "jobs"],
    queryFn: () => fetchJobs(),
    enabled: state.activeTab === "insights",
    placeholderData: (previous) => previous,
    retry: 1,
  });

  useEffect(() => {
    if (dashboardQuery.data) {
      const snapshotPayload = {
        ...dashboardQuery.data,
        history: latestSnapshotRef.current?.payload.history ?? dashboardQuery.data.history ?? [],
        jobs: latestSnapshotRef.current?.payload.jobs ?? dashboardQuery.data.jobs ?? [],
      };

      void saveSnapshot(snapshotPayload);
      setLatestSnapshot({
        payload: snapshotPayload,
        capturedAt: new Date().toISOString(),
      });
    }
  }, [dashboardQuery.data]);

  useEffect(() => {
    if (!dashboardQuery.data) return;
    if (!historyQuery.data && !jobsQuery.data) return;

    const mergedPayload = {
      ...dashboardQuery.data,
      history: historyQuery.data ?? latestSnapshotRef.current?.payload.history ?? [],
      jobs: jobsQuery.data?.jobs ?? latestSnapshotRef.current?.payload.jobs ?? [],
    };

    void saveSnapshot(mergedPayload);
    setLatestSnapshot({
      payload: mergedPayload,
      capturedAt: new Date().toISOString(),
    });
  }, [dashboardQuery.data, historyQuery.data, jobsQuery.data]);

  const payload = dashboardQuery.data || latestSnapshot?.payload;
  const insightsPayload = payload
    ? {
        ...payload,
        history: historyQuery.data ?? payload.history ?? latestSnapshot?.payload.history ?? [],
        jobs: jobsQuery.data?.jobs ?? payload.jobs ?? latestSnapshot?.payload.jobs ?? [],
      }
    : undefined;
  const isInitialLoad = dashboardQuery.isLoading && !payload;
  const model = buildVisibleModel(payload, state);
  const activeFilterChips = buildActiveFilterChips(state);
  const freshest = getFreshestTimestamp(payload);
  const actionSummary = getActionSummary(payload?.status, payload?.scrapeStatus);
  const emptyState =
    state.activeTab === "table"
      ? getEmptyStateReason(model, state, [])
      : null;
  const insightsHistoryLoading =
    state.activeTab === "insights" &&
    historyQuery.isLoading &&
    payload?.history == null &&
    latestSnapshot?.payload.history == null;
  const insightsJobsLoading =
    state.activeTab === "insights" &&
    jobsQuery.isLoading &&
    payload?.jobs == null &&
    latestSnapshot?.payload.jobs == null;
  const { activated: overviewReady, ref: overviewRef } = useDeferredActivation<HTMLDivElement>({
    enabled: !isInitialLoad && state.activeTab === "overview",
    mode: "visible-after-idle",
    minimumDelayMs: 250,
    idleTimeoutMs: 1_500,
    rootMargin: "0px",
    threshold: 0.15,
  });
  const heroVisible = state.activeTab === "overview";

  useEffect(() => {
    if (!isInitialLoad && heroVisible) {
      setRetainHeroScene(true);
    }
  }, [heroVisible, isInitialLoad]);

  useEffect(() => {
    if (selectedDispensary && !model.dispensaries.some((dispensary) => dispensary.name === selectedDispensary)) {
      setSelectedDispensary("");
    }
  }, [model.dispensaries, selectedDispensary]);

  const action = useMutation({
    mutationFn: async (kind: "refresh" | "sync" | "scrape") => {
      if (kind === "refresh") return postRefresh();
      if (kind === "sync") return postSync();
      return postScrape();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const latestActivity = payload?.status?.lastActivity || freshest;
  const shareView = async () => {
    const params = buildUrlFromState(state);
    const url = `${window.location.origin}${window.location.pathname}${params ? `?${params}` : ""}`;
    await copyText(url);
  };

  const exportRows = (format: "csv" | "json") => {
    if (!model.rows.length) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (format === "csv") {
      downloadText(`gdl-flower-tracker-${timestamp}.csv`, buildCSV(model.rows), "text/csv;charset=utf-8");
      return;
    }
    downloadText(`gdl-flower-tracker-${timestamp}.json`, JSON.stringify(model.rows, null, 2), "application/json;charset=utf-8");
  };

  const applyIntent = (intent: QuickIntent) => {
    setState((current) => ({ ...current, ...intent.patch }));
  };

  const saveCurrentView = async (name: string, nextState: FilterState) => {
    const now = new Date().toISOString();
    await upsertSavedView({
      id: crypto.randomUUID(),
      name,
      state: nextState,
      createdAt: now,
      updatedAt: now,
    });
    setSavedViews(await listSavedViews());
  };

  const runInstall = async () => {
    if (!installPromptRef.current) return;
    await installPromptRef.current.prompt();
    const choice = installPromptRef.current.userChoice ? await installPromptRef.current.userChoice : null;
    if (!choice || choice.outcome === "accepted") {
      setInstallVisible(false);
      await setInstallPref("install-dismissed", "true");
    }
  };

  const dismissInstall = async () => {
    setInstallVisible(false);
    await setInstallPref("install-dismissed", "true");
  };

  return (
    <main className="page-shell" aria-busy={isInitialLoad}>
      <InstallPrompt capabilities={installCapabilities} visible={installVisible} onInstall={runInstall} onDismiss={dismissInstall} />
      <UpdateBanner visible={updateReady} onReload={() => window.location.reload()} onDismiss={() => setUpdateReady(false)} />

      <DashboardHeader
        theme={state.theme}
        onThemeToggle={() => setState((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))}
        onShare={shareView}
        onToggleOps={() => setOpsOpen(true)}
        onInstall={() => setInstallVisible(true)}
        opsOpen={opsOpen}
        installOpen={installVisible}
        latestActivity={latestActivity || null}
        priceCoverage={payload?.scrapeStatus?.priceCoverage}
        savedViewCount={savedViews?.length || 0}
        installCapabilities={installCapabilities}
        onToggleSavedViews={() => setSavedViewsOpen(true)}
        savedViewsOpen={savedViewsOpen}
      />

      <section className="hero-shell">
        <div className="hero-copy">
          <p className="hero-summary">
            Decision-first mode is active: quick intents, stable recommendation logic, ranked stores, and offline snapshot browsing.
          </p>
          <div className="header-meta">
            <span id="lastUpdated" className="pill">{latestActivity ? `Updated ${formatRelativeTime(latestActivity)}` : "Updated —"}</span>
            <span id="priceCoverage" className="pill">{payload?.scrapeStatus?.priceCoverage != null ? `${payload.scrapeStatus.priceCoverage}% priced` : "Coverage —"}</span>
            <span id="dataFreshness" className="pill">{freshest ? `Freshness ${formatRelativeTime(freshest)}` : "Freshness —"}</span>
            {isOffline ? <span className="pill">Offline snapshot</span> : null}
            {actionSummary ? <span className="pill">{actionSummary}</span> : null}
          </div>
        </div>
        {heroVisible || retainHeroScene ? (
          <div className="hero-scene-wrap" aria-hidden="true">
            {isInitialLoad && heroVisible ? (
              <div className="hero-scene-shell">
                <div className="hero-fallback" data-testid="hero-scene-fallback" />
              </div>
            ) : (
              <div hidden={!heroVisible}>
                <HeroSceneShell active={heroVisible} />
              </div>
            )}
          </div>
        ) : null}
      </section>

      <TabNav activeTab={state.activeTab} onChange={(activeTab) => setState((current) => ({ ...current, activeTab }))} />
      {state.activeTab === "overview" ? <QuickIntentRow intents={QUICK_INTENTS} onApply={applyIntent} /> : null}
      {isMobile ? (
        <>
          <div className="mobile-filter-row" id="filterBar">
            <div className="header-meta">
              <span id="mobileResultCount" className="mono">{model.rows.length} rows</span>
              {activeFilterChips.slice(0, 2).map((chip) => <span key={chip.id} className="summary-pill">{chip.label}</span>)}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              aria-controls="filterSheet"
              onClick={() => setFiltersOpen(true)}
            >
              Filters
            </button>
          </div>
          {filtersOpen ? (
          <div
            id="filterSheet"
            ref={filterSheetRef}
            className={`sheet ${filtersOpen ? "sheet--open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className="sheet-header">
              <div className="section-heading">
                <div>
                  <h3>Filters</h3>
                  <p>Primary filters, search, and sorting for the current view.</p>
                </div>
              </div>
              <button ref={filterCloseRef} type="button" className="btn btn-secondary" onClick={() => setFiltersOpen(false)}>Close</button>
            </div>
            <FilterShelf
              state={state}
              chips={activeFilterChips}
              searchDraft={searchDraft}
              resultCount={model.rows.length}
              rootId="filterSheetContent"
              onSearchDraftChange={setSearchDraft}
              onPatch={(patch) => setState((current) => ({ ...current, ...patch }))}
              onClear={() => setState((current) => ({ ...DEFAULT_STATE, theme: current.theme, activeTab: current.activeTab }))}
            />
          </div>
          ) : null}
        </>
      ) : (
        <FilterShelf
          state={state}
          chips={activeFilterChips}
          searchDraft={searchDraft}
          resultCount={model.rows.length}
          onSearchDraftChange={setSearchDraft}
          onPatch={(patch) => setState((current) => ({ ...current, ...patch }))}
          onClear={() => setState((current) => ({ ...DEFAULT_STATE, theme: current.theme, activeTab: current.activeTab }))}
        />
      )}

      {isInitialLoad ? (
        <section id={`panel-${state.activeTab}`} className="tab-panel" role="tabpanel" aria-labelledby={`tab-${state.activeTab}`}>
          <div className="map-loading">Loading tracker…</div>
        </section>
      ) : null}

      {!isInitialLoad && state.activeTab === "overview" ? (
        <div ref={overviewRef}>
          {overviewReady ? (
            <Suspense fallback={<OverviewPanelSkeleton />}>
              <OverviewPanel
                payload={payload}
                model={model}
                selectedDispensary={selectedDispensary}
                isMobile={isMobile}
                onFocusStore={setSelectedDispensary}
                onOpenMap={(name) => {
                  if (name) setSelectedDispensary(name);
                  setState((current) => ({ ...current, activeTab: "map" }));
                }}
                onViewTable={() => setState((current) => ({ ...current, activeTab: "table" }))}
                offline={isOffline}
              />
            </Suspense>
          ) : (
            <OverviewPanelSkeleton />
          )}
        </div>
      ) : null}

      {!isInitialLoad && state.activeTab === "insights" ? (
        <Suspense fallback={<section id="panel-insights" className="tab-panel" role="tabpanel" aria-labelledby="tab-insights"><div className="map-loading">Loading insights…</div></section>}>
          <InsightsPanel
            payload={insightsPayload}
            state={state}
            historyLoading={insightsHistoryLoading}
            jobsLoading={insightsJobsLoading}
          />
        </Suspense>
      ) : null}

      {!isInitialLoad && state.activeTab === "table" ? (
        <TablePanel
          rows={model.rows}
          activeFilterChips={activeFilterChips}
          emptyState={emptyState || "noResults"}
          onExport={exportRows}
          onFocusStore={setSelectedDispensary}
          isMobile={isMobile}
        />
      ) : null}

      {!isInitialLoad && state.activeTab === "map" && payload ? (
        <MapWorkspace
          payload={payload}
          model={model}
          selectedDispensary={selectedDispensary}
          theme={state.theme}
          offline={isOffline}
          onSelect={setSelectedDispensary}
        />
      ) : null}

      {opsOpen ? (
        <OpsPanel
          payload={payload}
          open={opsOpen}
          actionPending={action.isPending}
          onClose={() => setOpsOpen(false)}
          onRun={(kind) => action.mutate(kind)}
          offline={isOffline}
        />
      ) : null}

      {savedViewsOpen ? (
        <SavedViewsPanel
          open={savedViewsOpen}
          savedViews={savedViews || []}
          currentState={state}
          onClose={() => setSavedViewsOpen(false)}
          onSave={saveCurrentView}
          onApply={(view) => setState(view.state)}
          onDelete={(id) => {
            void (async () => {
              await deleteSavedView(id);
              setSavedViews(await listSavedViews());
            })();
          }}
        />
      ) : null}
    </main>
  );
}
