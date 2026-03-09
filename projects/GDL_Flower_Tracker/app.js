/* ===== APP.JS — GDL Flower Tracker (polished) ===== */

const API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:8000" : "";
const STORAGE_KEY = "gdl-flower-tracker:v4";
const DASHBOARD_PATH = "/api/dashboard?history_limit=1500&job_limit=12";
const REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_STATE = {
  activeTab: "overview",
  activeType: "ALL",
  activeSize: "ALL",
  pricedOnly: false,
  searchQuery: "",
  sortField: "distance",
  sortDir: "asc",
  theme: "dark",
  historyType: "ALL",
  historySize: "ALL",
};

const VALID_SORT_FIELDS = new Set(["distance", "unitPrice", "price", "strain", "dispensary", "size", "type", "thc", "drop"]);
const SORT_OPTION_MAP = {
  distance: { field: "distance", dir: "asc" },
  "unit-price": { field: "unitPrice", dir: "asc" },
  unitprice: { field: "unitPrice", dir: "asc" },
  "price-asc": { field: "price", dir: "asc" },
  "price-desc": { field: "price", dir: "desc" },
  strain: { field: "strain", dir: "asc" },
  dispensary: { field: "dispensary", dir: "asc" },
  size: { field: "size", dir: "asc" },
  type: { field: "type", dir: "asc" },
  thc: { field: "thc", dir: "asc" },
  "drop-date": { field: "drop", dir: "desc" },
  dropdate: { field: "drop", dir: "desc" },
};
const runtimeHelpers = window.GDLTrackerModules?.runtime;
const statusHelpers = window.GDLTrackerModules?.status;

if (!runtimeHelpers || !statusHelpers) {
  throw new Error("GDL helper modules failed to load.");
}

const { average, getUnitPrice, sizeToGrams, toNumber } = runtimeHelpers;
const { formatActivityCopy, formatRefreshCopy } = statusHelpers;

function normalizeSortState(field, dir = DEFAULT_STATE.sortDir) {
  const rawField = String(field || DEFAULT_STATE.sortField).trim();
  const rawDir = dir === "desc" ? "desc" : "asc";

  if (SORT_OPTION_MAP[rawField]) {
    return {
      field: SORT_OPTION_MAP[rawField].field,
      dir: rawField === "unitprice" || rawField === "dropdate" ? rawDir : SORT_OPTION_MAP[rawField].dir,
    };
  }

  return {
    field: VALID_SORT_FIELDS.has(rawField) ? rawField : DEFAULT_STATE.sortField,
    dir: rawDir,
  };
}

let appData = null;
let dashboardStats = null;
let scrapeStatusData = null;
let apiStatusData = null;
let priceHistoryData = [];
let jobRunsData = [];
let selectedDispensaryName = "";

let activeTab = DEFAULT_STATE.activeTab;
let activeType = DEFAULT_STATE.activeType;
let activeSize = DEFAULT_STATE.activeSize;
let pricedOnly = DEFAULT_STATE.pricedOnly;
let searchQuery = DEFAULT_STATE.searchQuery;
let sortField = DEFAULT_STATE.sortField;
let sortDir = DEFAULT_STATE.sortDir;
let theme = DEFAULT_STATE.theme;
let historyType = DEFAULT_STATE.historyType;
let historySize = DEFAULT_STATE.historySize;

let map = null;
let mapTileLayer = null;
let radiusCircle = null;
let mapMarkers = [];
let mapMarkerIndex = new Map();
const charts = {
  strain: null,
  price: null,
  history: null,
};

let autoRefreshTimer = null;
let jobPollTimer = null;
let alertTimer = null;
let searchDebounceTimer = null;
let dataLoadPromise = null;
let activeLoadSilent = true;
const actionButtonResetTimers = new WeakMap();

const refs = {
  appAlert: document.getElementById("appAlert"),
  filterSummary: document.getElementById("filterSummary"),
  presetBar: document.getElementById("presetBar"),
  strainSearch: document.getElementById("strainSearch"),
  strainSuggestions: document.getElementById("strainSuggestions"),
  searchClearBtn: document.getElementById("searchClearBtn"),
  sortSelect: document.getElementById("sortSelect"),
  resultCount: document.getElementById("resultCount"),
  lastUpdated: document.getElementById("lastUpdated"),
  priceCoverage: document.getElementById("priceCoverage"),
  dataFreshness: document.getElementById("dataFreshness"),
  refreshBtn: document.getElementById("refreshBtn"),
  syncBtn: document.getElementById("syncBtn"),
  scrapeBtn: document.getElementById("scrapeBtn"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  pricedOnlyBtn: document.getElementById("pricedOnlyBtn"),
  shareViewBtn: document.getElementById("shareViewBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  historyTypeSelect: document.getElementById("historyTypeSelect"),
  historySizeSelect: document.getElementById("historySizeSelect"),
  spotlightCard: document.getElementById("spotlightCard"),
  marketPulseCard: document.getElementById("marketPulseCard"),
  opsPulseCard: document.getElementById("opsPulseCard"),
  compareGrid: document.getElementById("compareGrid"),
  mapContainer: document.getElementById("mapContainer"),
  mapList: document.getElementById("mapList"),
  mapListSummary: document.getElementById("mapListSummary"),
  tableBody: document.getElementById("tableBody"),
  dispensaryGrid: document.getElementById("dispensaryGrid"),
  dealGrid: document.getElementById("dealGrid"),
  freshDropList: document.getElementById("freshDropList"),
  coverageList: document.getElementById("coverageList"),
  priceMoveList: document.getElementById("priceMoveList"),
  captureList: document.getElementById("captureList"),
  jobRunList: document.getElementById("jobRunList"),
  historySummary: document.getElementById("historySummary"),
  historyMoveCount: document.getElementById("historyMoveCount"),
  dispensarySummary: document.getElementById("dispensarySummary"),
  tableSummary: document.getElementById("tableSummary"),
  mapSummary: document.getElementById("mapSummary"),
  priceChartSubtitle: document.getElementById("priceChartSubtitle"),
  strainChartSubtitle: document.getElementById("strainChartSubtitle"),
  statusMeta: document.getElementById("statusMeta"),
};

const typeFilterButtons = [...document.querySelectorAll("#typeFilter .toggle-btn")];
const sizeFilterButtons = [...document.querySelectorAll("#sizeFilter .toggle-btn")];
const sortableTableHeaders = [...document.querySelectorAll(".data-table th.sortable")];

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore persistence failures in private modes / locked-down browsers.
  }
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search || "");
  const urlState = {};

  if (params.has("tab")) urlState.activeTab = params.get("tab");
  if (params.has("type")) urlState.activeType = params.get("type")?.toUpperCase();
  if (params.has("size")) urlState.activeSize = params.get("size");
  if (params.has("q")) urlState.searchQuery = params.get("q") || "";
  if (params.has("sort")) urlState.sortField = params.get("sort");
  if (params.has("dir")) urlState.sortDir = params.get("dir");
  if (params.has("theme")) urlState.theme = params.get("theme");
  if (params.has("htype")) urlState.historyType = params.get("htype")?.toUpperCase();
  if (params.has("hsize")) urlState.historySize = params.get("hsize");
  if (params.has("priced")) urlState.pricedOnly = ["1", "true", "yes"].includes((params.get("priced") || "").toLowerCase());

  return urlState;
}

function buildUrlFromState() {
  const params = new URLSearchParams();

  if (activeTab !== DEFAULT_STATE.activeTab) params.set("tab", activeTab);
  if (activeType !== DEFAULT_STATE.activeType) params.set("type", activeType);
  if (activeSize !== DEFAULT_STATE.activeSize) params.set("size", activeSize);
  if (pricedOnly) params.set("priced", "1");
  if (searchQuery) params.set("q", searchQuery);
  if (sortField !== DEFAULT_STATE.sortField) params.set("sort", sortField);
  if (sortDir !== DEFAULT_STATE.sortDir) params.set("dir", sortDir);
  if (theme !== DEFAULT_STATE.theme) params.set("theme", theme);
  if (historyType !== DEFAULT_STATE.historyType) params.set("htype", historyType);
  if (historySize !== DEFAULT_STATE.historySize) params.set("hsize", historySize);

  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

function syncUrlState({ replace = true } = {}) {
  const nextUrl = buildUrlFromState();
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (nextUrl === currentUrl) return;

  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", nextUrl);
}

function loadStoredState() {
  const raw = safeLocalStorageGet(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STATE };

  try {
    const parsed = JSON.parse(raw);
    return {
      activeTab: ["overview", "insights", "table", "map"].includes(parsed.activeTab) ? parsed.activeTab : DEFAULT_STATE.activeTab,
      activeType: ["ALL", "REC", "MED"].includes(parsed.activeType) ? parsed.activeType : DEFAULT_STATE.activeType,
      activeSize: ["ALL", "3.5g", "7g", "14g", "28g"].includes(parsed.activeSize) ? parsed.activeSize : DEFAULT_STATE.activeSize,
      pricedOnly: typeof parsed.pricedOnly === "boolean" ? parsed.pricedOnly : DEFAULT_STATE.pricedOnly,
      searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery : DEFAULT_STATE.searchQuery,
      sortField: typeof parsed.sortField === "string" ? parsed.sortField : DEFAULT_STATE.sortField,
      sortDir: parsed.sortDir === "desc" ? "desc" : DEFAULT_STATE.sortDir,
      theme: parsed.theme === "light" ? "light" : DEFAULT_STATE.theme,
      historyType: ["ALL", "REC", "MED"].includes(parsed.historyType) ? parsed.historyType : DEFAULT_STATE.historyType,
      historySize: ["ALL", "3.5g", "7g", "14g", "28g"].includes(parsed.historySize) ? parsed.historySize : DEFAULT_STATE.historySize,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function hasSharedViewState(urlState) {
  return Object.keys(urlState || {}).some((key) => key !== "theme");
}

function resolveLocationState() {
  const stored = loadStoredState();
  const urlState = readUrlState();
  const sharedViewState = hasSharedViewState(urlState);
  const state = sharedViewState
    ? { ...DEFAULT_STATE, ...urlState }
    : { ...stored, ...urlState };

  return { state, stored, urlState, sharedViewState };
}

function applyResolvedState(resolved) {
  const { state, stored, urlState } = resolved;
  activeTab = ["overview", "insights", "table", "map"].includes(state.activeTab) ? state.activeTab : DEFAULT_STATE.activeTab;
  activeType = ["ALL", "REC", "MED"].includes(state.activeType) ? state.activeType : DEFAULT_STATE.activeType;
  activeSize = ["ALL", "3.5g", "7g", "14g", "28g"].includes(state.activeSize) ? state.activeSize : DEFAULT_STATE.activeSize;
  pricedOnly = typeof state.pricedOnly === "boolean" ? state.pricedOnly : DEFAULT_STATE.pricedOnly;
  searchQuery = typeof state.searchQuery === "string" ? state.searchQuery.trim() : DEFAULT_STATE.searchQuery;
  const nextSort = normalizeSortState(state.sortField, state.sortDir);
  sortField = nextSort.field;
  sortDir = nextSort.dir;
  historyType = ["ALL", "REC", "MED"].includes(state.historyType) ? state.historyType : DEFAULT_STATE.historyType;
  historySize = ["ALL", "3.5g", "7g", "14g", "28g"].includes(state.historySize) ? state.historySize : DEFAULT_STATE.historySize;

  if (urlState.theme) {
    theme = urlState.theme === "light" ? "light" : DEFAULT_STATE.theme;
    return;
  }

  const hasStoredTheme = Boolean(safeLocalStorageGet(STORAGE_KEY));
  if (hasStoredTheme && (stored.theme === "light" || stored.theme === "dark")) {
    theme = stored.theme === "light" ? "light" : DEFAULT_STATE.theme;
    return;
  }

  theme = window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : DEFAULT_STATE.theme;
}

function persistState() {
  safeLocalStorageSet(STORAGE_KEY, JSON.stringify({
    activeTab,
    activeType,
    activeSize,
    pricedOnly,
    searchQuery,
    sortField,
    sortDir,
    theme,
    historyType,
    historySize,
  }));
  syncUrlState();
}

function formatPrice(value, digits = 2) {
  const num = toNumber(value);
  if (num == null) return "—";
  return `$${num.toFixed(digits).replace(/\.00$/, "")}`;
}

function formatMoneyPlain(value, digits = 2) {
  const num = toNumber(value);
  if (num == null) return "—";
  return num.toFixed(digits).replace(/\.00$/, "");
}

function formatUnitPrice(value) {
  const num = toNumber(value);
  if (num == null) return "—";
  return `$${num.toFixed(2)}/g`;
}

function formatThc(value, fallback = "—") {
  const num = toNumber(value);
  if (num == null) return fallback;
  return `${num.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}%`;
}

function formatDistance(value) {
  const num = toNumber(value);
  if (num == null) return "—";
  return `${num.toFixed(1).replace(/\.0$/, "")} mi`;
}

function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 8) return `${diffDays}d ago`;

  return formatShortDate(value);
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function esc(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function safeExternalUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value), window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function buildExternalLinks(item, { compact = false } = {}) {
  const links = [];
  const menuUrl = safeExternalUrl(item?.menuUrl);
  const dropUrl = safeExternalUrl(item?.dropUrl);

  if (menuUrl) {
    links.push(`<a class="mini-link${compact ? " mini-link-compact" : ""}" href="${esc(menuUrl)}" target="_blank" rel="noopener noreferrer">Menu</a>`);
  }
  if (dropUrl && dropUrl !== menuUrl) {
    links.push(`<a class="mini-link${compact ? " mini-link-compact" : ""}" href="${esc(dropUrl)}" target="_blank" rel="noopener noreferrer">Drop</a>`);
  }
  return links.length ? `<div class="inline-links${compact ? " inline-links-compact" : ""}">${links.join("")}</div>` : "";
}

function findActionElement(target, datasetKey) {
  let node = target;
  while (node) {
    if (node.dataset && node.dataset[datasetKey] != null) return node;
    node = node.parentElement || null;
  }
  return null;
}

function getTableRowMarkup(row) {
  const priceText = row.price != null ? formatPrice(row.price) : "—";
  const thcText = formatThc(row.thcValue ?? row.thc);
  const unitPriceText = formatUnitPrice(row.unitPrice);
  const selectedClass = selectedDispensaryName === row.dispensary ? " is-selected" : "";

  return `
    <tr class="table-row${selectedClass}" data-store-row="${esc(row.dispensary)}">
      <td class="td-disp" data-label="Dispensary">
        <div class="table-link-stack">
          <span class="table-store-name">${esc(row.dispensary)}</span>
          <div class="table-inline-actions">
            <button class="table-action-link" type="button" data-focus-map="${esc(row.dispensary)}">Map</button>
            <button class="table-action-link" type="button" data-filter-store="${esc(row.dispensary)}">Filter</button>
            ${buildExternalLinks(row, { compact: true })}
          </div>
        </div>
      </td>
      <td class="td-num" data-label="Distance">${formatDistance(row.distance).replace(/ mi$/, "")}</td>
      <td data-label="Strain">${esc(row.strain)}</td>
      <td class="td-num" data-label="Size">${esc(row.size)}</td>
      <td class="td-num ${row.price != null ? "td-price" : "td-price-none"}" data-label="Price">${priceText}</td>
      <td class="td-num ${row.unitPrice != null ? "td-price" : "td-price-none"}" data-label="$/g">${unitPriceText}</td>
      <td data-label="Type"><span class="type-badge ${(row.type || "").toUpperCase() === "MED" ? "type-med" : "type-rec"}">${esc(row.type || "REC")}</span></td>
      <td class="td-num" data-label="THC">${thcText}</td>
      <td class="td-drop ${getDropClass(row.dropDate)}" data-label="Drop">${row.dropDate ? formatShortDate(row.dropDate) : "—"}</td>
    </tr>
  `;
}

function formatPercent(value, digits = 0) {
  const num = toNumber(value);
  if (num == null) return "—";
  return `${num.toFixed(digits).replace(/\.00$/, "")}%`;
}

function daysSinceDate(value) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function buildCoverageMeter(coverage, label = "coverage") {
  const value = Math.max(0, Math.min(100, Math.round(toNumber(coverage) || 0)));
  return `
    <div class="coverage-meter" aria-label="${esc(label)} ${value}%">
      <div class="coverage-meter-track"><span class="coverage-meter-fill" style="width:${value}%"></span></div>
      <span class="coverage-meter-label mono">${value}%</span>
    </div>
  `;
}

function getAllStrains() {
  if (!appData?.dispensaries) return [];
  const strains = new Set();
  appData.dispensaries.forEach((dispensary) => {
    (dispensary.products || []).forEach((product) => {
      if (product?.strain) strains.add(product.strain);
    });
  });
  return [...strains].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function populateStrainSuggestions() {
  if (!refs.strainSuggestions) return;
  const strains = getAllStrains().slice(0, 48);
  refs.strainSuggestions.innerHTML = strains.map((strain) => `<option value="${esc(strain)}"></option>`).join("");
}

function getVisibleCoverage(rows) {
  if (!rows.length) return 0;
  const priced = rows.filter((row) => row.price != null).length;
  return Math.round((priced / rows.length) * 100);
}

function getVisibleThreeFiveAverage(rows, typeValue) {
  const values = rows
    .filter((row) => row.price != null && row.size === "3.5g" && (typeValue === "ALL" || row.type === typeValue))
    .map((row) => row.price);
  return average(values);
}

function getTopStrains(rows, limit = 3) {
  const counts = new Map();
  rows.forEach((row) => {
    counts.set(row.strain, (counts.get(row.strain) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: "base" }))
    .slice(0, limit)
    .map(([strain, count]) => ({ strain, count }));
}

function computeSpotlightCandidate(model) {
  const candidates = model.rows.filter((row) => row.price != null);
  if (!candidates.length) return null;

  const priced = candidates.filter((row) => row.price != null);
  const prices = priced.map((row) => row.price);
  const unitPrices = priced.map((row) => row.unitPrice).filter((value) => value != null);
  const distances = priced.map((row) => row.distance).filter((value) => value != null);
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const unitMin = unitPrices.length ? Math.min(...unitPrices) : priceMin;
  const unitMax = unitPrices.length ? Math.max(...unitPrices) : priceMax;
  const distMin = distances.length ? Math.min(...distances) : 0;
  const distMax = distances.length ? Math.max(...distances) : 1;

  const norm = (value, min, max, invert = false) => {
    if (value == null) return 0.4;
    if (max <= min) return 0.75;
    const ratio = (value - min) / (max - min);
    return invert ? 1 - ratio : ratio;
  };

  const scored = priced.map((row) => {
    const freshnessDays = daysSinceDate(row.dropDate);
    const freshnessScore = freshnessDays == null ? 0.25 : Math.max(0, 1 - Math.min(freshnessDays, 60) / 60);
    const sizeGrams = sizeToGrams(row.size) || 0;
    const bulkBoost = sizeGrams >= 7 ? 0.06 : 0;
    const score = (
      norm(row.unitPrice ?? row.price, unitMin, unitMax, true) * 0.42 +
      norm(row.price, priceMin, priceMax, true) * 0.18 +
      norm(row.distance ?? distMax, distMin, distMax, true) * 0.22 +
      freshnessScore * 0.18 +
      bulkBoost
    );

    return {
      ...row,
      score,
      freshnessDays,
    };
  }).sort((a, b) => b.score - a.score || a.price - b.price || (a.distance ?? Infinity) - (b.distance ?? Infinity));

  return scored[0] || null;
}

function buildSpotlightReasons(candidate, model) {
  if (!candidate) return [];
  const pricedRows = model.rows.filter((row) => row.price != null);
  const reasons = [];
  const cheapest = pricedRows.reduce((best, row) => (!best || row.price < best.price ? row : best), null);
  const bestUnit = pricedRows.reduce((best, row) => {
    const rowValue = row.unitPrice ?? Infinity;
    const bestValue = best?.unitPrice ?? Infinity;
    return rowValue < bestValue ? row : best;
  }, null);
  const closest = pricedRows.reduce((best, row) => {
    const rowValue = row.distance ?? Infinity;
    const bestValue = best?.distance ?? Infinity;
    return rowValue < bestValue ? row : best;
  }, null);
  const freshest = pricedRows
    .filter((row) => row.dropDate)
    .sort((a, b) => new Date(`${b.dropDate}T00:00:00`).getTime() - new Date(`${a.dropDate}T00:00:00`).getTime())[0] || null;

  if (cheapest && cheapest.dispensary === candidate.dispensary && cheapest.strain === candidate.strain && cheapest.size === candidate.size) {
    reasons.push("Lowest visible price");
  }
  if (bestUnit && bestUnit.dispensary === candidate.dispensary && bestUnit.strain === candidate.strain && bestUnit.size === candidate.size) {
    reasons.push("Best $/g");
  }
  if (closest && closest.dispensary === candidate.dispensary && closest.strain === candidate.strain && closest.size === candidate.size) {
    reasons.push("Closest priced option");
  }
  if (freshest && freshest.dispensary === candidate.dispensary) {
    reasons.push("Fresh drop");
  }

  if (!reasons.length) {
    reasons.push(candidate.unitPrice != null ? `${formatUnitPrice(candidate.unitPrice)}` : `${formatPrice(candidate.price)} value`);
    if (candidate.distance != null) reasons.push(`${formatDistance(candidate.distance)} away`);
  }

  return reasons.slice(0, 3);
}

function renderSpotlightCard(model, spotlight) {
  const rows = model.rows;
  const dispensaries = model.dispensaries;
  if (refs.spotlightCard) {
    if (!rows.length || !spotlight) {
      refs.spotlightCard.innerHTML = `
        <div class="hero-eyebrow">Decision support</div>
        <h2 class="hero-title">No visible priced listings right now</h2>
        <p class="hero-copy">Clear one or more filters to restore a strong recommendation and compare nearby options.</p>
        <div class="hero-inline-meta">${pluralize(dispensaries.length, "shop")} in view · ${pluralize(rows.length, "listing")}</div>
      `;
    } else {
      const reasons = buildSpotlightReasons(spotlight, model);
      const scorePercent = Math.max(55, Math.min(99, Math.round(spotlight.score * 100)));
      refs.spotlightCard.innerHTML = `
        <div class="hero-eyebrow">Best pickup right now</div>
        <div class="hero-heading-row">
          <div>
            <h2 class="hero-title">${esc(spotlight.strain)} · ${esc(spotlight.size)} ${esc(spotlight.type)}</h2>
            <p class="hero-copy">${formatPrice(spotlight.price)} at ${esc(spotlight.dispensary)} · ${formatDistance(spotlight.distance)}${spotlight.dropDate ? ` · dropped ${formatShortDate(spotlight.dropDate)}` : ""}</p>
          </div>
          <div class="hero-score-ring" aria-label="Recommendation score ${scorePercent}%">
            <span class="hero-score-value mono">${scorePercent}</span>
            <span class="hero-score-label">score</span>
          </div>
        </div>
        <div class="hero-metric-grid">
          <div class="hero-metric">
            <span class="hero-metric-label">Price</span>
            <span class="hero-metric-value mono">${formatPrice(spotlight.price)}</span>
          </div>
          <div class="hero-metric">
            <span class="hero-metric-label">$/g</span>
            <span class="hero-metric-value mono">${formatUnitPrice(spotlight.unitPrice)}</span>
          </div>
          <div class="hero-metric">
            <span class="hero-metric-label">Distance</span>
            <span class="hero-metric-value mono">${formatDistance(spotlight.distance)}</span>
          </div>
          <div class="hero-metric">
            <span class="hero-metric-label">THC</span>
            <span class="hero-metric-value mono">${formatThc(spotlight.thcValue ?? spotlight.thc)}</span>
          </div>
        </div>
        <div class="hero-tag-row">
          ${reasons.map((reason) => `<span class="hero-tag">${esc(reason)}</span>`).join("")}
        </div>
        <div class="hero-actions">
          <button class="btn-sm btn-accent" type="button" data-focus-map="${esc(spotlight.dispensary)}">Focus on map</button>
          <button class="btn-sm btn-secondary" type="button" data-filter-store="${esc(spotlight.dispensary)}">Filter this store</button>
          ${buildExternalLinks(spotlight)}
        </div>
      `;
    }
  }
}

function renderMarketPulseCard(model) {
  const rows = model.rows;
  const dispensaries = model.dispensaries;
  const pricedRows = rows.filter((row) => row.price != null);
  const coverage = getVisibleCoverage(rows);
  const avgRec35 = getVisibleThreeFiveAverage(rows, "REC") ?? dashboardStats?.avgRec35 ?? null;
  const avgMed35 = getVisibleThreeFiveAverage(rows, "MED") ?? dashboardStats?.avgMed35 ?? null;
  const lowestDetail = dashboardStats?.lowestPriceDetail;

  if (refs.marketPulseCard) {
    refs.marketPulseCard.innerHTML = `
      <div class="hero-mini-eyebrow">Market pulse</div>
      <div class="hero-mini-title">Coverage and pricing at a glance</div>
      ${buildCoverageMeter(coverage, "Visible price coverage")}
      <div class="pulse-stat-grid">
        <div class="pulse-stat">
          <span class="pulse-stat-label">Visible rows</span>
          <span class="pulse-stat-value mono">${rows.length}</span>
        </div>
        <div class="pulse-stat">
          <span class="pulse-stat-label">Shops</span>
          <span class="pulse-stat-value mono">${dispensaries.length}</span>
        </div>
        <div class="pulse-stat">
          <span class="pulse-stat-label">REC 3.5g avg</span>
          <span class="pulse-stat-value mono">${avgRec35 != null ? formatPrice(avgRec35) : "—"}</span>
        </div>
        <div class="pulse-stat">
          <span class="pulse-stat-label">MED 3.5g avg</span>
          <span class="pulse-stat-value mono">${avgMed35 != null ? formatPrice(avgMed35) : "—"}</span>
        </div>
      </div>
      <div class="hero-mini-footer">
        ${lowestDetail?.price != null ? `Lowest tracked price: <strong>${formatPrice(lowestDetail.price)}</strong> for ${esc(lowestDetail.strain || "GDL flower")} @ ${esc(lowestDetail.dispensary || "nearby store")}` : `${pluralize(pricedRows.length, "priced listing")} in the current view`}
      </div>
    `;
  }
}

function renderOpsPulseCard(model) {
  const rows = model.rows;
  const dispensaries = model.dispensaries;
  const topStrains = getTopStrains(rows, 3);
  const latestDrop = dispensaries
    .filter((dispensary) => dispensary.dropDate)
    .sort((a, b) => new Date(`${b.dropDate}T00:00:00`).getTime() - new Date(`${a.dropDate}T00:00:00`).getTime())[0] || null;

  if (refs.opsPulseCard) {
    const activityCopy = apiStatusData
      ? formatActivityCopy(apiStatusData, formatRelativeTime, formatDateTime)
      : null;
    const lastAction = apiStatusData?.jobRunning && apiStatusData?.activeJob
      ? `${apiStatusData.activeJob} running ${formatRelativeTime(apiStatusData.jobStartedAt)}`
      : activityCopy?.inline || "No background jobs recorded yet";
    const strainMarkup = topStrains.length
      ? topStrains.map((item) => `<span class="hero-tag hero-tag--subtle">${esc(item.strain)} · ${item.count}</span>`).join("")
      : '<span class="hero-tag hero-tag--subtle">No top strains yet</span>';
    refs.opsPulseCard.innerHTML = `
      <div class="hero-mini-eyebrow">Flow + freshness</div>
      <div class="hero-mini-title">What is moving nearby</div>
      <div class="hero-mini-stack">
        <div class="hero-mini-row">
          <span class="hero-mini-label">Tracker</span>
          <span class="hero-mini-value">${esc(lastAction)}</span>
        </div>
        <div class="hero-mini-row">
          <span class="hero-mini-label">Freshest drop</span>
          <span class="hero-mini-value">${latestDrop ? `${esc(latestDrop.name)} · ${formatShortDate(latestDrop.dropDate)}` : "No drop dates in view"}</span>
        </div>
      </div>
      <div class="hero-tag-row hero-tag-row--compact">${strainMarkup}</div>
      <div class="hero-mini-footer">Use the quick jumps above to pivot between value, fresh drops, and price history without losing context.</div>
    `;
  }
}

function renderHero(model) {
  const spotlight = computeSpotlightCandidate(model);
  renderSpotlightCard(model, spotlight);
  renderMarketPulseCard(model);
  renderOpsPulseCard(model);
}

function getCompareHighlights(model) {
  const candidates = [...model.dispensaries];
  if (!candidates.length) return [];

  const sorts = [
    {
      key: "closest",
      label: "Closest",
      description: "Fastest pickup",
      pick: candidates.slice().sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))[0],
    },
    {
      key: "value",
      label: "Best value",
      description: "Lowest visible $/g",
      pick: candidates.slice().sort((a, b) => (a.minUnitPrice ?? Infinity) - (b.minUnitPrice ?? Infinity) || (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity))[0],
    },
    {
      key: "selection",
      label: "Most variety",
      description: "Largest strain spread",
      pick: candidates.slice().sort((a, b) => b.uniqueStrainCount - a.uniqueStrainCount || b.productCount - a.productCount || (a.distance ?? Infinity) - (b.distance ?? Infinity))[0],
    },
  ];

  const seen = new Set();
  const cards = [];
  sorts.forEach((entry) => {
    if (!entry.pick || seen.has(entry.pick.name)) return;
    seen.add(entry.pick.name);
    cards.push(entry);
  });

  if (cards.length < 3) {
    candidates.forEach((dispensary) => {
      if (cards.length >= 3 || seen.has(dispensary.name)) return;
      seen.add(dispensary.name);
      cards.push({
        key: `extra-${cards.length}`,
        label: "Worth checking",
        description: "Strong overall nearby option",
        pick: dispensary,
      });
    });
  }

  return cards;
}

function getDispensaryTopStrains(dispensary, limit = 3) {
  return [...new Set((dispensary.products || []).map((product) => product.strain))].slice(0, limit);
}

function renderCompareCard({ key, label, description, pick }) {
  const coverage = pick.productCount ? Math.round((pick.pricedCount / pick.productCount) * 100) : 0;
  const selectedClass = selectedDispensaryName === pick.name ? " is-selected" : "";
  const topStrains = getDispensaryTopStrains(pick);

  return `
    <article class="compare-card${selectedClass}" data-store-card="${esc(pick.name)}">
      <div class="compare-card-topline">
        <span class="compare-badge compare-badge--${esc(key)}">${esc(label)}</span>
        <span class="distance-badge">${formatDistance(pick.distance)}</span>
      </div>
      <h4 class="compare-title">${esc(pick.name)}</h4>
      <p class="compare-copy">${esc(description)} · ${pick.dropDate ? `drop ${formatShortDate(pick.dropDate)}` : "drop date unavailable"}</p>
      <div class="compare-metrics">
        <div class="compare-metric"><span class="compare-metric-label">Min price</span><span class="compare-metric-value mono">${pick.minPrice != null ? formatPrice(pick.minPrice) : "—"}</span></div>
        <div class="compare-metric"><span class="compare-metric-label">Best $/g</span><span class="compare-metric-value mono">${pick.minUnitPrice != null ? formatUnitPrice(pick.minUnitPrice) : "—"}</span></div>
        <div class="compare-metric"><span class="compare-metric-label">Strains</span><span class="compare-metric-value mono">${pick.uniqueStrainCount}</span></div>
        <div class="compare-metric"><span class="compare-metric-label">Listings</span><span class="compare-metric-value mono">${pick.productCount}</span></div>
      </div>
      ${buildCoverageMeter(coverage, `${pick.name} pricing coverage`)}
      <div class="hero-tag-row hero-tag-row--compact">
        ${topStrains.map((strain) => `<span class="hero-tag hero-tag--subtle">${esc(strain)}</span>`).join("")}
      </div>
      <div class="compare-actions">
        <button class="btn-sm btn-secondary" type="button" data-focus-map="${esc(pick.name)}">Map</button>
        <button class="btn-sm btn-secondary" type="button" data-filter-store="${esc(pick.name)}">Filter</button>
        ${buildExternalLinks(pick, { compact: true })}
      </div>
    </article>
  `;
}

function renderCompareGrid(model) {
  if (!refs.compareGrid) return;
  const cards = getCompareHighlights(model);
  if (!cards.length) {
    renderCompactEmptyState(refs.compareGrid, "No stores are visible with the current filters.");
    return;
  }

  refs.compareGrid.innerHTML = cards.map(renderCompareCard).join("");
}

function renderPresetBar() {
  if (!refs.presetBar) return;

  const states = {
    value35: activeTab === "overview" && activeSize === "3.5g" && pricedOnly && sortField === "price" && sortDir === "asc",
    bulk: activeTab === "overview" && pricedOnly && sortField === "unitPrice",
    med: activeType === "MED",
    rec: activeType === "REC",
    fresh: activeTab === "overview" && sortField === "drop" && sortDir === "desc",
    history: activeTab === "insights",
    map: activeTab === "map",
  };

  refs.presetBar.querySelectorAll?.(".preset-chip").forEach((button) => {
    const isActive = Boolean(states[button.dataset.preset]);
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function applyPreset(preset) {
  switch (preset) {
    case "value35":
      activeTab = "overview";
      activeSize = "3.5g";
      pricedOnly = true;
      sortField = "price";
      sortDir = "asc";
      break;
    case "bulk":
      activeTab = "overview";
      activeSize = "ALL";
      pricedOnly = true;
      sortField = "unitPrice";
      sortDir = "asc";
      break;
    case "med":
      activeTab = "overview";
      activeType = "MED";
      break;
    case "rec":
      activeTab = "overview";
      activeType = "REC";
      break;
    case "fresh":
      activeTab = "overview";
      sortField = "drop";
      sortDir = "desc";
      break;
    case "history":
      activeTab = "insights";
      break;
    case "map":
      activeTab = "map";
      break;
    default:
      return;
  }

  persistState();
  syncControls();
  renderAll();
}

function filterToStore(name, { tab = "table" } = {}) {
  if (!name) return;
  searchQuery = name;
  selectedDispensaryName = name;
  activeTab = tab;
  persistState();
  syncControls();
  renderAll();
}

function focusMapDispensary(name, { openTab = true } = {}) {
  if (!name) return;
  selectedDispensaryName = name;
  if (openTab) {
    activateTab("map", { persist: true });
  }

  renderAll();
  const model = buildVisibleModel();
  ensureMapReady(model.dispensaries);

  const marker = mapMarkerIndex.get(name);
  if (marker && map) {
    const latLng = marker.getLatLng?.();
    if (latLng) {
      map.setView(latLng, Math.max(map.getZoom?.() || 11, 12), { animate: true });
    }
    if (typeof marker.openPopup === "function") marker.openPopup();
  }
}

function renderMapList(dispensaries) {
  if (refs.mapListSummary) {
    refs.mapListSummary.textContent = dispensaries.length
      ? `${pluralize(dispensaries.length, "store")} in the current view${selectedDispensaryName ? ` · focused: ${selectedDispensaryName}` : ""}`
      : "No mapped stores in the current view";
  }

  if (!refs.mapList) return;
  if (!dispensaries.length) {
    refs.mapList.innerHTML = `
      <div class="empty-state compact-empty">
        <div class="empty-state-text">No visible dispensaries can be plotted on the map right now.</div>
      </div>
    `;
    return;
  }

  refs.mapList.innerHTML = dispensaries.map((dispensary) => {
    const coverage = dispensary.productCount ? Math.round((dispensary.pricedCount / dispensary.productCount) * 100) : 0;
    const selectedClass = selectedDispensaryName === dispensary.name ? " is-selected" : "";
    return `
      <button class="map-list-item${selectedClass}" type="button" data-focus-map="${esc(dispensary.name)}" aria-pressed="${selectedDispensaryName === dispensary.name ? "true" : "false"}" aria-label="Focus ${esc(dispensary.name)} on the map">
        <div class="map-list-main">
          <div class="map-list-title-row">
            <span class="map-list-title">${esc(dispensary.name)}</span>
            <span class="distance-badge">${formatDistance(dispensary.distance)}</span>
          </div>
          <div class="map-list-meta">${pluralize(dispensary.uniqueStrainCount, "strain")} · ${pluralize(dispensary.productCount, "listing")} · ${dispensary.minPrice != null ? `from ${formatPrice(dispensary.minPrice)}` : "price unavailable"}</div>
          ${buildCoverageMeter(coverage, `${dispensary.name} pricing coverage`)}
        </div>
      </button>
    `;
  }).join("");
}

function summariseJobResult(job) {
  const result = job?.result;
  if (!result || typeof result !== "object") return { summary: "", notes: [] };

  const notes = [];
  const summaryBits = [];

  const refresh = result.refresh && typeof result.refresh === "object" ? result.refresh : null;
  const scrape = result.scrape && typeof result.scrape === "object" ? result.scrape : null;

  if (refresh) {
    if (Number.isFinite(refresh.dispensaryCount)) summaryBits.push(`${refresh.dispensaryCount} dispensaries`);
    if (Number.isFinite(refresh.productCount)) summaryBits.push(`${refresh.productCount} listings`);
    if (Number.isFinite(refresh.detailSupplements) && refresh.detailSupplements > 0) summaryBits.push(`+${refresh.detailSupplements} detail pages`);
    if (refresh.warning) notes.push(refresh.warning);
  } else if (Number.isFinite(result.dispensaryCount) || Number.isFinite(result.productCount)) {
    if (Number.isFinite(result.dispensaryCount)) summaryBits.push(`${result.dispensaryCount} dispensaries`);
    if (Number.isFinite(result.productCount)) summaryBits.push(`${result.productCount} listings`);
    if (result.warning) notes.push(result.warning);
  }

  if (scrape) {
    if (Number.isFinite(scrape.pricedProducts) || Number.isFinite(scrape.totalProducts)) {
      summaryBits.push(`${scrape.pricedProducts || 0}/${scrape.totalProducts || 0} priced`);
    }
    if (Number.isFinite(scrape.updated)) summaryBits.push(`${scrape.updated} updates`);
    notes.push(...(scrape.warnings || []), ...(scrape.errors || []));
  } else if (Number.isFinite(result.pricedProducts) || Number.isFinite(result.totalProducts)) {
    summaryBits.push(`${result.pricedProducts || 0}/${result.totalProducts || 0} priced`);
    if (Number.isFinite(result.updated)) summaryBits.push(`${result.updated} updates`);
    notes.push(...(result.warnings || []), ...(result.errors || []));
  }

  const uniqueNotes = [...new Set(notes.filter(Boolean))].slice(0, 2);
  return { summary: summaryBits.join(" · "), notes: uniqueNotes };
}

function getSortLabel() {
  const labels = {
    distance: "Distance",
    unitPrice: sortDir === "desc" ? "$/g ↓" : "$/g ↑",
    strain: "Strain A–Z",
    dispensary: "Dispensary",
    size: "Size",
    type: "Type",
    thc: "THC%",
    drop: "Drop Date",
    price: sortDir === "desc" ? "Price ↓" : "Price ↑",
  };
  return labels[sortField] || "Distance";
}

function getMostRecentTimestamp() {
  const candidates = [
    apiStatusData?.lastActivity,
    appData?.lastUpdated,
    scrapeStatusData?.lastScrape,
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));
  if (!candidates.length) return null;
  return new Date(Math.max(...candidates)).toISOString();
}

function getDropClass(dateValue) {
  if (!dateValue) return "drop-old";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "drop-old";

  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays < 7) return "drop-fresh";
  if (diffDays < 30) return "drop-recent";
  return "drop-old";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderCompactEmptyState(target, message) {
  if (!target) return;
  target.innerHTML = `
    <div class="empty-state compact-empty">
      <div class="empty-state-text">${message}</div>
    </div>
  `;
}

function renderHtmlList(target, items, emptyMessage) {
  if (!target) return;
  if (!items.length) {
    renderCompactEmptyState(target, emptyMessage);
    return;
  }
  target.innerHTML = items.join("");
}

function setAlert(message = "", type = "info") {
  if (!refs.appAlert) return;

  if (alertTimer) {
    clearTimeout(alertTimer);
    alertTimer = null;
  }

  if (!message) {
    refs.appAlert.hidden = true;
    refs.appAlert.textContent = "";
    refs.appAlert.className = "app-alert";
    refs.appAlert.setAttribute("role", "status");
    return;
  }

  refs.appAlert.hidden = false;
  refs.appAlert.textContent = message;
  refs.appAlert.className = `app-alert app-alert--${type}`;
  refs.appAlert.setAttribute("role", type === "error" ? "alert" : "status");
}

function flashAlert(message, type = "info", duration = 4500) {
  setAlert(message, type);
  if (duration > 0) {
    alertTimer = window.setTimeout(() => setAlert(""), duration);
  }
}

async function fetchJSON(path, options = {}) {
  const { timeoutMs = REQUEST_TIMEOUT_MS, signal: providedSignal, ...fetchOptions } = options;
  const controller = typeof AbortController === "function" && !providedSignal ? new AbortController() : null;
  const signal = providedSignal || controller?.signal;
  const timeoutId = controller && timeoutMs > 0
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      signal,
      headers: {
        Accept: "application/json",
        ...(fetchOptions.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = typeof payload === "string"
        ? payload
        : payload?.detail || payload?.error || payload?.message || `Request failed (${response.status})`;
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function resetSupplementalState() {
  dashboardStats = null;
  scrapeStatusData = null;
  apiStatusData = null;
  priceHistoryData = [];
  jobRunsData = [];
}

function applyDashboardPayload(payload) {
  if (!payload?.data) {
    throw new Error("Dashboard response did not include tracker data.");
  }

  appData = payload.data;
  dashboardStats = payload.stats && typeof payload.stats === "object" ? payload.stats : null;
  scrapeStatusData = payload.scrapeStatus || null;
  apiStatusData = payload.status || null;
  priceHistoryData = Array.isArray(payload.history) ? payload.history : [];
  jobRunsData = Array.isArray(payload.jobs) ? payload.jobs : [];
}

async function loadLegacyDataBundle() {
  const data = await fetchJSON("/api/data");

  resetSupplementalState();
  appData = data;

  const optionalRequests = [
    { key: "stats", label: "market stats", path: "/api/stats" },
    { key: "scrapeStatus", label: "scrape status", path: "/api/scrape-status" },
    { key: "status", label: "job status", path: "/api/status" },
    { key: "history", label: "price history", path: "/api/price-history?limit=1500" },
    { key: "jobs", label: "job activity", path: "/api/jobs?limit=12" },
  ];

  const optionalResults = await Promise.allSettled(optionalRequests.map((request) => fetchJSON(request.path)));
  const degradedPanels = [];

  optionalRequests.forEach((request, index) => {
    const result = optionalResults[index];
    if (result.status !== "fulfilled") {
      degradedPanels.push(request.label);
      console.warn(`Optional load failed for ${request.path}:`, result.reason);
      return;
    }

    if (request.key === "stats") {
      dashboardStats = result.value && typeof result.value === "object" ? result.value : null;
    } else if (request.key === "scrapeStatus") {
      scrapeStatusData = result.value || null;
    } else if (request.key === "status") {
      apiStatusData = result.value || null;
    } else if (request.key === "history") {
      priceHistoryData = Array.isArray(result.value) ? result.value : [];
    } else if (request.key === "jobs") {
      jobRunsData = Array.isArray(result.value?.jobs) ? result.value.jobs : [];
    }
  });

  return { degradedPanels };
}

function shouldBackgroundRefresh() {
  return document.visibilityState !== "hidden";
}

function triggerBackgroundLoad(reason) {
  loadData({ silent: true }).catch((error) => {
    console.warn(`Background refresh failed (${reason}):`, error);
  });
}

function syncJobPolling() {
  const shouldPoll = Boolean(apiStatusData?.jobRunning);

  if (shouldPoll && !jobPollTimer) {
    jobPollTimer = window.setInterval(() => {
      if (!shouldBackgroundRefresh()) return;
      triggerBackgroundLoad("job polling");
    }, 4000);
    return;
  }

  if (!shouldPoll && jobPollTimer) {
    clearInterval(jobPollTimer);
    jobPollTimer = null;
  }
}

function updateActionButtons() {
  const running = Boolean(apiStatusData?.jobRunning);
  const activeJob = apiStatusData?.activeJob || "job";

  [refs.refreshBtn, refs.syncBtn, refs.scrapeBtn].forEach((button) => {
    if (!button) return;
    if (!button.dataset.defaultTitle) button.dataset.defaultTitle = button.title || "";
    if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent?.trim() || "";

    if (running) {
      button.disabled = true;
      button.title = `Tracker job running: ${activeJob}`;
    } else {
      button.disabled = false;
      button.title = button.dataset.defaultTitle;
    }
  });
}

function clearActionButtonReset(button) {
  const resetTimer = actionButtonResetTimers.get(button);
  if (resetTimer) {
    window.clearTimeout(resetTimer);
    actionButtonResetTimers.delete(button);
  }
}

function scheduleActionButtonReset(button, originalMarkup, delay = 2800) {
  clearActionButtonReset(button);
  const resetTimer = window.setTimeout(() => {
    button.innerHTML = originalMarkup;
    actionButtonResetTimers.delete(button);
    updateActionButtons();
  }, delay);
  actionButtonResetTimers.set(button, resetTimer);
}

function setActionButtonMarkup(button, markup) {
  clearActionButtonReset(button);
  button.innerHTML = markup;
}

async function refreshAfterAsyncAction(error) {
  if (/already running/i.test(error?.message || "")) {
    await loadData({ silent: true });
    return true;
  }
  return false;
}

async function runActionButton(button, {
  pendingMarkup,
  successMarkup,
  errorMarkup,
  request,
  getSuccessMessage,
  getErrorMessage,
  successDuration = 2800,
  errorDuration = 2800,
  onBefore,
  onSuccess,
  onFinally,
}) {
  if (!button) return;

  const originalMarkup = button.innerHTML;
  button.disabled = true;
  setActionButtonMarkup(button, pendingMarkup);
  if (onBefore) onBefore();

  try {
    const result = await request();
    await loadData({ silent: true });
    if (onSuccess) onSuccess(result);
    if (successMarkup) {
      setActionButtonMarkup(button, typeof successMarkup === "function" ? successMarkup(result) : successMarkup);
      scheduleActionButtonReset(button, originalMarkup, successDuration);
    }
    const successMessage = getSuccessMessage?.(result);
    if (successMessage) {
      flashAlert(successMessage.message, successMessage.type || "success", successMessage.duration || 4500);
    }
  } catch (error) {
    console.error(`${button.dataset.actionLabel || "Action"} failed:`, error);
    await refreshAfterAsyncAction(error);
    if (errorMarkup) {
      setActionButtonMarkup(button, typeof errorMarkup === "function" ? errorMarkup(error) : errorMarkup);
      scheduleActionButtonReset(button, originalMarkup, errorDuration);
    }
    const errorMessage = getErrorMessage?.(error);
    if (errorMessage) {
      flashAlert(errorMessage.message, errorMessage.type || "error", errorMessage.duration || 6500);
    }
  } finally {
    button.disabled = false;
    if (onFinally) onFinally();
    updateActionButtons();
  }
}

function getThemeIconMarkup(nextTheme) {
  return nextTheme === "dark"
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z"></path></svg>';
}

function updateThemeIcon() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  const nextTheme = theme === "dark" ? "light" : "dark";
  button.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
  button.title = `Switch to ${nextTheme} mode`;
  button.innerHTML = getThemeIconMarkup(theme);
}

function applyTheme(nextTheme, { persist = true, rerender = true } = {}) {
  theme = nextTheme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon();

  if (persist) persistState();
  if (map) refreshMapTheme();
  if (rerender && appData) {
    renderAll();
  }
}

function getTileUrl() {
  return theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

function hasChartLibrary() {
  return typeof window.Chart !== "undefined";
}

function hasLeaflet() {
  return typeof window.L !== "undefined" && typeof window.L.map === "function";
}

function setCanvasEmpty(canvasId, message = "") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const wrap = canvas.parentElement;
  let empty = wrap.querySelector(".chart-empty");
  if (!empty) {
    empty = document.createElement("div");
    empty.className = "chart-empty";
    empty.hidden = true;
    wrap.appendChild(empty);
  }

  if (!message) {
    empty.hidden = true;
    empty.textContent = "";
    canvas.hidden = false;
    return;
  }

  empty.hidden = false;
  empty.textContent = message;
  canvas.hidden = true;
}

function destroyChart(name) {
  if (charts[name]) {
    charts[name].destroy();
    charts[name] = null;
  }
}

function refreshMapTheme() {
  if (!map || !hasLeaflet()) return;

  if (mapTileLayer) {
    map.removeLayer(mapTileLayer);
    mapTileLayer = window.L.tileLayer(getTileUrl(), {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
  }

  if (radiusCircle) {
    radiusCircle.setStyle({
      color: getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),
    });
  }

  if (appData) {
    updateMapMarkers(buildVisibleModel().dispensaries);
  }
}

function activateTab(tabName, { persist = true, focusButton = false } = {}) {
  activeTab = ["overview", "insights", "table", "map"].includes(tabName) ? tabName : "overview";

  const tabs = [...document.querySelectorAll(".tab")];
  const panels = [...document.querySelectorAll(".tab-panel")];

  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === activeTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.setAttribute("tabindex", isActive ? "0" : "-1");
    if (isActive && focusButton) tab.focus();
  });

  panels.forEach((panel) => {
    const isActive = panel.id === `panel-${activeTab}`;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
    panel.setAttribute("aria-hidden", String(!isActive));
  });

  if (persist) persistState();

  if (activeTab === "map" && appData) {
    if (!map) {
      initMap();
    } else {
      requestAnimationFrame(() => map.invalidateSize());
    }
  }
}

function buildFacetCounts() {
  const counts = {
    type: { ALL: 0, REC: 0, MED: 0 },
    size: { ALL: 0, "3.5g": 0, "7g": 0, "14g": 0, "28g": 0 },
  };

  if (!appData?.dispensaries) return counts;

  const query = searchQuery.trim().toLowerCase();

  for (const dispensary of appData.dispensaries) {
    for (const product of dispensary.products || []) {
      const productType = (product.type || "").toUpperCase() || "REC";
      const productSize = product.size || "";

      if (pricedOnly && product.price == null) continue;
      if (query) {
        const haystack = `${product.strain || ""} ${dispensary.name || ""}`.toLowerCase();
        if (!haystack.includes(query)) continue;
      }

      if (activeSize === "ALL" || productSize === activeSize) {
        counts.type.ALL += 1;
        if (productType in counts.type) counts.type[productType] += 1;
      }

      if (activeType === "ALL" || productType === activeType) {
        counts.size.ALL += 1;
        if (productSize in counts.size) counts.size[productSize] += 1;
      }
    }
  }

  return counts;
}

function updateToggleCountLabels() {
  const counts = buildFacetCounts();

  typeFilterButtons.forEach((button) => {
    if (!button.dataset.baseLabel) button.dataset.baseLabel = button.textContent.trim();
    const key = button.dataset.value;
    const count = counts.type[key] ?? 0;
    button.textContent = `${button.dataset.baseLabel} (${count})`;
  });

  sizeFilterButtons.forEach((button) => {
    if (!button.dataset.baseLabel) button.dataset.baseLabel = button.textContent.trim();
    const key = button.dataset.value;
    const count = counts.size[key] ?? 0;
    button.textContent = `${button.dataset.baseLabel} (${count})`;
  });
}

function syncControls() {
  activateTab(activeTab, { persist: false });

  typeFilterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.value === activeType);
  });

  sizeFilterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.value === activeSize);
  });

  if (refs.strainSearch && refs.strainSearch.value !== searchQuery) {
    refs.strainSearch.value = searchQuery;
  }
  if (refs.searchClearBtn) {
    refs.searchClearBtn.hidden = !searchQuery;
  }

  if (refs.pricedOnlyBtn) {
    refs.pricedOnlyBtn.classList.toggle("active", pricedOnly);
    refs.pricedOnlyBtn.setAttribute("aria-pressed", String(pricedOnly));
    refs.pricedOnlyBtn.textContent = pricedOnly ? "Priced only ✓" : "Priced only";
  }

  if (refs.sortSelect) {
    if (sortField === "unitPrice") {
      refs.sortSelect.value = "unit-price";
    } else if (sortField === "price") {
      refs.sortSelect.value = sortDir === "desc" ? "price-desc" : "price-asc";
    } else if (sortField === "drop") {
      refs.sortSelect.value = "drop-date";
    } else {
      refs.sortSelect.value = sortField;
    }
  }

  if (refs.historyTypeSelect) refs.historyTypeSelect.value = historyType;
  if (refs.historySizeSelect) refs.historySizeSelect.value = historySize;

  updateToggleCountLabels();
  renderPresetBar();
  activateTab(activeTab, { persist: false });
}

function compareValues(a, b, direction = 1) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return 0;
    return a > b ? direction : -direction;
  }

  const result = String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });

  return result * direction;
}

function sortRows(rows) {
  const direction = sortDir === "desc" ? -1 : 1;

  rows.sort((a, b) => {
    switch (sortField) {
      case "distance":
        return compareValues(a.distance ?? Infinity, b.distance ?? Infinity, direction) || compareValues(a.dispensary, b.dispensary, 1);
      case "unitPrice":
        return compareValues(a.unitPrice, b.unitPrice, direction) || compareValues(toNumber(a.price), toNumber(b.price), 1) || compareValues(a.dispensary, b.dispensary, 1);
      case "price":
        return compareValues(toNumber(a.price), toNumber(b.price), direction) || compareValues(a.dispensary, b.dispensary, 1);
      case "strain":
        return compareValues(a.strain, b.strain, direction) || compareValues(a.dispensary, b.dispensary, 1);
      case "dispensary":
        return compareValues(a.dispensary, b.dispensary, direction) || compareValues(a.strain, b.strain, 1);
      case "size":
        return compareValues(sizeToGrams(a.size), sizeToGrams(b.size), direction) || compareValues(a.dispensary, b.dispensary, 1);
      case "type":
        return compareValues(a.type, b.type, direction) || compareValues(a.dispensary, b.dispensary, 1);
      case "thc":
        return compareValues(a.thcValue, b.thcValue, direction) || compareValues(a.dispensary, b.dispensary, 1);
      case "drop":
        return compareValues(a.dropDate ? Date.parse(`${a.dropDate}T00:00:00`) : null, b.dropDate ? Date.parse(`${b.dropDate}T00:00:00`) : null, direction) || compareValues(a.dispensary, b.dispensary, 1);
      default:
        return compareValues(a.distance ?? Infinity, b.distance ?? Infinity, 1) || compareValues(a.dispensary, b.dispensary, 1);
    }
  });

  return rows;
}

function sortDispensaries(dispensaries) {
  const direction = sortDir === "desc" ? -1 : 1;

  const getComparableValue = (dispensary) => {
    switch (sortField) {
      case "distance":
        return dispensary.distance ?? Infinity;
      case "unitPrice":
        return dispensary.minUnitPrice;
      case "price":
        return dispensary.minPrice;
      case "dispensary":
        return dispensary.name;
      case "drop":
        return dispensary.dropDate ? Date.parse(`${dispensary.dropDate}T00:00:00`) : null;
      case "strain": {
        const firstStrain = [...new Set(dispensary.products.map((product) => product.strain))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))[0];
        return firstStrain || "";
      }
      case "size": {
        const sizes = dispensary.products.map((product) => sizeToGrams(product.size)).filter((value) => value != null);
        return sizes.length ? Math.max(...sizes) : null;
      }
      case "type": {
        const types = [...new Set(dispensary.products.map((product) => product.type))].sort().join(",");
        return types || "";
      }
      case "thc": {
        const thcValues = dispensary.products.map((product) => product.thcValue).filter((value) => value != null);
        return thcValues.length ? average(thcValues) : null;
      }
      default:
        return dispensary.distance ?? Infinity;
    }
  };

  dispensaries.sort((a, b) => {
    const primary = compareValues(getComparableValue(a), getComparableValue(b), direction);
    if (primary !== 0) return primary;
    return compareValues(a.distance ?? Infinity, b.distance ?? Infinity, 1) || compareValues(a.name, b.name, 1);
  });

  return dispensaries;
}

function buildVisibleModel() {
  if (!appData?.dispensaries) {
    return { rows: [], dispensaries: [] };
  }

  const query = searchQuery.trim().toLowerCase();
  const rows = [];
  const dispensaries = [];

  for (const dispensary of appData.dispensaries) {
    const visibleProducts = [];

    for (const product of dispensary.products || []) {
      const productType = (product.type || "").toUpperCase();

      if (activeType !== "ALL" && productType !== activeType) continue;
      if (activeSize !== "ALL" && product.size !== activeSize) continue;
      if (pricedOnly && product.price == null) continue;

      if (query) {
        const haystack = `${product.strain || ""} ${dispensary.name || ""}`.toLowerCase();
        if (!haystack.includes(query)) continue;
      }

      const thcValue = product.thcValue != null ? toNumber(product.thcValue) : toNumber(parseFloat(product.thc));
      const unitPrice = getUnitPrice(product);

      const row = {
        dispensary: dispensary.name,
        address: dispensary.address,
        distance: dispensary.distance,
        dropDate: dispensary.dropDate,
        dropUrl: dispensary.dropUrl,
        menuUrl: dispensary.menuUrl,
        menuType: dispensary.menuType,
        lat: dispensary.lat,
        lng: dispensary.lng,
        strain: product.strain,
        size: product.size,
        price: toNumber(product.price),
        unitPrice,
        type: productType || "REC",
        thc: product.thc,
        thcValue,
      };

      rows.push(row);
      visibleProducts.push(row);
    }

    if (!visibleProducts.length) continue;

    const pricedProducts = visibleProducts.filter((product) => product.price != null);
    const prices = pricedProducts.map((product) => product.price);
    const unitPrices = pricedProducts.map((product) => product.unitPrice).filter((value) => value != null);
    dispensaries.push({
      ...dispensary,
      products: visibleProducts,
      productCount: visibleProducts.length,
      totalProductCount: (dispensary.products || []).length,
      pricedCount: pricedProducts.length,
      uniqueStrainCount: new Set(visibleProducts.map((product) => product.strain)).size,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      avgPrice: prices.length ? average(prices) : null,
      minUnitPrice: unitPrices.length ? Math.min(...unitPrices) : null,
    });
  }

  return {
    rows: sortRows(rows),
    dispensaries: sortDispensaries(dispensaries),
  };
}

function getFilteredHistoryRecords() {
  const query = searchQuery.trim().toLowerCase();
  const effectiveType = historyType !== "ALL" ? historyType : activeType;
  const effectiveSize = historySize !== "ALL" ? historySize : activeSize;

  return priceHistoryData
    .filter((record) => {
      if (effectiveType !== "ALL" && (record.type || "").toUpperCase() !== effectiveType) return false;
      if (effectiveSize !== "ALL" && record.size !== effectiveSize) return false;
      if (query) {
        const haystack = `${record.strain || ""} ${record.dispensary || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

function renderLastUpdated() {
  const freshest = getMostRecentTimestamp();
  if (!freshest) {
    if (refs.lastUpdated) refs.lastUpdated.textContent = "—";
    return;
  }

  if (refs.lastUpdated) {
    const activityCopy = apiStatusData
      ? formatActivityCopy(apiStatusData, formatRelativeTime, formatDateTime)
      : null;
    refs.lastUpdated.textContent = activityCopy?.inline || `Updated ${formatRelativeTime(freshest)}`;
    refs.lastUpdated.title = activityCopy?.title || formatDateTime(freshest);
  }
}

function renderDataFreshness() {
  if (!refs.dataFreshness) return;

  const freshest = getMostRecentTimestamp();
  if (!freshest) {
    refs.dataFreshness.textContent = "Freshness —";
    refs.dataFreshness.title = "No refresh metadata available";
    refs.dataFreshness.dataset.state = "unknown";
    return;
  }

  const ageHours = Math.max(0, (Date.now() - new Date(freshest).getTime()) / 3600000);
  const latestKind = apiStatusData?.lastActivityKind || apiStatusData?.lastScrapeKind || apiStatusData?.lastRefreshKind || null;
  const activityCopy = apiStatusData
    ? formatActivityCopy(apiStatusData, formatRelativeTime, formatDateTime)
    : null;
  let label = "Fresh";
  let state = "fresh";

  if (latestKind === "seed") {
    label = "Seeded";
    state = "seed";
  } else if (ageHours >= 48) {
    label = "Stale";
    state = "stale";
  } else if (ageHours >= 18) {
    label = "Aging";
    state = "aging";
  }

  refs.dataFreshness.textContent = latestKind === "seed"
    ? (activityCopy?.inline || `Seeded ${formatRelativeTime(freshest)}`)
    : `${label} ${formatRelativeTime(freshest)}`;
  refs.dataFreshness.title = latestKind === "seed"
    ? (activityCopy?.title || `Seeded dataset loaded ${formatDateTime(freshest)}`)
    : `Last tracker activity ${formatDateTime(freshest)}`;
  refs.dataFreshness.dataset.state = state;
}

function renderScrapeStatus() {
  if (!refs.priceCoverage) return;

  if (!scrapeStatusData) {
    refs.priceCoverage.textContent = "Coverage —";
    refs.priceCoverage.title = "Live price coverage unavailable";
    return;
  }

  const priced = scrapeStatusData.pricedProducts ?? 0;
  const total = scrapeStatusData.totalProducts ?? 0;
  const coverage = Number.isFinite(scrapeStatusData.priceCoverage) ? scrapeStatusData.priceCoverage : 0;
  refs.priceCoverage.textContent = `${coverage}% priced`;

  const details = [`${priced}/${total} listings priced`];
  if (scrapeStatusData.lastScrape) {
    details.push(`Last price scrape ${formatDateTime(scrapeStatusData.lastScrape)}`);
  } else if (apiStatusData?.lastRefreshKind === "seed") {
    details.push("Coverage reflects the packaged seed catalog");
  } else {
    details.push("No live price scrape recorded yet");
  }
  if (scrapeStatusData.lastSource) {
    details.push(`Source ${scrapeStatusData.lastSource}`);
  }
  if (apiStatusData?.jobRunning) {
    details.push(`Job running: ${apiStatusData.activeJob}`);
  }
  refs.priceCoverage.title = details.join(" · ");
}

function renderOperations() {
  if (refs.statusMeta) {
    const details = [];
    const activityCopy = apiStatusData
      ? formatActivityCopy(apiStatusData, formatRelativeTime, formatDateTime)
      : null;
    const refreshCopy = apiStatusData
      ? formatRefreshCopy(apiStatusData, formatRelativeTime, formatDateTime)
      : null;
    if (apiStatusData?.jobRunning && apiStatusData?.activeJob) {
      details.push(`Running ${apiStatusData.activeJob} since ${formatRelativeTime(apiStatusData.jobStartedAt)}`);
    } else {
      if (refreshCopy?.inline) {
        details.push(refreshCopy.inline);
      }
      if (apiStatusData?.lastScrape) {
        details.push(`Price scrape ${formatRelativeTime(apiStatusData.lastScrape)}`);
      } else if (!refreshCopy?.inline && activityCopy?.inline) {
        details.push(activityCopy.inline);
      }
    }

    if (apiStatusData?.schedulerEnabled) details.push("Scheduler on");
    if (apiStatusData?.radiusMiles) details.push(`${apiStatusData.radiusMiles}mi radius`);
    if (apiStatusData?.lastWarning?.message) details.push("Protected last known-good dataset");
    if (apiStatusData?.lastError?.message) details.push(`Latest failure: ${apiStatusData.lastError.job}`);
    refs.statusMeta.textContent = details.length ? details.join(" · ") : "Refresh state, scheduler activity, and recent job history";
  }

  if (!refs.jobRunList) return;

  const jobs = Array.isArray(jobRunsData) ? jobRunsData.slice(0, 10) : [];
  if (!jobs.length) {
    refs.jobRunList.innerHTML = `
      <div class="empty-state compact-empty">
        <div class="empty-state-text">No refresh or scrape jobs have been recorded yet.</div>
      </div>
    `;
    return;
  }

  let html = jobs.map((job) => {
    const status = (job.status || "unknown").toLowerCase();
    const statusLabel = job.active ? "running" : status;
    const tone = status === "error" ? "up" : (job.active ? "active" : "down");
    const detailBits = [formatDateTime(job.startedAt)];
    if (job.durationSeconds != null) {
      detailBits.push(`${job.durationSeconds.toFixed(job.durationSeconds < 10 ? 1 : 0)}s`);
    }
    if (job.finishedAt && !job.active) {
      detailBits.push(`finished ${formatRelativeTime(job.finishedAt)}`);
    }

    const resultSummary = summariseJobResult(job);
    if (resultSummary.summary) {
      detailBits.push(resultSummary.summary);
    }

    const notes = [job.error, ...resultSummary.notes].filter(Boolean);

    return `
      <article class="activity-item">
        <div class="activity-main">
          <div class="activity-title">${esc(job.job)} <span class="activity-context">· ${esc(statusLabel)}</span></div>
          <div class="activity-meta">${detailBits.join(" · ")}</div>
          ${notes.map((note) => `<div class="activity-note">${esc(note)}</div>`).join("")}
        </div>
        <div class="activity-side">
          <div class="activity-pill activity-pill--${tone}">${esc(statusLabel)}</div>
        </div>
      </article>
    `;
  }).join("");

  if (apiStatusData?.lastWarning?.message) {
    html = `
      <article class="activity-item">
        <div class="activity-main">
          <div class="activity-title">dataset safeguard <span class="activity-context">· warning</span></div>
          <div class="activity-meta">${esc(formatDateTime(apiStatusData.lastWarning.recordedAt))}</div>
          <div class="activity-note">${esc(apiStatusData.lastWarning.message)}</div>
        </div>
        <div class="activity-side">
          <div class="activity-pill activity-pill--up">warning</div>
        </div>
      </article>
    ` + html;
  }

  refs.jobRunList.innerHTML = html;
}

function renderFilterSummary() {
  if (!refs.filterSummary) return;

  const chips = [];
  if (activeType !== "ALL") chips.push({ label: `Type: ${activeType}`, action: "type" });
  if (activeSize !== "ALL") chips.push({ label: `Size: ${activeSize}`, action: "size" });
  if (pricedOnly) chips.push({ label: "Rows: priced only", action: "priced" });
  if (searchQuery) chips.push({ label: `Strain: ${searchQuery}`, action: "search" });
  if (!(sortField === "distance" && sortDir === "asc")) chips.push({ label: `Sort: ${getSortLabel()}`, action: "sort" });
  if (activeTab === "insights" && historyType !== "ALL") chips.push({ label: `History: ${historyType}`, action: "history" });
  if (activeTab === "insights" && historySize !== "ALL") chips.push({ label: `History size: ${historySize}`, action: "history" });

  if (!chips.length) {
    refs.filterSummary.hidden = true;
    refs.filterSummary.innerHTML = "";
    return;
  }

  refs.filterSummary.hidden = false;
  refs.filterSummary.innerHTML = `
    <span class="filter-summary-label">Active view</span>
    ${chips.map((chip) => `
      <button class="filter-chip" type="button" data-filter-reset="${chip.action}">
        <span>${esc(chip.label)}</span>
        <span aria-hidden="true">×</span>
      </button>
    `).join("")}
  `;
}

function renderKPIs(model) {
  const rows = model.rows;
  const dispensaries = model.dispensaries;
  const pricedRows = rows.filter((row) => row.price != null);
  const uniqueStrainCount = new Set(rows.map((row) => row.strain)).size;

  setText("kpiDispensaries", dispensaries.length);
  setText("kpiDispensariesSub", rows.length ? `${pluralize(rows.length, "listing")} visible` : "No visible listings");

  setText("kpiStrains", uniqueStrainCount);
  setText("kpiStrainsSub", rows.length ? `${pluralize(pricedRows.length, "priced listing")} shown` : "Try clearing filters");

  setText("kpiLowestLabel", "Lowest Visible Price");
  const lowest = pricedRows.slice().sort((a, b) => a.price - b.price)[0];
  if (lowest) {
    setText("kpiLowest", formatPrice(lowest.price));
    setText("kpiLowestSub", `${lowest.size} · ${lowest.strain} @ ${lowest.dispensary}`);
  } else {
    setText("kpiLowest", "—");
    setText("kpiLowestSub", "No prices in current view");
  }

  const avgLabelParts = ["Avg"];
  if (activeType !== "ALL") avgLabelParts.push(activeType);
  if (activeSize !== "ALL") avgLabelParts.push(activeSize);
  avgLabelParts.push("Price");
  setText("kpiAvgLabel", avgLabelParts.join(" "));
  const avgVisiblePrice = average(pricedRows.map((row) => row.price));
  setText("kpiAvg", avgVisiblePrice != null ? formatPrice(avgVisiblePrice, 2) : "—");
  setText("kpiAvgSub", pricedRows.length ? `${pluralize(pricedRows.length, "priced row")} in view` : "No prices in current view");

  const bulkCandidates = pricedRows
    .map((row) => ({ ...row, grams: sizeToGrams(row.size) }))
    .filter((row) => row.grams != null && row.grams >= 7)
    .map((row) => ({ ...row, unitPrice: row.price / row.grams }))
    .sort((a, b) => a.unitPrice - b.unitPrice);

  setText("kpiBulkLabel", "Best Bulk Value");
  if (bulkCandidates.length) {
    const bulk = bulkCandidates[0];
    setText("kpiBulk", formatUnitPrice(bulk.unitPrice));
    setText("kpiBulkSub", `${bulk.size} · ${formatPrice(bulk.price)} @ ${bulk.dispensary}`);
  } else {
    setText("kpiBulk", "—");
    setText("kpiBulkSub", "Need 7g+ priced listings");
  }

  const latestDrop = dispensaries
    .filter((dispensary) => dispensary.dropDate)
    .sort((a, b) => new Date(`${b.dropDate}T00:00:00`).getTime() - new Date(`${a.dropDate}T00:00:00`).getTime())[0];

  setText("kpiDropLabel", "Latest Drop");
  if (latestDrop) {
    setText("kpiDrop", formatShortDate(latestDrop.dropDate));
    setText("kpiDropSub", `${latestDrop.name} · ${formatDistance(latestDrop.distance)}`);
  } else {
    setText("kpiDrop", "—");
    setText("kpiDropSub", "No drop dates in view");
  }
}

function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    primary: style.getPropertyValue("--color-primary").trim(),
    primaryMuted: style.getPropertyValue("--color-primary-muted").trim(),
    blue: style.getPropertyValue("--color-blue").trim(),
    blueMuted: style.getPropertyValue("--color-blue-muted").trim(),
    text: style.getPropertyValue("--chart-text").trim(),
    grid: style.getPropertyValue("--chart-grid").trim(),
    surface: style.getPropertyValue("--color-surface").trim(),
    border: style.getPropertyValue("--color-border").trim(),
    muted: style.getPropertyValue("--color-text-muted").trim(),
  };
}

function renderStrainChart(rows) {
  if (!hasChartLibrary()) {
    destroyChart("strain");
    setCanvasEmpty("strainChart", "Chart.js did not load, so the availability chart is unavailable.");
    return;
  }

  const counts = new Map();
  rows.forEach((row) => {
    const key = row.strain;
    if (!counts.has(key)) counts.set(key, new Set());
    counts.get(key).add(row.dispensary);
  });

  const chartRows = [...counts.entries()]
    .map(([strain, dispensaries]) => ({ strain, count: dispensaries.size }))
    .sort((a, b) => b.count - a.count || a.strain.localeCompare(b.strain, undefined, { sensitivity: "base" }))
    .slice(0, 10)
    .reverse();

  if (!chartRows.length) {
    destroyChart("strain");
    setCanvasEmpty("strainChart", "No visible strain data for the current filters.");
    return;
  }

  setCanvasEmpty("strainChart", "");
  if (refs.strainChartSubtitle) {
    refs.strainChartSubtitle.textContent = `${pluralize(chartRows.length, "strain")} ranked by visible dispensary count`;
  }

  const canvas = document.getElementById("strainChart");
  const colors = getChartColors();
  destroyChart("strain");

  charts.strain = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: chartRows.map((row) => row.strain),
      datasets: [{
        data: chartRows.map((row) => row.count),
        backgroundColor: `${colors.primary}cc`,
        borderColor: colors.primary,
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.72,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.text,
          borderColor: colors.border,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: (context) => `${context.raw} dispensaries`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: colors.text,
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            stepSize: 1,
          },
          grid: { color: colors.grid, drawBorder: false },
        },
        y: {
          ticks: {
            color: colors.text,
            font: { family: "'Inter', sans-serif", size: 11 },
          },
          grid: { display: false },
        },
      },
    },
  });
}

function getComparisonRows(rows) {
  const priced = rows.filter((row) => row.price != null);
  if (!priced.length) return { rows: [], size: null };

  const chosenSize = activeSize !== "ALL"
    ? activeSize
    : [...priced.reduce((map, row) => {
        map.set(row.size, (map.get(row.size) || 0) + 1);
        return map;
      }, new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const comparableRows = chosenSize ? priced.filter((row) => row.size === chosenSize) : priced;
  return { rows: comparableRows, size: chosenSize };
}

function renderPriceChart(rows) {
  if (!hasChartLibrary()) {
    destroyChart("price");
    setCanvasEmpty("priceChart", "Chart.js did not load, so the dispensary price chart is unavailable.");
    return;
  }

  const comparison = getComparisonRows(rows);
  const priceMap = new Map();

  comparison.rows.forEach((row) => {
    if (!priceMap.has(row.dispensary)) {
      priceMap.set(row.dispensary, { REC: [], MED: [] });
    }
    priceMap.get(row.dispensary)[row.type === "MED" ? "MED" : "REC"].push(row.price);
  });

  const labels = [...priceMap.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const recValues = labels.map((label) => {
    const values = priceMap.get(label).REC;
    return values.length ? Math.round(average(values)) : null;
  });
  const medValues = labels.map((label) => {
    const values = priceMap.get(label).MED;
    return values.length ? Math.round(average(values)) : null;
  });

  if (refs.priceChartSubtitle) {
    refs.priceChartSubtitle.textContent = comparison.rows.length && comparison.size
      ? `${comparison.size} averages across visible dispensaries`
      : "Comparable averages across visible listings";
  }

  if (!labels.length || (!recValues.some((value) => value != null) && !medValues.some((value) => value != null))) {
    destroyChart("price");
    setCanvasEmpty("priceChart", "No comparable priced listings are visible right now.");
    return;
  }

  setCanvasEmpty("priceChart", "");
  const canvas = document.getElementById("priceChart");
  const colors = getChartColors();
  destroyChart("price");

  charts.price = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: labels.map((label) => label.length > 18 ? `${label.slice(0, 16)}…` : label),
      datasets: [
        {
          label: "REC Avg",
          data: recValues,
          backgroundColor: `${colors.primary}cc`,
          borderColor: colors.primary,
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.82,
          categoryPercentage: 0.7,
        },
        {
          label: "MED Avg",
          data: medValues,
          backgroundColor: `${colors.blue}88`,
          borderColor: colors.blue,
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.82,
          categoryPercentage: 0.7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            color: colors.text,
            font: { family: "'Inter', sans-serif", size: 11 },
            boxWidth: 10,
            boxHeight: 10,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.text,
          borderColor: colors.border,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatPrice(context.raw)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: colors.text,
            font: { family: "'Inter', sans-serif", size: 10 },
            maxRotation: 35,
            minRotation: 0,
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: colors.text,
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (value) => `$${value}`,
          },
          grid: { color: colors.grid, drawBorder: false },
        },
      },
    },
  });
}

function renderDeals(rows) {
  if (!refs.dealGrid) return;

  const priced = rows.filter((row) => row.price != null);
  if (!priced.length) {
    renderCompactEmptyState(refs.dealGrid, "No priced listings match the current filters.");
    return;
  }

  const typeOrder = activeType === "ALL" ? ["REC", "MED"] : [activeType];
  const sizeOrder = activeSize === "ALL" ? ["14g", "28g", "7g", "3.5g"] : [activeSize];

  const cards = [];
  for (const typeValue of typeOrder) {
    for (const sizeValue of sizeOrder) {
      const match = priced
        .filter((row) => row.type === typeValue && row.size === sizeValue)
        .sort((a, b) => a.price - b.price || a.dispensary.localeCompare(b.dispensary, undefined, { sensitivity: "base" }))[0];

      if (!match) continue;

      const grams = sizeToGrams(match.size);
      const unitPrice = grams ? match.price / grams : null;
      cards.push(`
        <article class="deal-card">
          <div class="deal-label">${esc(typeValue)} · ${esc(sizeValue)}</div>
          <div class="deal-price">${formatPrice(match.price)}</div>
          <div class="deal-meta">${esc(match.strain)} @ ${esc(match.dispensary)}</div>
          <div class="deal-note">${unitPrice != null ? `${formatUnitPrice(unitPrice)} · ${formatDistance(match.distance)}` : `${formatDistance(match.distance)}`}</div>
        </article>
      `);

      if (cards.length >= 6) break;
    }
    if (cards.length >= 6) break;
  }

  renderHtmlList(refs.dealGrid, cards, "No priced listings match the current filters.");
}

function renderFreshDrops(dispensaries) {
  if (!refs.freshDropList) return;

  const freshDrops = dispensaries
    .filter((dispensary) => dispensary.dropDate)
    .sort((a, b) => new Date(`${b.dropDate}T00:00:00`).getTime() - new Date(`${a.dropDate}T00:00:00`).getTime())
    .slice(0, 6);

  renderHtmlList(refs.freshDropList, freshDrops.map((dispensary) => `
    <article class="drop-row">
      <div class="drop-row-main">
        <div class="drop-row-title">${esc(dispensary.name)}</div>
        <div class="drop-row-meta">${pluralize(dispensary.uniqueStrainCount, "strain")} · ${pluralize(dispensary.productCount, "listing")} · ${formatDistance(dispensary.distance)}</div>
        ${buildExternalLinks(dispensary, { compact: true })}
      </div>
      <div class="drop-date-pill ${getDropClass(dispensary.dropDate)}">${formatShortDate(dispensary.dropDate)}</div>
    </article>
  `), "No drop dates are visible with the current filters.");
}

function groupDispensaryProductsByType(dispensary) {
  const groupedByType = new Map();
  dispensary.products.forEach((product) => {
    const typeValue = product.type || "REC";
    if (!groupedByType.has(typeValue)) groupedByType.set(typeValue, new Map());
    const strainMap = groupedByType.get(typeValue);
    if (!strainMap.has(product.strain)) strainMap.set(product.strain, []);
    strainMap.get(product.strain).push(product);
  });
  return groupedByType;
}

function renderDispensaryProductChips(products) {
  return products
    .slice()
    .sort((a, b) => (sizeToGrams(a.size) || 0) - (sizeToGrams(b.size) || 0))
    .map((product) => {
      const unit = getUnitPrice(product);
      return `
        <span class="product-chip">
          <span class="size-chip">${esc(product.size)}</span>
          ${product.price != null ? `<span class="product-price">${formatPrice(product.price)}</span>` : `<span class="product-price product-price--muted">No price</span>`}
          ${unit != null ? `<span class="product-unit mono">${formatMoneyPlain(unit)}/g</span>` : ""}
        </span>
      `;
    })
    .join("");
}

function renderDispensaryTypeGroup(typeValue, strainMap) {
  const rows = [...strainMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }))
    .slice(0, 6)
    .map(([strain, products]) => `
      <div class="product-row">
        <div class="product-row-head">
          <span class="strain-name">${esc(strain)}</span>
          <span class="product-row-thc mono">${formatThc(products[0].thcValue ?? products[0].thc, "")}</span>
        </div>
        <div class="product-chip-row">${renderDispensaryProductChips(products)}</div>
      </div>
    `)
    .join("");

  const hiddenCount = strainMap.size > 6 ? `<div class="disp-products-more">+${strainMap.size - 6} more ${typeValue} strains</div>` : "";

  return `
    <div class="product-type-group">
      <div class="type-heading-row">
        <span class="type-label">${esc(typeValue)}</span>
        <span class="type-group-meta">${pluralize(strainMap.size, "strain")}</span>
      </div>
      ${rows}
      ${hiddenCount}
    </div>
  `;
}

function renderDispensaryTypeGroups(dispensary) {
  const groupedByType = groupDispensaryProductsByType(dispensary);
  return [...groupedByType.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([typeValue, strainMap]) => renderDispensaryTypeGroup(typeValue, strainMap))
    .join("");
}

function buildDispensarySummaryPills(dispensary) {
  return [
    dispensary.minPrice != null ? `<span class="summary-pill">from ${formatPrice(dispensary.minPrice)}</span>` : "",
    dispensary.minUnitPrice != null ? `<span class="summary-pill">best ${formatUnitPrice(dispensary.minUnitPrice)}</span>` : "",
    `<span class="summary-pill">${pluralize(dispensary.uniqueStrainCount, "strain")}</span>`,
    `<span class="summary-pill">${dispensary.pricedCount}/${dispensary.productCount} priced</span>`,
  ].filter(Boolean).join("");
}

function renderDispensaryCard(dispensary) {
  const coverage = dispensary.productCount ? Math.round((dispensary.pricedCount / dispensary.productCount) * 100) : 0;
  const typeGroups = renderDispensaryTypeGroups(dispensary);
  const summaryPills = buildDispensarySummaryPills(dispensary);
  const selectedClass = selectedDispensaryName === dispensary.name ? " is-selected" : "";

  return `
    <article class="disp-card${selectedClass}" data-store-card="${esc(dispensary.name)}">
      <div class="disp-card-header">
        <div>
          <div class="disp-name">${esc(dispensary.name)}</div>
          <div class="disp-card-subtitle">${esc(dispensary.address || "Address unavailable")}</div>
        </div>
        <span class="distance-badge">${formatDistance(dispensary.distance)}</span>
      </div>
      <div class="disp-card-meta">${summaryPills}</div>
      <div class="disp-card-utility-row">
        ${dispensary.dropDate ? `<div class="disp-drop"><span class="${getDropClass(dispensary.dropDate)}">Drop ${formatShortDate(dispensary.dropDate)}</span></div>` : `<div class="disp-drop"><span class="drop-old">No drop date</span></div>`}
        ${buildCoverageMeter(coverage, `${dispensary.name} pricing coverage`)}
      </div>
      <div class="disp-card-actions">
        <button class="btn-sm btn-secondary" type="button" data-focus-map="${esc(dispensary.name)}">Map</button>
        <button class="btn-sm btn-secondary" type="button" data-filter-store="${esc(dispensary.name)}">Filter</button>
        ${buildExternalLinks(dispensary)}
      </div>
      <div class="disp-products">${typeGroups || '<div class="disp-products-empty">No visible products</div>'}</div>
    </article>
  `;
}

function renderDispensaryCards(dispensaries) {
  if (!refs.dispensaryGrid) return;

  if (!dispensaries.length) {
    refs.dispensaryGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">∅</div>
        <div class="empty-state-text">No dispensaries match your filters.</div>
      </div>
    `;
    return;
  }

  refs.dispensaryGrid.innerHTML = dispensaries.map(renderDispensaryCard).join("");
}

function renderTable(rows) {
  if (!refs.tableBody) return;

  if (!rows.length) {
    refs.tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <div class="empty-state-icon">∅</div>
          <div class="empty-state-text">No products match your filters.</div>
        </td>
      </tr>
    `;
    return;
  }

  refs.tableBody.innerHTML = rows.map(getTableRowMarkup).join("");
}

function updateTableSortIndicators() {
  sortableTableHeaders.forEach((header) => {
    header.classList.remove("sort-active", "sort-desc");
    header.setAttribute("aria-sort", "none");
    if (header.dataset.sort === sortField) {
      header.classList.add("sort-active");
      if (sortDir === "desc") header.classList.add("sort-desc");
      header.setAttribute("aria-sort", sortDir === "desc" ? "descending" : "ascending");
    }
  });
}

function renderResultCount(rows) {
  if (refs.resultCount) refs.resultCount.textContent = `${rows.length} rows`;
}

function renderOverviewMeta(model) {
  if (refs.dispensarySummary) {
    const pricedCount = model.rows.filter((row) => row.price != null).length;
    refs.dispensarySummary.textContent = `${pluralize(model.dispensaries.length, "shop")} · ${pluralize(pricedCount, "priced row")}`;
  }

  if (refs.tableSummary) {
    refs.tableSummary.textContent = `${pluralize(model.rows.length, "row")} ready for export across ${pluralize(model.dispensaries.length, "dispensary")}.`;
  }

  if (refs.mapSummary) {
    const plotted = model.dispensaries.filter((dispensary) => dispensary.lat != null && dispensary.lng != null).length;
    refs.mapSummary.textContent = `${pluralize(plotted, "dispensary", "dispensaries")} mapped from the current view.`;
  }
}

function groupHistorySeries(records) {
  const buckets = new Map();

  records.forEach((record) => {
    const recordedAt = record.recordedAt;
    const typeValue = (record.type || "REC").toUpperCase();
    if (!buckets.has(recordedAt)) buckets.set(recordedAt, { REC: [], MED: [] });
    if (!buckets.get(recordedAt)[typeValue]) buckets.get(recordedAt)[typeValue] = [];
    buckets.get(recordedAt)[typeValue].push(record.price);
  });

  const timestamps = [...buckets.keys()].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return {
    timestamps,
    REC: timestamps.map((timestamp) => {
      const values = buckets.get(timestamp).REC || [];
      return values.length ? average(values) : null;
    }),
    MED: timestamps.map((timestamp) => {
      const values = buckets.get(timestamp).MED || [];
      return values.length ? average(values) : null;
    }),
    counts: timestamps.map((timestamp) => {
      const bucket = buckets.get(timestamp);
      return (bucket.REC?.length || 0) + (bucket.MED?.length || 0);
    }),
  };
}

function renderHistoryChart(records) {
  if (!hasChartLibrary()) {
    destroyChart("history");
    setCanvasEmpty("historyChart", "Chart.js did not load, so the history chart is unavailable.");
    return;
  }

  const filteredRecords = records.filter((record) => record.price != null);
  if (!filteredRecords.length) {
    destroyChart("history");
    setCanvasEmpty("historyChart", "No history records match the current history filters.");
    return;
  }

  const grouped = groupHistorySeries(filteredRecords);
  if (!grouped.timestamps.length) {
    destroyChart("history");
    setCanvasEmpty("historyChart", "No chartable history data is available.");
    return;
  }

  setCanvasEmpty("historyChart", "");
  const colors = getChartColors();
  const canvas = document.getElementById("historyChart");
  destroyChart("history");

  const datasets = [];
  if (historyType === "ALL") {
    if (grouped.REC.some((value) => value != null)) {
      datasets.push({
        label: "REC Avg",
        data: grouped.REC,
        borderColor: colors.primary,
        backgroundColor: colors.primaryMuted,
        tension: 0.35,
        pointRadius: 3,
        spanGaps: true,
      });
    }
    if (grouped.MED.some((value) => value != null)) {
      datasets.push({
        label: "MED Avg",
        data: grouped.MED,
        borderColor: colors.blue,
        backgroundColor: colors.blueMuted,
        tension: 0.35,
        pointRadius: 3,
        spanGaps: true,
      });
    }
  } else {
    const key = historyType === "MED" ? "MED" : "REC";
    const color = key === "MED" ? colors.blue : colors.primary;
    datasets.push({
      label: `${key} Avg`,
      data: grouped[key],
      borderColor: color,
      backgroundColor: key === "MED" ? colors.blueMuted : colors.primaryMuted,
      tension: 0.35,
      pointRadius: 3,
      spanGaps: true,
    });
  }

  if (!datasets.length) {
    destroyChart("history");
    setCanvasEmpty("historyChart", "No history records match the current history filters.");
    return;
  }

  charts.history = new window.Chart(canvas, {
    type: "line",
    data: {
      labels: grouped.timestamps.map((timestamp) => formatDateTime(timestamp)),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          align: "end",
          labels: {
            color: colors.text,
            font: { family: "'Inter', sans-serif", size: 11 },
          },
        },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.text,
          borderColor: colors.border,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            footer: (tooltipItems) => {
              const index = tooltipItems[0]?.dataIndex ?? 0;
              return `${grouped.counts[index]} captured rows`;
            },
            label: (context) => `${context.dataset.label}: ${formatPrice(context.raw, 2)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: colors.text,
            font: { family: "'Inter', sans-serif", size: 10 },
            maxRotation: 0,
            autoSkipPadding: 16,
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: false,
          ticks: {
            color: colors.text,
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (value) => `$${value}`,
          },
          grid: { color: colors.grid, drawBorder: false },
        },
      },
    },
  });
}

function computeRecentMoves(records) {
  const grouped = new Map();

  records.forEach((record) => {
    const key = [record.dispensary, record.strain, record.size, record.type].join("||");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  });

  const moves = [];
  grouped.forEach((items) => {
    const sorted = items
      .filter((item) => item.price != null)
      .slice()
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

    if (sorted.length < 2) return;

    const latest = sorted[0];
    const previous = sorted.find((item) => item.price !== latest.price && item.recordedAt !== latest.recordedAt);
    if (!previous) return;

    moves.push({
      ...latest,
      previousPrice: previous.price,
      delta: latest.price - previous.price,
      previousRecordedAt: previous.recordedAt,
    });
  });

  return moves.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

function renderPriceMoves(records) {
  if (!refs.priceMoveList || !refs.historyMoveCount) return;

  const moves = computeRecentMoves(records).slice(0, 8);
  refs.historyMoveCount.textContent = pluralize(moves.length, "move");

  renderHtmlList(refs.priceMoveList, moves.map((move) => {
    const direction = move.delta > 0 ? "up" : "down";
    const deltaText = `${move.delta > 0 ? "+" : "−"}${formatMoneyPlain(Math.abs(move.delta), 2)}`;
    return `
      <article class="activity-item">
        <div class="activity-main">
          <div class="activity-title">${esc(move.strain)} <span class="activity-context">· ${esc(move.size)} ${esc(move.type)}</span></div>
          <div class="activity-meta">${esc(move.dispensary)} · ${formatDateTime(move.recordedAt)}</div>
        </div>
        <div class="activity-side">
          <div class="activity-price">${formatPrice(move.price)}</div>
          <div class="activity-pill activity-pill--${direction}">${deltaText}</div>
        </div>
      </article>
    `;
  }), "No recorded price changes yet. The history view will become richer after repeat scrapes capture new prices.");
}

function renderCoverageList(dispensaries) {
  if (!refs.coverageList) return;

  const rows = dispensaries
    .map((dispensary) => ({
      name: dispensary.name,
      coverage: dispensary.productCount ? Math.round((dispensary.pricedCount / dispensary.productCount) * 100) : 0,
      pricedCount: dispensary.pricedCount,
      productCount: dispensary.productCount,
      distance: toNumber(dispensary.distance),
    }))
    .sort((a, b) => b.coverage - a.coverage || compareValues(a.distance ?? Infinity, b.distance ?? Infinity, 1))
    .slice(0, 10);

  renderHtmlList(refs.coverageList, rows.map((row) => `
    <article class="coverage-row">
      <div class="coverage-head">
        <div class="coverage-title">${esc(row.name)}</div>
        <div class="coverage-meta mono">${row.coverage}%</div>
      </div>
      <div class="coverage-bar">
        <div class="coverage-fill" style="width:${row.coverage}%"></div>
      </div>
      <div class="coverage-sub">${row.pricedCount}/${row.productCount} priced · ${formatDistance(row.distance)}</div>
    </article>
  `), "No dispensaries are visible with the current filters.");
}

function renderCaptureList(records) {
  if (!refs.captureList) return;

  const captures = records.slice(0, 10);
  renderHtmlList(refs.captureList, captures.map((record) => `
    <article class="activity-item">
      <div class="activity-main">
        <div class="activity-title">${esc(record.strain)} <span class="activity-context">· ${esc(record.size)} ${esc(record.type)}</span></div>
        <div class="activity-meta">${esc(record.dispensary)} · ${formatDateTime(record.recordedAt)}</div>
      </div>
      <div class="activity-side">
        <div class="activity-price">${formatPrice(record.price)}</div>
      </div>
    </article>
  `), "No history records match the current history filters.");
}

function renderInsights(records, model) {
  const uniqueListingKeys = new Set(records.map((record) => [record.dispensary, record.strain, record.size, record.type].join("||")));

  if (refs.historySummary) {
    refs.historySummary.textContent = records.length
      ? `${pluralize(records.length, "capture")} across ${pluralize(uniqueListingKeys.size, "listing")}`
      : "No history records match the current history filters";
  }

  renderHistoryChart(records);
  renderPriceMoves(records);
  renderCoverageList(model.dispensaries);
  renderCaptureList(records);
}

function renderAllCharts(model) {
  renderStrainChart(model.rows);
  renderPriceChart(model.rows);
  renderInsights(getFilteredHistoryRecords(), model);
}

function initMap() {
  if (!refs.mapContainer) return;
  if (!hasLeaflet()) {
    refs.mapContainer.innerHTML = `
      <div class="map-fallback">
        <div class="empty-state-icon">⌖</div>
        <div class="empty-state-text">Leaflet did not load, so the map view is unavailable.</div>
      </div>
    `;
    return;
  }

  if (map) return;

  const centerLat = appData?.centerLat ?? 38.9283;
  const centerLng = appData?.centerLng ?? -104.7949;
  const radiusMiles = appData?.radius ?? 30;

  map = window.L.map(refs.mapContainer, {
    center: [centerLat, centerLng],
    zoom: 11,
    zoomControl: true,
  });

  mapTileLayer = window.L.tileLayer(getTileUrl(), {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  radiusCircle = window.L.circle([centerLat, centerLng], {
    radius: radiusMiles * 1609.34,
    color: getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),
    weight: 1,
    opacity: 0.3,
    fillOpacity: 0.04,
    dashArray: "6 4",
  }).addTo(map);

  updateMapMarkers(buildVisibleModel().dispensaries);
}

function ensureMapReady(dispensaries = []) {
  if (activeTab !== "map") return;
  if (!map) {
    initMap();
  }
  if (!map) return;

  requestAnimationFrame(() => {
    map.invalidateSize();
    updateMapMarkers(dispensaries);
  });
}

function updateMapMarkers(dispensaries) {
  if (!map || !hasLeaflet()) return;

  mapMarkers.forEach((marker) => map.removeLayer(marker));
  mapMarkers = [];
  mapMarkerIndex = new Map();
  const latLngs = [];

  const style = getComputedStyle(document.documentElement);
  const primaryColor = style.getPropertyValue("--color-primary").trim();
  const textColor = style.getPropertyValue("--color-text").trim();
  const mutedColor = style.getPropertyValue("--color-text-muted").trim();

  dispensaries.forEach((dispensary) => {
    if (dispensary.lat == null || dispensary.lng == null) return;

    const isSelected = selectedDispensaryName === dispensary.name;
    const marker = window.L.circleMarker([dispensary.lat, dispensary.lng], {
      radius: isSelected ? 14 : Math.max(6, Math.min(16, 5 + dispensary.uniqueStrainCount)),
      color: primaryColor,
      fillColor: primaryColor,
      fillOpacity: isSelected ? 0.92 : 0.68,
      weight: isSelected ? 3 : 2,
      opacity: 0.95,
    }).addTo(map);

    const uniqueStrains = [...new Set(dispensary.products.map((product) => product.strain))];
    const strainsHtml = uniqueStrains.slice(0, 8).map((strain) => `<span class="popup-strain-chip">${esc(strain)}</span>`).join("");
    const plusMore = uniqueStrains.length > 8 ? `<span class="popup-strain-chip">+${uniqueStrains.length - 8}</span>` : "";
    const priceRange = dispensary.minPrice != null && dispensary.maxPrice != null
      ? `${formatPrice(dispensary.minPrice)}–${formatPrice(dispensary.maxPrice)}`
      : dispensary.minPrice != null
        ? `${formatPrice(dispensary.minPrice)}`
        : "No prices";

    marker.bindPopup(`
      <div class="map-popup">
        <strong>${esc(dispensary.name)}</strong>
        <div class="popup-meta" style="color:${esc(mutedColor)}">
          ${esc(dispensary.address || "")}<br>
          ${formatDistance(dispensary.distance)} · ${pluralize(dispensary.productCount, "listing")} · ${priceRange}
        </div>
        <div class="popup-strains">${strainsHtml}${plusMore}</div>
      </div>
    `, { maxWidth: 280, className: "gdl-popup" });

    marker.on?.("click", () => {
      selectedDispensaryName = dispensary.name;
      renderAll();
    });

    mapMarkers.push(marker);
    mapMarkerIndex.set(dispensary.name, marker);
    latLngs.push([dispensary.lat, dispensary.lng]);
  });

  if (!latLngs.length) {
    const centerLat = appData?.centerLat ?? 38.9283;
    const centerLng = appData?.centerLng ?? -104.7949;
    map.setView([centerLat, centerLng], 11);
    return;
  }

  if (selectedDispensaryName && mapMarkerIndex.has(selectedDispensaryName)) {
    const selectedMarker = mapMarkerIndex.get(selectedDispensaryName);
    const latLng = selectedMarker.getLatLng?.();
    if (latLng) {
      map.setView(latLng, Math.max(map.getZoom?.() || 11, 12));
    }
    return;
  }

  if (latLngs.length === 1) {
    map.setView(latLngs[0], 12);
    return;
  }

  const bounds = window.L.latLngBounds(latLngs);
  map.fitBounds(bounds.pad(0.2), { maxZoom: 12 });
}

function buildCSV(rows) {
  const headers = ["dispensary", "address", "distance", "strain", "size", "price", "unitPrice", "type", "thc", "dropDate", "menuUrl", "dropUrl"];
  const escapeField = (value) => {
    const text = value == null ? "" : String(value);
    if (/["\n,]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeField(row[header])).join(",")),
  ];

  return lines.join("\n");
}

function downloadText(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportRows(format) {
  const model = buildVisibleModel();
  const rows = model.rows;

  if (!rows.length) {
    flashAlert("There are no visible rows to export.", "error");
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (format === "csv") {
    downloadText(`gdl-flower-tracker-${timestamp}.csv`, buildCSV(rows), "text/csv;charset=utf-8");
    flashAlert(`Exported ${rows.length} rows to CSV.`, "success", 2500);
    return;
  }

  downloadText(`gdl-flower-tracker-${timestamp}.json`, JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
  flashAlert(`Exported ${rows.length} rows to JSON.`, "success", 2500);
}

function renderAll() {
  if (!appData) {
    updateActionButtons();
    return;
  }

  const model = buildVisibleModel();
  if (selectedDispensaryName && !model.dispensaries.some((dispensary) => dispensary.name === selectedDispensaryName)) {
    selectedDispensaryName = "";
  }

  populateStrainSuggestions();
  renderLastUpdated();
  renderDataFreshness();
  renderScrapeStatus();
  renderFilterSummary();
  renderPresetBar();
  renderHero(model);
  renderKPIs(model);
  renderAllCharts(model);
  renderOperations();
  renderDeals(model.rows);
  renderFreshDrops(model.dispensaries);
  renderCompareGrid(model);
  renderDispensaryCards(model.dispensaries);
  renderTable(model.rows);
  renderResultCount(model.rows);
  renderOverviewMeta(model);
  renderMapList(model.dispensaries.filter((dispensary) => dispensary.lat != null && dispensary.lng != null));
  updateTableSortIndicators();
  updateActionButtons();
  ensureMapReady(model.dispensaries);
}

async function loadData({ silent = false } = {}) {
  if (dataLoadPromise) {
    if (!silent && activeLoadSilent) {
      activeLoadSilent = false;
      setAlert("Loading tracker data…", "info");
    }
    return dataLoadPromise;
  }
  activeLoadSilent = silent;
  if (!silent) setAlert("Loading tracker data…", "info");

  dataLoadPromise = (async () => {
    try {
      let degradedPanels = [];

      try {
        const dashboard = await fetchJSON(DASHBOARD_PATH);
        applyDashboardPayload(dashboard);
      } catch (dashboardError) {
        console.warn("Dashboard bundle unavailable, falling back to legacy endpoints:", dashboardError);
        const legacyResult = await loadLegacyDataBundle();
        degradedPanels = legacyResult.degradedPanels || [];
      }

      renderAll();
      syncJobPolling();
      if (!activeLoadSilent) setAlert("");

      if (degradedPanels.length) {
        flashAlert(`Loaded the tracker, but ${degradedPanels.join(", ")} ${degradedPanels.length === 1 ? "is" : "are"} temporarily unavailable.`, "warning", 6500);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      if (!appData) {
        resetSupplementalState();
        renderAll();
      }
      if (jobPollTimer) {
        clearInterval(jobPollTimer);
        jobPollTimer = null;
      }
      updateActionButtons();
      setAlert(`Couldn’t load tracker data. ${error.message}. Start the backend with "python api_server.py" and open http://127.0.0.1:8000/.`, "error");
    } finally {
      activeLoadSilent = true;
      dataLoadPromise = null;
    }
  })();

  return dataLoadPromise;
}


function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = window.setInterval(() => {
    if (!shouldBackgroundRefresh()) return;
    triggerBackgroundLoad("auto refresh");
  }, 30 * 60 * 1000);
}

function resetFilters(target = "all") {
  if (target === "type" || target === "all") activeType = "ALL";
  if (target === "size" || target === "all") activeSize = "ALL";
  if (target === "priced" || target === "all") pricedOnly = false;
  if (target === "search" || target === "all") {
    searchQuery = "";
    selectedDispensaryName = "";
  }
  if (target === "sort" || target === "all") {
    sortField = "distance";
    sortDir = "asc";
  }
  if (target === "history" || target === "all") {
    historyType = "ALL";
    historySize = "ALL";
  }

  syncControls();
  persistState();
  renderAll();
}

function handleRefreshButton() {
  if (!refs.refreshBtn) return;
  refs.refreshBtn.dataset.actionLabel = "Refresh";
  refs.refreshBtn.addEventListener("click", async () => {
    await runActionButton(refs.refreshBtn, {
      pendingMarkup: refs.refreshBtn.innerHTML,
      request: () => fetchJSON("/api/refresh", { method: "POST" }),
      getSuccessMessage: (result) => {
        if (result.warning) {
          return {
            message: result.warning,
            type: "warning",
            duration: 6500,
          };
        }
        const detailNote = result.detailSupplements ? ` + ${result.detailSupplements} detail-page supplements` : "";
        return {
          message: `Refreshed ${result.dispensaryCount || 0} dispensaries and ${result.productCount || 0} products${detailNote}.`,
          type: "success",
        };
      },
      getErrorMessage: (error) => ({
        message: `Refresh failed: ${error.message}`,
        type: "error",
        duration: 6500,
      }),
      onBefore: () => refs.refreshBtn.classList.add("refreshing"),
      onFinally: () => refs.refreshBtn.classList.remove("refreshing"),
    });
  });
}

function handleSyncButton() {
  if (!refs.syncBtn) return;
  refs.syncBtn.dataset.actionLabel = "Sync";
  refs.syncBtn.addEventListener("click", async () => {
    await runActionButton(refs.syncBtn, {
      pendingMarkup: `
        <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
        </svg>
        <span>Syncing…</span>
      `,
      successMarkup: `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Synced</span>
      `,
      errorMarkup: `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span>Error</span>
      `,
      request: () => fetchJSON("/api/sync", { method: "POST" }),
      getSuccessMessage: (result) => {
        const scrapeNotes = [...(result.scrape?.warnings || []), ...(result.scrape?.errors || [])].filter(Boolean);
        if (result.status === "warning" || scrapeNotes.length || result.refresh?.warning) {
          return {
            message: result.refresh?.warning || scrapeNotes[0] || `Sync finished with warnings. ${result.pricedProducts || 0}/${result.totalProducts || 0} products are priced.`,
            type: "warning",
            duration: 7000,
          };
        }
        const detailNote = result.refresh?.detailSupplements ? ` + ${result.refresh.detailSupplements} detail-page supplements` : "";
        return {
          message: `Sync complete: ${result.dispensaryCount || 0} dispensaries, ${result.productCount || 0} listings, ${result.pricedProducts || 0}/${result.totalProducts || 0} priced${detailNote}.`,
          type: "success",
        };
      },
      getErrorMessage: (error) => ({
        message: `Sync failed: ${error.message}`,
        type: "error",
        duration: 6500,
      }),
    });
  });
}

function handleScrapeButton() {
  if (!refs.scrapeBtn) return;
  refs.scrapeBtn.dataset.actionLabel = "Scrape";
  refs.scrapeBtn.addEventListener("click", async () => {
    await runActionButton(refs.scrapeBtn, {
      pendingMarkup: `
        <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
        </svg>
        <span>Updating…</span>
      `,
      successMarkup: (result) => `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>${result.pricedProducts || 0}/${result.totalProducts || 0} priced</span>
      `,
      errorMarkup: `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span>Error</span>
      `,
      request: () => fetchJSON("/api/scrape", { method: "POST" }),
      getSuccessMessage: (result) => {
        const scrapeNotes = [...(result.warnings || []), ...(result.errors || [])].filter(Boolean);
        if (result.status === "warning" || scrapeNotes.length) {
          return {
            message: `Price refresh finished with warnings. ${scrapeNotes[0] || `${result.pricedProducts || 0}/${result.totalProducts || 0} products have prices.`}`,
            type: "warning",
            duration: 7000,
          };
        }
        return {
          message: `Menu scrape complete: ${result.pricedProducts || 0}/${result.totalProducts || 0} products have prices.`,
          type: "success",
        };
      },
      getErrorMessage: (error) => ({
        message: `Price refresh failed: ${error.message}`,
        type: "error",
        duration: 6500,
      }),
    });
  });
}

function handleInteractiveSurfaceClick(event) {
  const focusButton = findActionElement(event.target, "focusMap");
  if (focusButton) {
    event.preventDefault?.();
    focusMapDispensary(focusButton.dataset.focusMap);
    return;
  }

  const filterButton = findActionElement(event.target, "filterStore");
  if (filterButton) {
    event.preventDefault?.();
    filterToStore(filterButton.dataset.filterStore, { tab: "table" });
  }
}

function wireEvents() {
  handleRefreshButton();
  handleSyncButton();
  handleScrapeButton();

  document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  });

  document.querySelectorAll(".tab").forEach((tab, index, tabs) => {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tab, { persist: true });
    });

    tab.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;

      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;

      activateTab(tabs[nextIndex].dataset.tab, { persist: true, focusButton: true });
    });
  });

  typeFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeType = button.dataset.value;
      persistState();
      syncControls();
      renderAll();
    });
  });

  sizeFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeSize = button.dataset.value;
      persistState();
      syncControls();
      renderAll();
    });
  });

  refs.pricedOnlyBtn?.addEventListener("click", () => {
    pricedOnly = !pricedOnly;
    persistState();
    syncControls();
    renderAll();
  });

  refs.strainSearch?.addEventListener("input", (event) => {
    const nextValue = event.target.value.trim();
    if (refs.searchClearBtn) refs.searchClearBtn.hidden = !nextValue;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = window.setTimeout(() => {
      searchQuery = nextValue;
      persistState();
      renderAll();
    }, 120);
  });

  refs.searchClearBtn?.addEventListener("click", () => {
    searchQuery = "";
    if (refs.strainSearch) refs.strainSearch.value = "";
    persistState();
    syncControls();
    renderAll();
    refs.strainSearch?.focus?.();
  });

  refs.sortSelect?.addEventListener("change", (event) => {
    const selection = normalizeSortState(event.target.value);
    sortField = selection.field;
    sortDir = selection.dir;
    persistState();
    renderAll();
  });

  refs.presetBar?.addEventListener("click", (event) => {
    const presetButton = findActionElement(event.target, "preset");
    if (!presetButton) return;
    applyPreset(presetButton.dataset.preset);
  });

  [refs.spotlightCard, refs.compareGrid, refs.dispensaryGrid, refs.tableBody, refs.mapList].forEach((surface) => {
    surface?.addEventListener("click", handleInteractiveSurfaceClick);
  });

  refs.clearFiltersBtn?.addEventListener("click", () => resetFilters("all"));
  refs.shareViewBtn?.addEventListener("click", async () => {
    const shareUrl = new URL(buildUrlFromState(), window.location.origin).toString();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        flashAlert("Current view copied to clipboard.", "success", 2400);
        return;
      }
    } catch {
      // Fall back to a prompt below.
    }

    window.prompt("Copy this view URL", shareUrl);
  });

  refs.filterSummary?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-reset]");
    if (!button) return;
    resetFilters(button.dataset.filterReset);
  });

  sortableTableHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const field = header.dataset.sort;
      if (sortField === field) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortField = field;
        sortDir = field === "drop" ? "desc" : "asc";
      }
      persistState();
      syncControls();
      renderAll();
    });
  });

  refs.exportCsvBtn?.addEventListener("click", () => exportRows("csv"));
  refs.exportJsonBtn?.addEventListener("click", () => exportRows("json"));

  refs.historyTypeSelect?.addEventListener("change", (event) => {
    historyType = event.target.value;
    persistState();
    syncControls();
    renderAll();
  });

  refs.historySizeSelect?.addEventListener("change", (event) => {
    historySize = event.target.value;
    persistState();
    syncControls();
    renderAll();
  });

  if (typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", () => {
      if (shouldBackgroundRefresh()) {
        triggerBackgroundLoad("visibility change");
      }
      syncJobPolling();
    });
  }

  window.addEventListener("popstate", () => {
    applyResolvedState(resolveLocationState());
    applyTheme(theme, { persist: false, rerender: false });
    syncControls();
    renderAll();
  });
}

function init() {
  applyResolvedState(resolveLocationState());
  applyTheme(theme, { persist: false, rerender: false });
  wireEvents();
  syncControls();
  syncUrlState();
  loadData();
  startAutoRefresh();
}

init();
