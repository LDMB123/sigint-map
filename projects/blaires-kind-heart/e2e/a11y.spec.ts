import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.use({ video: "off" });
test.describe.configure({ mode: "serial" });

const PANELS = [
  "panel-tracker",
  "panel-quests",
  "panel-stories",
  "panel-rewards",
  "panel-games",
  "panel-gardens",
  "panel-progress"
] as const;

function formatCriticalViolations(
  violations: {
    id: string;
    impact: string | null;
    help: string;
    nodes: Array<{ target: string[] }>;
  }[]
): string {
  if (violations.length === 0) {
    return "No critical accessibility violations.";
  }

  return violations
    .map(violation => {
      const targets = violation.nodes
        .slice(0, 5)
        .map(node => node.target.join(" "))
        .join(" | ");
      return `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help} -> ${targets}`;
    })
    .join("\n");
}

async function expectNoCriticalA11yViolations(
  page: import("@playwright/test").Page,
  label: string
): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();

  const critical = results.violations.filter(violation => violation.impact === "critical");

  expect(
    critical,
    `[a11y][${label}] Critical violations found:\n${formatCriticalViolations(critical)}`
  ).toEqual([]);
}

test.describe("a11y gate: axe critical checks", () => {
  test("home", async ({ page }) => {
    await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, "panel-tracker", 45_000);
    await expectNoCriticalA11yViolations(page, "home");
  });

  for (const panelId of PANELS) {
    test(`panel ${panelId}`, async ({ page }) => {
      await page.goto(`/?e2e=1&panel=${panelId}#${panelId}`, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page, panelId, 45_000);
      await expect(page.locator(`#${panelId}`)).toBeVisible();
      await expectNoCriticalA11yViolations(page, panelId);
    });
  }
});
