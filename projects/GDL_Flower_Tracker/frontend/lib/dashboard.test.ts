import { describe, expect, it } from "vitest";

import {
  QUICK_INTENTS,
  buildActiveFilterChips,
  DEFAULT_STATE,
  buildCSV,
  buildUrlFromState,
  buildVisibleModel,
  computeRecentMoves,
  formatShortDate,
  getCompareCards,
  getFocusedDispensaryModel,
  getMapSidebarItems,
  selectOverviewPreviewStores,
  getRecommendationCards,
  normalizeSortState,
  parseStateFromSearchParams,
} from "@/lib/dashboard";
import type { DashboardPayload } from "@/lib/types";

const payload: DashboardPayload = {
  data: {
    centerLat: 38.9,
    centerLng: -104.7,
    radius: 30,
    dispensaries: [
      {
        name: "Elevations",
        address: "8270 Razorback",
        distance: 2.1,
        lat: 38.92,
        lng: -104.75,
        dropDate: "2026-03-01",
        menuUrl: "https://example.com/elevations",
        products: [
          { strain: "I-95", size: "3.5g", price: 44, type: "MED", thcValue: 22.2 },
          { strain: "Blu Froot", size: "3.5g", price: null, type: "MED", thcValue: 20.3 },
          { strain: "Screaming OG", size: "7g", price: 80, type: "MED", thcValue: 24.1 },
        ],
      },
      {
        name: "Buku Loud",
        address: "3079 S Academy",
        distance: 9.4,
        lat: 38.8,
        lng: -104.76,
        dropDate: "2026-02-21",
        menuUrl: "https://example.com/buku",
        products: [
          { strain: "Jetpack", size: "3.5g", price: 50, type: "REC" },
          { strain: "Monaco", size: "3.5g", price: null, type: "REC" },
        ],
      },
    ],
  },
  history: [
    { dispensary: "Elevations", strain: "I-95", size: "3.5g", price: 40, type: "MED", recordedAt: "2026-03-01T00:00:00Z" },
    { dispensary: "Elevations", strain: "I-95", size: "3.5g", price: 44, type: "MED", recordedAt: "2026-03-02T00:00:00Z" },
  ],
  jobs: [],
};

describe("dashboard helpers", () => {
  it("normalizes sort aliases", () => {
    expect(normalizeSortState("unit-price", null)).toEqual({ field: "unitPrice", dir: "asc" });
    expect(normalizeSortState("price-desc", null)).toEqual({ field: "price", dir: "desc" });
  });

  it("round-trips URL state", () => {
    const params = new URLSearchParams("tab=map&priced=1&sort=price&dir=desc&q=jet");
    const state = parseStateFromSearchParams(params);
    expect(buildUrlFromState({ ...DEFAULT_STATE, ...state })).toContain("tab=map");
    expect(buildUrlFromState({ ...DEFAULT_STATE, ...state })).toContain("priced=1");
  });

  it("builds visible rows without coercing null price to zero", () => {
    const model = buildVisibleModel(payload, DEFAULT_STATE);
    expect(model.rows).toHaveLength(5);
    expect(model.rows.find((row) => row.strain === "Blu Froot")?.price).toBeNull();
    expect(model.dispensaries.find((row) => row.name === "Elevations")?.pricedCount).toBe(2);
  });

  it("supports priced-only filtering", () => {
    const model = buildVisibleModel(payload, { ...DEFAULT_STATE, pricedOnly: true });
    expect(model.rows).toHaveLength(3);
    expect(model.rows.every((row) => row.price != null)).toBe(true);
  });

  it("computes recent moves", () => {
    const moves = computeRecentMoves(payload.history || []);
    expect(moves).toHaveLength(1);
    expect(moves[0]?.delta).toBe(4);
  });

  it("builds stable recommendation cards", () => {
    const cards = getRecommendationCards(buildVisibleModel(payload, DEFAULT_STATE));
    expect(cards.map((card) => card.kind)).toEqual(["bestValue", "cheapestNow", "closestPriced", "freshestDrop"]);
    expect(cards[0]?.row?.dispensary).toBe("Elevations");
  });

  it("builds stable compare cards", () => {
    const cards = getCompareCards(buildVisibleModel(payload, DEFAULT_STATE));
    expect(cards.map((card) => card.kind)).toEqual(["lowestFloor", "closestOption", "widestSelection"]);
    expect(cards[0]?.dispensary?.name).toBe("Elevations");
  });

  it("formats date-only and timestamp strings consistently", () => {
    expect(formatShortDate("2026-03-01")).toBe("Mar 1");
    expect(formatShortDate("2026-03-06T12:00:00Z")).toBe("Mar 6");
    expect(formatShortDate("not-a-date")).toBe("—");
  });

  it("builds active filter chips and quick intents remain deterministic", () => {
    const chips = buildActiveFilterChips({
      ...DEFAULT_STATE,
      activeType: "MED",
      pricedOnly: true,
      searchQuery: "i-95",
    });
    expect(chips.map((chip) => chip.id)).toEqual(["type", "priced", "query"]);
    expect(QUICK_INTENTS.find((intent) => intent.id === "closest-priced")?.patch).toEqual({ activeTab: "map", pricedOnly: true, sortField: "distance", sortDir: "asc" });
  });

  it("builds focused store and map sidebar models", () => {
    const model = buildVisibleModel(payload, DEFAULT_STATE);
    const focused = getFocusedDispensaryModel(model, "Elevations");
    const mapItems = getMapSidebarItems(model);
    const previewStores = selectOverviewPreviewStores(model, 2, 2);
    expect(focused?.dispensary.name).toBe("Elevations");
    expect(focused?.bestPriceLabel).toContain("$");
    expect(mapItems[0]?.dispensary.name).toBe("Elevations");
    expect(previewStores).toHaveLength(2);
    expect(previewStores[0]?.dispensary.name).toBe("Elevations");
    expect(previewStores[0]?.topRows).toHaveLength(2);
  });

  it("exports csv rows", () => {
    const csv = buildCSV(buildVisibleModel(payload, { ...DEFAULT_STATE, pricedOnly: true }).rows);
    expect(csv).toContain("dispensary,address,distance");
    expect(csv).toContain("Elevations");
  });
});
