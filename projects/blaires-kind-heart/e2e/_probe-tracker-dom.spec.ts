import { test, expect } from "@playwright/test";

test.use({ video: "off", serviceWorkers: "block" });
test.skip(!process.env.RUN_E2E_PROBES, "Probe-only test; opt in with RUN_E2E_PROBES=1.");

test("probe tracker dom", async ({ page }) => {
  await page.goto("/?e2e=1&flows=1&panel=panel-tracker#panel-tracker", { waitUntil: "domcontentloaded" });
  await page.locator('html[data-app-ready="true"]').waitFor({ timeout: 30_000 });

  const snapshot = await page.evaluate(() => {
    const countHug = document.querySelectorAll('[data-action="hug"]').length;
    const countAny = document.querySelectorAll('[data-action]').length;
    const trackerBody = document.querySelector('#tracker-body');
    const trackerChildren = trackerBody?.children.length ?? -1;
    const sample = Array.from(document.querySelectorAll('[data-action]')).slice(0, 12).map(el => el.getAttribute('data-action'));
    const activePanel = document.querySelector('#app')?.getAttribute('data-active-panel');
    return { countHug, countAny, trackerChildren, sample, activePanel };
  });

  console.log('probe snapshot', JSON.stringify(snapshot));
  expect(snapshot.countAny).toBeGreaterThan(0);
  expect(snapshot.countHug).toBeGreaterThan(0);
});
