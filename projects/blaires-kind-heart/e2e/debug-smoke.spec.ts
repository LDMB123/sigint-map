import { test, expect } from "@playwright/test";
import { PANEL_IDS } from "./fixtures/panelIds";
import { getHomePanelPresence, waitForAppReady } from "./helpers";

test("debug smoke panels", async ({ page }) => {
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-tracker");
  const panelPresence = await getHomePanelPresence(page, [...PANEL_IDS]);

  const missing = Object.entries(panelPresence).filter(([, v]) => !v).map(([k]) => k);
  expect(missing, `Missing panels: ${missing.join(", ")}`).toEqual([]);
});
