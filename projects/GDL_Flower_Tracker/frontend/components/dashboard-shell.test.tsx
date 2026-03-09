import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardHeader, QuickIntentRow, RecommendationGrid } from "@/components/dashboard-shell";
import { QUICK_INTENTS } from "@/lib/dashboard";

describe("dashboard shell", () => {
  it("renders a secondary install action instead of an inline prompt", () => {
    render(
      <DashboardHeader
        theme="dark"
        onThemeToggle={() => undefined}
        onShare={() => undefined}
        onToggleOps={() => undefined}
        onInstall={() => undefined}
        opsOpen={false}
        installOpen={false}
        latestActivity="2026-03-06T12:00:00Z"
        priceCoverage={83}
        savedViewCount={2}
        installCapabilities={{
          isStandalone: false,
          isIOS: false,
          isMacOS: true,
          isSafari: false,
          canInstallPrompt: true,
        }}
        onToggleSavedViews={() => undefined}
        savedViewsOpen={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Install app" })).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByRole("button", { name: "Install app" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps quick intents compact but accessible", () => {
    const onApply = vi.fn();
    render(<QuickIntentRow intents={QUICK_INTENTS} onApply={onApply} />);

    const bestValue = screen.getByRole("button", { name: /Best Value\. Show the strongest unit-price offers first\./i });
    fireEvent.click(bestValue);

    expect(onApply).toHaveBeenCalledWith(QUICK_INTENTS[0]);
    expect(screen.getByText("Best Value")).toBeInTheDocument();
  });

  it("formats freshest-drop recommendations as dates instead of raw price styling", () => {
    render(
      <RecommendationGrid
        recommendations={[
          {
            kind: "freshestDrop",
            title: "Freshest Drop",
            eyebrow: "Just updated",
            reason: "Newest visible menu update",
            row: {
              dispensary: "Elevations",
              address: "8270 Razorback",
              distance: 2.1,
              dropDate: "2026-03-01",
              dropUrl: null,
              menuUrl: "https://example.com/elevations",
              menuType: "iheartjane",
              lat: 38.92,
              lng: -104.75,
              strain: "I-95",
              size: "3.5g",
              price: 44,
              unitPrice: 12.57,
              type: "MED",
              thc: "22.2%",
              thcValue: 22.2,
            },
          },
        ]}
        onFocus={() => undefined}
        offline={false}
      />,
    );

    const dateValue = screen.getByText("Mar 1");
    expect(dateValue).toHaveClass("recommendation-price--meta");
    expect(screen.queryByText("2026-03-01")).not.toBeInTheDocument();
  });
});
