import type {
  ActiveFilterChip,
  CompareCardModel,
  DashboardPayload,
  DashboardStatus,
  EmptyStateReason,
  FilterState,
  FocusedDispensaryModel,
  HistoryRecord,
  JobRun,
  MapSidebarItemModel,
  OverviewPreviewStoreModel,
  QuickIntent,
  RecommendationCardModel,
  SortDir,
  SortField,
  VisibleDispensary,
  VisibleModel,
  VisibleRow,
} from "@/lib/types";

export const DEFAULT_STATE: FilterState = {
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

export const STORAGE_KEY = "gdl-flower-tracker:v6-next";
export const DASHBOARD_HISTORY_LIMIT = 1500;
export const DASHBOARD_JOB_LIMIT = 12;
export const DASHBOARD_SHELL_PATH = "/api/dashboard?history_limit=0&job_limit=0";
export const REQUEST_TIMEOUT_MS = 20_000;

const SORT_OPTION_MAP: Record<string, { field: SortField; dir: SortDir }> = {
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

const VALID_SORT_FIELDS = new Set<SortField>([
  "distance",
  "unitPrice",
  "price",
  "strain",
  "dispensary",
  "size",
  "type",
  "thc",
  "drop",
]);

export const QUICK_INTENTS: QuickIntent[] = [
  {
    id: "best-value",
    label: "Best Value",
    description: "Show the strongest unit-price offers first.",
    patch: { pricedOnly: true, sortField: "unitPrice", sortDir: "asc", activeTab: "overview" },
  },
  {
    id: "cheapest-now",
    label: "Cheapest Now",
    description: "Surface the lowest visible price first.",
    patch: { pricedOnly: true, sortField: "price", sortDir: "asc", activeTab: "overview" },
  },
  {
    id: "closest-priced",
    label: "Closest Priced",
    description: "Prefer the nearest confirmed priced option.",
    patch: { pricedOnly: true, sortField: "distance", sortDir: "asc", activeTab: "map" },
  },
  {
    id: "fresh-drops",
    label: "Fresh Drops",
    description: "Bias toward newly updated shops and products.",
    patch: { sortField: "drop", sortDir: "desc", activeTab: "overview" },
  },
  {
    id: "med-only",
    label: "MED Only",
    description: "Limit the view to medical listings.",
    patch: { activeType: "MED", activeTab: "overview" },
  },
  {
    id: "rec-only",
    label: "REC Only",
    description: "Limit the view to recreational listings.",
    patch: { activeType: "REC", activeTab: "overview" },
  },
];

export function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function toNumber(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function sizeToGrams(size: string | null | undefined) {
  const value = Number.parseFloat(String(size || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value : null;
}

export function getUnitPrice(row: { price?: unknown; size?: string | null }) {
  const price = toNumber(row.price);
  const grams = sizeToGrams(row.size);
  if (price == null || grams == null || grams <= 0) return null;
  return price / grams;
}

export function normalizeSortState(field?: string | null, dir?: string | null) {
  const rawField = String(field || DEFAULT_STATE.sortField).trim().toLowerCase();
  const rawDir: SortDir = dir === "desc" ? "desc" : "asc";
  const mapped = SORT_OPTION_MAP[rawField];
  if (mapped) {
    return { field: mapped.field, dir: rawField === "unitprice" || rawField === "dropdate" ? rawDir : mapped.dir };
  }
  return {
    field: VALID_SORT_FIELDS.has(rawField as SortField) ? (rawField as SortField) : DEFAULT_STATE.sortField,
    dir: rawDir,
  };
}

export function buildUrlFromState(state: FilterState) {
  const params = new URLSearchParams();
  if (state.activeTab !== DEFAULT_STATE.activeTab) params.set("tab", state.activeTab);
  if (state.activeType !== DEFAULT_STATE.activeType) params.set("type", state.activeType);
  if (state.activeSize !== DEFAULT_STATE.activeSize) params.set("size", state.activeSize);
  if (state.pricedOnly) params.set("priced", "1");
  if (state.searchQuery) params.set("q", state.searchQuery);
  if (state.sortField !== DEFAULT_STATE.sortField) params.set("sort", state.sortField);
  if (state.sortDir !== DEFAULT_STATE.sortDir) params.set("dir", state.sortDir);
  if (state.theme !== DEFAULT_STATE.theme) params.set("theme", state.theme);
  if (state.historyType !== DEFAULT_STATE.historyType) params.set("htype", state.historyType);
  if (state.historySize !== DEFAULT_STATE.historySize) params.set("hsize", state.historySize);
  return params.toString();
}

export function parseStateFromSearchParams(searchParams: URLSearchParams) {
  const nextSort = normalizeSortState(searchParams.get("sort"), searchParams.get("dir"));
  return {
    activeTab: (searchParams.get("tab") as FilterState["activeTab"]) || DEFAULT_STATE.activeTab,
    activeType: (searchParams.get("type")?.toUpperCase() as FilterState["activeType"]) || DEFAULT_STATE.activeType,
    activeSize: (searchParams.get("size") as FilterState["activeSize"]) || DEFAULT_STATE.activeSize,
    pricedOnly: ["1", "true", "yes"].includes((searchParams.get("priced") || "").toLowerCase()),
    searchQuery: searchParams.get("q") || "",
    sortField: nextSort.field,
    sortDir: nextSort.dir,
    theme: searchParams.get("theme") === "light" ? "light" : DEFAULT_STATE.theme,
    historyType: (searchParams.get("htype")?.toUpperCase() as FilterState["historyType"]) || DEFAULT_STATE.historyType,
    historySize: (searchParams.get("hsize") as FilterState["historySize"]) || DEFAULT_STATE.historySize,
  } satisfies FilterState;
}

export function loadStoredState() {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    const nextSort = normalizeSortState(parsed.sortField, parsed.sortDir);
    return {
      activeTab: ["overview", "insights", "table", "map"].includes(parsed.activeTab) ? parsed.activeTab : DEFAULT_STATE.activeTab,
      activeType: ["ALL", "REC", "MED"].includes(parsed.activeType) ? parsed.activeType : DEFAULT_STATE.activeType,
      activeSize: ["ALL", "3.5g", "7g", "14g", "28g"].includes(parsed.activeSize) ? parsed.activeSize : DEFAULT_STATE.activeSize,
      pricedOnly: typeof parsed.pricedOnly === "boolean" ? parsed.pricedOnly : DEFAULT_STATE.pricedOnly,
      searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery : DEFAULT_STATE.searchQuery,
      sortField: nextSort.field,
      sortDir: nextSort.dir,
      theme: parsed.theme === "light" ? "light" : DEFAULT_STATE.theme,
      historyType: ["ALL", "REC", "MED"].includes(parsed.historyType) ? parsed.historyType : DEFAULT_STATE.historyType,
      historySize: ["ALL", "3.5g", "7g", "14g", "28g"].includes(parsed.historySize) ? parsed.historySize : DEFAULT_STATE.historySize,
    } satisfies FilterState;
  } catch {
    return DEFAULT_STATE;
  }
}

export function persistState(state: FilterState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function compareValues(a: string | number | null, b: string | number | null, direction = 1) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return 0;
    return a > b ? direction : -direction;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }) * direction;
}

function sortRows(rows: VisibleRow[], state: FilterState) {
  const direction = state.sortDir === "desc" ? -1 : 1;
  return rows.sort((a, b) => {
    switch (state.sortField) {
      case "distance":
        return compareValues(a.distance ?? Infinity, b.distance ?? Infinity, direction) || compareValues(a.dispensary, b.dispensary, 1);
      case "unitPrice":
        return compareValues(a.unitPrice, b.unitPrice, direction) || compareValues(a.price, b.price, 1) || compareValues(a.dispensary, b.dispensary, 1);
      case "price":
        return compareValues(a.price, b.price, direction) || compareValues(a.dispensary, b.dispensary, 1);
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
        return (
          compareValues(a.dropDate ? Date.parse(`${a.dropDate}T00:00:00`) : null, b.dropDate ? Date.parse(`${b.dropDate}T00:00:00`) : null, direction) ||
          compareValues(a.dispensary, b.dispensary, 1)
        );
      default:
        return compareValues(a.distance ?? Infinity, b.distance ?? Infinity, 1);
    }
  });
}

function sortDispensaries(dispensaries: VisibleDispensary[], state: FilterState) {
  const direction = state.sortDir === "desc" ? -1 : 1;
  return dispensaries.sort((a, b) => {
    const getValue = (dispensary: VisibleDispensary) => {
      switch (state.sortField) {
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
        case "size":
          return Math.max(...dispensary.products.map((product) => sizeToGrams(product.size) || 0));
        case "type":
          return [...new Set(dispensary.products.map((product) => product.type))].join(",");
        case "thc":
          return average(dispensary.products.map((product) => product.thcValue).filter((value): value is number => value != null));
        default:
          return dispensary.distance ?? Infinity;
      }
    };
    return compareValues(getValue(a), getValue(b), direction) || compareValues(a.name, b.name, 1);
  });
}

export function buildVisibleModel(payload: DashboardPayload | undefined, state: FilterState): VisibleModel {
  if (!payload?.data?.dispensaries) return { rows: [], dispensaries: [] };
  const query = state.searchQuery.trim().toLowerCase();
  const rows: VisibleRow[] = [];
  const dispensaries: VisibleDispensary[] = [];

  for (const dispensary of payload.data.dispensaries) {
    const visibleProducts: VisibleRow[] = [];
    for (const product of dispensary.products || []) {
      const productType = (product.type || "REC").toUpperCase();
      if (state.activeType !== "ALL" && productType !== state.activeType) continue;
      if (state.activeSize !== "ALL" && product.size !== state.activeSize) continue;
      if (state.pricedOnly && product.price == null) continue;
      if (query) {
        const haystack = `${product.strain || ""} ${dispensary.name || ""}`.toLowerCase();
        if (!haystack.includes(query)) continue;
      }
      const row: VisibleRow = {
        dispensary: dispensary.name,
        address: dispensary.address || null,
        distance: toNumber(dispensary.distance),
        dropDate: dispensary.dropDate || null,
        dropUrl: dispensary.dropUrl || null,
        menuUrl: dispensary.menuUrl || null,
        menuType: dispensary.menuType || null,
        lat: toNumber(dispensary.lat),
        lng: toNumber(dispensary.lng),
        strain: product.strain,
        size: product.size,
        price: toNumber(product.price),
        unitPrice: getUnitPrice(product),
        type: productType,
        thc: product.thc || null,
        thcValue: toNumber(product.thcValue) ?? toNumber(product.thc),
      };
      rows.push(row);
      visibleProducts.push(row);
    }
    if (!visibleProducts.length) continue;
    const priced = visibleProducts.filter((product) => product.price != null);
    const prices = priced.map((product) => product.price as number);
    const unitPrices = priced.map((product) => product.unitPrice).filter((value): value is number => value != null);
    dispensaries.push({
      ...dispensary,
      products: visibleProducts,
      productCount: visibleProducts.length,
      totalProductCount: dispensary.products.length,
      pricedCount: priced.length,
      uniqueStrainCount: new Set(visibleProducts.map((product) => product.strain)).size,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      avgPrice: prices.length ? average(prices) : null,
      minUnitPrice: unitPrices.length ? Math.min(...unitPrices) : null,
    });
  }

  return {
    rows: sortRows(rows, state),
    dispensaries: sortDispensaries(dispensaries, state),
  };
}

export function getFilteredHistoryRecords(payload: DashboardPayload | undefined, state: FilterState) {
  const records = payload?.history || [];
  const query = state.searchQuery.trim().toLowerCase();
  const effectiveType = state.historyType !== "ALL" ? state.historyType : state.activeType;
  const effectiveSize = state.historySize !== "ALL" ? state.historySize : state.activeSize;
  return records
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

export function getFreshestTimestamp(payload: DashboardPayload | undefined) {
  return payload?.status?.lastActivity || payload?.status?.lastScrape || payload?.status?.lastRefresh || payload?.data?.lastUpdated || null;
}

export function formatDateTime(value: string | null | undefined) {
  const date = parseDisplayDate(value);
  if (!date) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDate(value: string | null | undefined) {
  const date = parseDisplayDate(value);
  if (!date) return "—";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatRelativeTime(value: string | null | undefined) {
  const date = parseDisplayDate(value);
  if (!date) return "—";
  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(deltaMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function parseDisplayDate(value: string | null | undefined) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPrice(value: number | null | undefined, digits = 2) {
  if (value == null) return "No price";
  return `$${value.toFixed(digits)}`;
}

export function formatMoneyPlain(value: number | null | undefined, digits = 2) {
  if (value == null) return "—";
  return value.toFixed(digits);
}

export function formatUnitPrice(value: number | null | undefined) {
  if (value == null) return "No unit price";
  return `$${value.toFixed(value >= 10 ? 0 : 2)}/g`;
}

export function formatDistance(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value.toFixed(value >= 10 ? 0 : 1)}mi`;
}

export function formatThc(value: number | string | null | undefined) {
  if (value == null || value === "") return "—";
  return typeof value === "number" ? `${value.toFixed(1)}%` : String(value);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getVisibleCoverage(rows: VisibleRow[]) {
  if (!rows.length) return 0;
  return Math.round((rows.filter((row) => row.price != null).length / rows.length) * 100);
}

export function getSpotlightRow(model: VisibleModel) {
  const pricedRows = model.rows.filter((row) => row.price != null);
  if (!pricedRows.length) return null;
  return pricedRows
    .slice()
    .sort((a, b) => {
      const unitDelta = compareValues(a.unitPrice, b.unitPrice, 1);
      if (unitDelta !== 0) return unitDelta;
      const distanceDelta = compareValues(a.distance ?? Infinity, b.distance ?? Infinity, 1);
      if (distanceDelta !== 0) return distanceDelta;
      return compareValues(a.price, b.price, 1);
    })[0];
}

export function getTopStrains(model: VisibleModel) {
  const counts = new Map<string, Set<string>>();
  model.rows.forEach((row) => {
    if (!counts.has(row.strain)) counts.set(row.strain, new Set());
    counts.get(row.strain)?.add(row.dispensary);
  });
  return [...counts.entries()]
    .map(([strain, dispensaries]) => ({ strain, count: dispensaries.size }))
    .sort((a, b) => b.count - a.count || a.strain.localeCompare(b.strain))
    .slice(0, 8);
}

export function getPriceChartRows(model: VisibleModel) {
  const pricedRows = model.rows.filter((row) => row.price != null);
  const size = statePreferredSize(model.rows);
  const filtered = size ? pricedRows.filter((row) => row.size === size) : pricedRows;
  const byStore = new Map<string, { REC: number[]; MED: number[] }>();
  filtered.forEach((row) => {
    if (!byStore.has(row.dispensary)) byStore.set(row.dispensary, { REC: [], MED: [] });
    byStore.get(row.dispensary)?.[(row.type === "MED" ? "MED" : "REC") as "REC" | "MED"].push(row.price as number);
  });
  return [...byStore.entries()]
    .map(([dispensary, values]) => ({
      dispensary,
      REC: values.REC.length ? Math.round(average(values.REC) as number) : null,
      MED: values.MED.length ? Math.round(average(values.MED) as number) : null,
    }))
    .filter((entry) => entry.REC != null || entry.MED != null);
}

function statePreferredSize(rows: VisibleRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.size, (counts.get(row.size) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

export function getHistorySeries(records: HistoryRecord[], historyType: FilterState["historyType"]) {
  const buckets = new Map<string, { REC: number[]; MED: number[]; total: number }>();
  records.forEach((record) => {
    const price = toNumber(record.price);
    if (price == null) return;
    const key = record.recordedAt;
    if (!buckets.has(key)) buckets.set(key, { REC: [], MED: [], total: 0 });
    const bucket = buckets.get(key)!;
    bucket.total += 1;
    bucket[(record.type || "REC").toUpperCase() === "MED" ? "MED" : "REC"].push(price);
  });
  return [...buckets.entries()]
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([recordedAt, bucket]) => ({
      recordedAt,
      REC: bucket.REC.length ? average(bucket.REC) : null,
      MED: bucket.MED.length ? average(bucket.MED) : null,
      total: bucket.total,
      value:
        historyType === "ALL"
          ? average([...bucket.REC, ...bucket.MED].filter((value): value is number => value != null))
          : historyType === "MED"
            ? average(bucket.MED)
            : average(bucket.REC),
    }));
}

export function computeRecentMoves(records: HistoryRecord[]) {
  const grouped = new Map<string, HistoryRecord[]>();
  records.forEach((record) => {
    const key = [record.dispensary, record.strain, record.size, record.type].join("||");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(record);
  });
  const moves: Array<HistoryRecord & { previousPrice: number; delta: number }> = [];
  grouped.forEach((items) => {
    const sorted = items
      .filter((item) => item.price != null)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    if (sorted.length < 2) return;
    const latest = sorted[0];
    const previous = sorted.find((item) => item.price !== latest.price && item.recordedAt !== latest.recordedAt);
    if (!previous || latest.price == null || previous.price == null) return;
    moves.push({
      ...latest,
      previousPrice: previous.price,
      delta: latest.price - previous.price,
    });
  });
  return moves.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

export function buildCSV(rows: VisibleRow[]) {
  const headers = ["dispensary", "address", "distance", "strain", "size", "price", "unitPrice", "type", "thc", "dropDate", "menuUrl", "dropUrl"];
  const escapeField = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return /["\n,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((key) => escapeField(row[key as keyof VisibleRow])).join(","))].join("\n");
}

export function getActionSummary(status: DashboardStatus | null | undefined, scrapeStatus: DashboardPayload["scrapeStatus"]) {
  const freshest = status?.lastActivity || status?.lastScrape || status?.lastRefresh;
  const details = [];
  if (status?.jobRunning && status.activeJob) details.push(`Running ${status.activeJob}`);
  if (freshest) details.push(`Activity ${formatRelativeTime(freshest)}`);
  if (status?.schedulerEnabled) details.push("Scheduler on");
  if (status?.radiusMiles) details.push(`${status.radiusMiles}mi radius`);
  if (scrapeStatus?.priceCoverage != null) details.push(`${scrapeStatus.priceCoverage}% priced`);
  return details.join(" · ");
}

export function summarizeJobs(jobs: JobRun[]) {
  return jobs.slice(0, 10).map((job) => ({
    ...job,
    statusLabel: job.active ? "running" : (job.status || "unknown").toLowerCase(),
    meta: [job.startedAt ? formatDateTime(job.startedAt) : null, job.durationSeconds != null ? `${job.durationSeconds.toFixed(job.durationSeconds < 10 ? 1 : 0)}s` : null]
      .filter(Boolean)
      .join(" · "),
  }));
}

export function buildActiveFilterChips(state: FilterState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (state.activeType !== "ALL") chips.push({ id: "type", label: state.activeType, removePatch: { activeType: "ALL" } });
  if (state.activeSize !== "ALL") chips.push({ id: "size", label: state.activeSize, removePatch: { activeSize: "ALL" } });
  if (state.pricedOnly) chips.push({ id: "priced", label: "Priced only", removePatch: { pricedOnly: false } });
  if (state.searchQuery) chips.push({ id: "query", label: `Search: ${state.searchQuery}`, removePatch: { searchQuery: "" } });
  if (state.sortField !== DEFAULT_STATE.sortField || state.sortDir !== DEFAULT_STATE.sortDir) {
    chips.push({ id: "sort", label: `Sort: ${state.sortField === "unitPrice" ? "$/g" : state.sortField} ${state.sortDir}`, removePatch: { sortField: DEFAULT_STATE.sortField, sortDir: DEFAULT_STATE.sortDir } });
  }
  if (state.historyType !== DEFAULT_STATE.historyType) chips.push({ id: "history-type", label: `History ${state.historyType}`, removePatch: { historyType: "ALL" } });
  if (state.historySize !== DEFAULT_STATE.historySize) chips.push({ id: "history-size", label: `History ${state.historySize}`, removePatch: { historySize: "ALL" } });
  return chips;
}

export function getRecommendationCards(model: VisibleModel): RecommendationCardModel[] {
  const pricedRows = model.rows.filter((row) => row.price != null);
  const bestValue = pricedRows.slice().sort((a, b) => compareValues(a.unitPrice, b.unitPrice, 1) || compareValues(a.distance, b.distance, 1))[0] || null;
  const cheapest = pricedRows.slice().sort((a, b) => compareValues(a.price, b.price, 1) || compareValues(a.distance, b.distance, 1))[0] || null;
  const closest = pricedRows.slice().sort((a, b) => compareValues(a.distance, b.distance, 1) || compareValues(a.unitPrice, b.unitPrice, 1))[0] || null;
  const freshest = model.rows
    .slice()
    .sort((a, b) => compareValues(a.dropDate ? Date.parse(`${a.dropDate}T00:00:00`) : null, b.dropDate ? Date.parse(`${b.dropDate}T00:00:00`) : null, -1) || compareValues(a.distance, b.distance, 1))[0] || null;

  return [
    { kind: "bestValue", title: "Best Value", eyebrow: "Decision pick", reason: "Lowest unit price in the current view.", row: bestValue },
    { kind: "cheapestNow", title: "Cheapest Now", eyebrow: "Budget pick", reason: "Lowest visible total price right now.", row: cheapest },
    { kind: "closestPriced", title: "Closest Priced", eyebrow: "Convenience pick", reason: "Nearest listing with a confirmed price.", row: closest },
    { kind: "freshestDrop", title: "Freshest Drop", eyebrow: "New arrival", reason: "Newest visible drop update with matching products.", row: freshest },
  ];
}

export function getCompareCards(model: VisibleModel): CompareCardModel[] {
  const stores = model.dispensaries.slice();
  const lowestFloor = stores.filter((store) => store.minPrice != null).sort((a, b) => compareValues(a.minPrice ?? null, b.minPrice ?? null, 1) || compareValues(a.distance ?? null, b.distance ?? null, 1))[0] || null;
  const closest = stores.slice().sort((a, b) => compareValues(a.distance ?? null, b.distance ?? null, 1) || compareValues(a.minPrice ?? null, b.minPrice ?? null, 1))[0] || null;
  const widest = stores.slice().sort((a, b) => compareValues(b.uniqueStrainCount, a.uniqueStrainCount, 1) || compareValues(a.distance ?? null, b.distance ?? null, 1))[0] || null;
  return [
    { kind: "lowestFloor", title: "Lowest Floor", reason: "Best starting shelf price among visible stores.", dispensary: lowestFloor },
    { kind: "closestOption", title: "Closest Option", reason: "Nearest visible dispensary in the current view.", dispensary: closest },
    { kind: "widestSelection", title: "Widest Selection", reason: "Most unique strains visible right now.", dispensary: widest },
  ];
}

export function getFocusedDispensaryModel(model: VisibleModel, selectedDispensary: string | null): FocusedDispensaryModel | null {
  if (!selectedDispensary) return null;
  const dispensary = model.dispensaries.find((item) => item.name === selectedDispensary);
  if (!dispensary) return null;
  const topRows = dispensary.products.slice(0, 3);
  return {
    dispensary,
    topRows,
    coverage: getVisibleCoverage(dispensary.products),
    bestPriceLabel: dispensary.minPrice != null ? formatPrice(dispensary.minPrice) : "No price",
    bestUnitPriceLabel: dispensary.minUnitPrice != null ? formatUnitPrice(dispensary.minUnitPrice) : "No unit price",
  };
}

export function selectOverviewPreviewStores(model: VisibleModel, limit: number, previewRows = 3): OverviewPreviewStoreModel[] {
  return model.dispensaries
    .slice()
    .sort((a, b) => {
      const aHasPrice = a.minPrice != null ? 0 : 1;
      const bHasPrice = b.minPrice != null ? 0 : 1;
      return (
        compareValues(aHasPrice, bHasPrice, 1) ||
        compareValues(a.minPrice, b.minPrice, 1) ||
        compareValues(getVisibleCoverage(b.products), getVisibleCoverage(a.products), 1) ||
        compareValues(a.distance ?? null, b.distance ?? null, 1) ||
        compareValues(a.name, b.name, 1)
      );
    })
    .slice(0, limit)
    .map((dispensary) => ({
      dispensary,
      coverage: getVisibleCoverage(dispensary.products),
      topRows: dispensary.products.slice(0, previewRows),
      summary: `${pluralize(dispensary.uniqueStrainCount, "strain")} · ${pluralize(dispensary.productCount, "match", "matches")}`,
    }));
}

export function getMapSidebarItems(model: VisibleModel): MapSidebarItemModel[] {
  return model.dispensaries
    .slice()
    .sort((a, b) => compareValues(a.distance ?? null, b.distance ?? null, 1) || compareValues(a.minUnitPrice ?? null, b.minUnitPrice ?? null, 1))
    .map((dispensary) => {
      const coverage = getVisibleCoverage(dispensary.products);
      return {
        dispensary,
        coverage,
        summary: `${pluralize(dispensary.uniqueStrainCount, "strain")} · ${dispensary.pricedCount}/${dispensary.productCount} priced`,
        reason: dispensary.minUnitPrice != null ? `Best visible ${formatUnitPrice(dispensary.minUnitPrice)}` : "No confirmed price yet",
        badge: dispensary.minPrice != null ? formatPrice(dispensary.minPrice) : "No price",
      };
    });
}

export function getEmptyStateReason(model: VisibleModel, state: FilterState, historyRecords: HistoryRecord[]): EmptyStateReason | null {
  if (!model.rows.length) return state.pricedOnly ? "noPricedResults" : "noResults";
  if (state.activeTab === "insights" && !historyRecords.length) return "noHistory";
  if (state.activeTab === "map" && !model.dispensaries.some((store) => store.lat != null && store.lng != null)) return "noMapResults";
  if (state.activeTab === "insights" && !model.dispensaries.some((store) => store.pricedCount > 0)) return "noCoverage";
  return null;
}
