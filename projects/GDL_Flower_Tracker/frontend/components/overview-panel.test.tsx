import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { OverviewPanel } from "@/components/overview-panel";
import { buildVisibleModel, DEFAULT_STATE } from "@/lib/dashboard";
import type { DashboardPayload } from "@/lib/types";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="mock-responsive-container">{children}</div>,
  };
});

afterEach(() => {
  vi.useRealTimers();
});

const payload: DashboardPayload = {
  data: {
    dispensaries: Array.from({ length: 4 }).map((_, index) => ({
      name: `Store ${index + 1}`,
      address: `${index + 1} Main St`,
      distance: index + 1,
      lat: 38.8 + index * 0.01,
      lng: -104.7 - index * 0.01,
      dropDate: "2026-03-04",
      dropUrl: null,
      menuUrl: "https://example.com/menu",
      menuType: null,
      products: [
        { strain: "Jet Fuel", size: "3.5g", price: 40 + index, type: "REC", thcValue: 24 },
        { strain: "Blurberry", size: "7g", price: 70 + index, type: "REC", thcValue: 21 },
      ],
    })),
  },
  status: {
    lastActivity: "2026-03-06T12:00:00Z",
  },
};

describe("overview panel", () => {
  it("renders the preview grid, keeps analytics deferred, and preserves CTA wiring", async () => {
    vi.useFakeTimers();
    const onOpenMap = vi.fn();
    const onViewTable = vi.fn();
    const model = buildVisibleModel(payload, DEFAULT_STATE);

    render(
      <OverviewPanel
        payload={payload}
        model={model}
        selectedDispensary="Store 1"
        isMobile={false}
        onFocusStore={() => undefined}
        onOpenMap={onOpenMap}
        onViewTable={onViewTable}
        offline={false}
      />,
    );

    expect(screen.getByTestId("overview-analytics-skeleton")).toBeInTheDocument();
    expect(screen.getByText("Store Preview")).toBeInTheDocument();
    expect(screen.getAllByText(/Store [1-4]/)).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "View full table" }));
    fireEvent.click(screen.getByRole("button", { name: "Open destination list in map" }));
    expect(onViewTable).toHaveBeenCalledTimes(1);
    expect(onOpenMap).toHaveBeenCalledWith("Store 1");

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 240,
    });
    fireEvent.scroll(window);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getAllByTestId("mock-responsive-container")).toHaveLength(2);
    });
  });
});
