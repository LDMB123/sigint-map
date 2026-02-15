import { expect, test } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.use({ video: "off" });

const PANELS = ["panel-tracker", "panel-quests", "panel-stories"] as const;

test.describe("webkit smoke", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(45_000);

  test("home scene renders with key controls", async ({ page }) => {
    await page.goto("/?e2e=1&lite=1", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, "panel-tracker");
    const presence = await page.evaluate((ids: readonly string[]) => {
      return Object.fromEntries(
        ids.map(id => [id, !!document.querySelector(`[data-panel-open="${id}"]`)])
      );
    }, [...PANELS]);
    for (const panelId of PANELS) {
      expect(presence[panelId]).toBe(true);
    }
  });
});
