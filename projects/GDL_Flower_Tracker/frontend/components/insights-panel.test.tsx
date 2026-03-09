import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { DEFAULT_STATE } from "@/lib/dashboard";
import { InsightsPanel } from "@/components/insights-panel";
import type { DashboardPayload } from "@/lib/types";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="mock-responsive-container">{children}</div>,
  };
});

const payload: DashboardPayload = {
  data: {
    dispensaries: [],
  },
  status: {
    lastActivity: "2026-03-06T12:00:00Z",
  },
  scrapeStatus: {
    priceCoverage: 84,
    lastScrape: "2026-03-06T12:00:00Z",
  },
  history: [
    { dispensary: "Elevations", strain: "I-95", size: "3.5g", price: 40, type: "MED", recordedAt: "2026-03-01T00:00:00Z" },
    { dispensary: "Elevations", strain: "I-95", size: "3.5g", price: 44, type: "MED", recordedAt: "2026-03-02T00:00:00Z" },
  ],
  jobs: [],
};

describe("insights panel", () => {
  it("renders digest content immediately and defers the chart module", async () => {
    render(
      <InsightsPanel
        payload={payload}
        state={{ ...DEFAULT_STATE, activeTab: "insights" }}
        historyLoading={false}
        jobsLoading={false}
      />,
    );

    expect(screen.getByTestId("insights-chart-fallback")).toBeInTheDocument();
    expect(screen.getByText("Tracker Ops Digest")).toBeInTheDocument();
    expect(screen.getByText(/Elevations/)).toBeInTheDocument();
    expect(screen.getByText("Mar 6")).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("insights-trend-chart")).toBeInTheDocument();
      expect(screen.getByTestId("mock-responsive-container")).toBeInTheDocument();
    });
  });

  it("keeps placeholders visible while lazy insights data is still loading", () => {
    render(
      <InsightsPanel
        payload={{ ...payload, history: [], jobs: [] }}
        state={{ ...DEFAULT_STATE, activeTab: "insights" }}
        historyLoading={true}
        jobsLoading={true}
      />,
    );

    expect(screen.getByTestId("insights-chart-fallback")).toBeInTheDocument();
    expect(screen.getByText("Loading jobs…")).toBeInTheDocument();
  });
});
