import { expect, test } from "@playwright/test";
import { PANEL_IDS } from "./fixtures/panelIds";
import { getHomePanelPresence, waitForAppReady } from "./helpers";

test.use({ video: "off" });

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
    const panelPresence = await getHomePanelPresence(page, [...PANEL_IDS]);

    for (const panelId of PANEL_IDS) {
      expect(panelPresence[panelId]).toBe(true);
    }
  });

  for (const panelId of PANEL_IDS) {
    test(`hash deep-link opens ${panelId}`, async ({ page }) => {
      await page.goto(`/?e2e=1&panel=${panelId}#${panelId}`, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page, panelId);
      await expect(page).toHaveURL(new RegExp(`#${panelId}$`));
      await expect(page.locator(`#${panelId}`)).toBeVisible();
    });
  }
});
