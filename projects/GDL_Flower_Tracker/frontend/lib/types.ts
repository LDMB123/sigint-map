export type FilterTab = "overview" | "insights" | "table" | "map";
export type ProductType = "ALL" | "REC" | "MED";
export type ProductSize = "ALL" | "3.5g" | "7g" | "14g" | "28g";
export type SortField = "distance" | "unitPrice" | "price" | "strain" | "dispensary" | "size" | "type" | "thc" | "drop";
export type SortDir = "asc" | "desc";
export type ThemeMode = "dark" | "light";
export type QuickIntentId = "best-value" | "cheapest-now" | "closest-priced" | "fresh-drops" | "med-only" | "rec-only";
export type RecommendationKind = "bestValue" | "cheapestNow" | "closestPriced" | "freshestDrop";
export type CompareKind = "lowestFloor" | "closestOption" | "widestSelection";
export type EmptyStateReason = "noResults" | "noPricedResults" | "noHistory" | "noMapResults" | "noCoverage";

export interface FilterState {
  activeTab: FilterTab;
  activeType: ProductType;
  activeSize: ProductSize;
  pricedOnly: boolean;
  searchQuery: string;
  sortField: SortField;
  sortDir: SortDir;
  theme: ThemeMode;
  historyType: ProductType;
  historySize: ProductSize;
}

export interface ProductRecord {
  strain: string;
  size: string;
  price: number | null;
  type: string;
  thc?: string | null;
  thcValue?: number | null;
}

export interface DashboardData {
  lastUpdated?: string | null;
  centerZip?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
  radius?: number | null;
  dispensaries: DispensaryRecord[];
}

export interface DispensaryRecord {
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  distance?: number | null;
  dropDate?: string | null;
  dropUrl?: string | null;
  menuUrl?: string | null;
  menuType?: string | null;
  products: ProductRecord[];
}

export interface DashboardStatus {
  status?: string;
  env?: string | null;
  radiusMiles?: number | null;
  jobRunning?: boolean;
  activeJob?: string | null;
  jobStartedAt?: string | null;
  schedulerEnabled?: boolean;
  lastRefresh?: string | null;
  lastRefreshKind?: string | null;
  lastRefreshSource?: string | null;
  lastActivity?: string | null;
  lastActivityKind?: string | null;
  lastActivitySource?: string | null;
  lastScrape?: string | null;
  lastScrapeKind?: string | null;
  lastScrapeSource?: string | null;
  adminActionsEnabled?: boolean;
  adminActionsConfigured?: boolean;
  adminActionsMessage?: string | null;
  lastWarning?: { message?: string; recordedAt?: string } | null;
  lastError?: { message?: string; job?: string } | null;
}

export interface DashboardScrapeStatus {
  pricedProducts?: number | null;
  totalProducts?: number | null;
  priceCoverage?: number | null;
  lastScrape?: string | null;
  lastSource?: string | null;
}

export interface HistoryRecord {
  dispensary: string;
  strain: string;
  size: string;
  price: number | null;
  type: string;
  recordedAt: string;
}

export interface JobRun {
  job: string;
  status?: string;
  active?: boolean;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationSeconds?: number | null;
  result?: Record<string, unknown> | null;
}

export interface DashboardPayload {
  data: DashboardData;
  stats?: Record<string, unknown> | null;
  scrapeStatus?: DashboardScrapeStatus | null;
  status?: DashboardStatus | null;
  history?: HistoryRecord[] | null;
  jobs?: JobRun[] | null;
}

export interface VisibleRow {
  dispensary: string;
  address: string | null;
  distance: number | null;
  dropDate: string | null;
  dropUrl: string | null;
  menuUrl: string | null;
  menuType: string | null;
  lat: number | null;
  lng: number | null;
  strain: string;
  size: string;
  price: number | null;
  unitPrice: number | null;
  type: string;
  thc: string | null;
  thcValue: number | null;
}

export interface VisibleDispensary extends DispensaryRecord {
  products: VisibleRow[];
  productCount: number;
  totalProductCount: number;
  pricedCount: number;
  uniqueStrainCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  minUnitPrice: number | null;
}

export interface VisibleModel {
  rows: VisibleRow[];
  dispensaries: VisibleDispensary[];
}

export interface ExportRow extends VisibleRow {}

export interface ActiveFilterChip {
  id: string;
  label: string;
  removePatch: Partial<FilterState>;
}

export interface QuickIntent {
  id: QuickIntentId;
  label: string;
  description: string;
  patch: Partial<FilterState>;
}

export interface RecommendationCardModel {
  kind: RecommendationKind;
  title: string;
  eyebrow: string;
  reason: string;
  row: VisibleRow | null;
}

export interface CompareCardModel {
  kind: CompareKind;
  title: string;
  reason: string;
  dispensary: VisibleDispensary | null;
}

export interface FocusedDispensaryModel {
  dispensary: VisibleDispensary;
  topRows: VisibleRow[];
  coverage: number;
  bestPriceLabel: string;
  bestUnitPriceLabel: string;
}

export interface OverviewPreviewStoreModel {
  dispensary: VisibleDispensary;
  coverage: number;
  topRows: VisibleRow[];
  summary: string;
}

export interface MapSidebarItemModel {
  dispensary: VisibleDispensary;
  coverage: number;
  summary: string;
  reason: string;
  badge: string;
}

export interface InstallCapabilities {
  isStandalone: boolean;
  isIOS: boolean;
  isMacOS: boolean;
  isSafari: boolean;
  canInstallPrompt: boolean;
}

export interface SavedView {
  id: string;
  name: string;
  state: FilterState;
  createdAt: string;
  updatedAt: string;
}

export interface PendingViewOp {
  id: string;
  kind: "save" | "rename" | "delete";
  savedViewId: string;
  createdAt: string;
}

export interface OfflineSnapshot {
  id: string;
  payload: DashboardPayload;
  capturedAt: string;
}
