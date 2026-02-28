import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

const PANELS = [
  "panel-tracker",
  "panel-quests",
  "panel-stories",
  "panel-rewards",
  "panel-games",
  "panel-gardens",
] as const;

test("debug smoke panels", async ({ page }) => {
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-tracker");
  const panelPresence = await page.evaluate((ids: readonly string[]) => {
    return Object.fromEntries(
      ids.map(id => [id, !!document.querySelector(`[data-panel-open="${id}"]`)])
    );
  }, [...PANELS]);

  const missing = Object.entries(panelPresence).filter(([, v]) => !v).map(([k]) => k);
  expect(missing, `Missing panels: ${missing.join(", ")}`).toEqual([]);
});
