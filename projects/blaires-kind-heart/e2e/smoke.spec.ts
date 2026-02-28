import { expect, test } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.use({ video: "off" });

const PANELS = [
  "panel-tracker",
  "panel-quests",
  "panel-stories",
  "panel-rewards",
  "panel-games",
  "panel-gardens",
] as const;

test.describe("home smoke", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    page.on("pageerror", err => {
      console.log(`[browser:pageerror] ${err.message}`);
    });
  });

  test("home scene renders with key controls", async ({ page }) => {
    await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, "panel-tracker");
    const panelPresence = await page.evaluate((ids: readonly string[]) => {
      return Object.fromEntries(
        ids.map(id => [id, !!document.querySelector(`[data-panel-open="${id}"]`)])
      );
    }, [...PANELS]);

    for (const panelId of PANELS) {
      expect(panelPresence[panelId]).toBe(true);
    }
  });

  for (const panelId of PANELS) {
    test(`hash deep-link opens ${panelId}`, async ({ page }) => {
      await page.goto(`/?e2e=1&panel=${panelId}#${panelId}`, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page, panelId);
      await expect(page).toHaveURL(new RegExp(`#${panelId}$`));
      await expect(page.locator(`#${panelId}`)).toBeVisible();
    });
  }
});
