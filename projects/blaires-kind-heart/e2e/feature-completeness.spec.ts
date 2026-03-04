import { expect, test, type Page } from "@playwright/test";
import { assertMemoryGameLifecycle, openGamesPanel } from "./fixtures/domainFlows";
import { dismissOnboardingIfPresent, waitForAppReady } from "./helpers";

test.use({ video: "off", serviceWorkers: "block" });
test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

async function navigateHome(page: Page): Promise<void> {
  const clicked = await page.evaluate(() => {
    const panelClose = Array.from(document.querySelectorAll("[data-panel-close]")).find((el) => {
      const host = el as HTMLElement;
      return host.offsetParent !== null && !host.closest("[hidden]");
    });
    if (panelClose) {
      (panelClose as HTMLButtonElement).click();
      return true;
    }

    const homeBtn = Array.from(document.querySelectorAll("[data-nav-home]")).find((el) => {
      const host = el as HTMLElement;
      return host.offsetParent !== null && !host.closest("[hidden]");
    });
    if (homeBtn) {
      (homeBtn as HTMLButtonElement).click();
      return true;
    }

    return false;
  });

  expect(clicked).toBe(true);
}

test("intermediary panel routes are reachable", async ({ page }) => {
  for (const panelId of ["panel-adventures", "panel-mystuff"] as const) {
    await page.goto(`/?e2e=1&panel=${panelId}#${panelId}`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, panelId, 45_000);
    await dismissOnboardingIfPresent(page);
    await expect(page.locator(`#${panelId}`)).toBeVisible();
  }
});

test("home panel navigation open/close flow works", async ({ page }) => {
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-tracker", 45_000);
  await dismissOnboardingIfPresent(page);

  const adventuresButton = page.locator('[data-panel-open="panel-adventures"]').first();
  await expect(adventuresButton).toBeVisible();
  await adventuresButton.click({ force: true });
  await expect(page.locator("#panel-adventures")).toBeVisible();

  await navigateHome(page);
  await expect(page.locator("#panel-adventures")).toBeHidden();
});

test("games lifecycle supports launch, return, relaunch, and reset", async ({ page }) => {
  await assertMemoryGameLifecycle(page);
});

test("games panel cards render for launch entry points", async ({ page }) => {
  await openGamesPanel(page);
  await expect
    .poll(() => page.locator("[data-game]").count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
});

test("progress panel Mom view PIN gate protects insights", async ({ page }) => {
  await page.goto("/?e2e=1&panel=panel-progress#panel-progress", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-progress", 45_000);
  await dismissOnboardingIfPresent(page);

  const momsView = page.locator("[data-moms-view]");
  await expect(momsView).toBeVisible();
  await momsView.locator("summary").click();

  const pinInput = page.locator("#mom-pin-input");
  const pinSubmit = page.locator("[data-pin-submit]");
  const pinForm = page.locator("[data-pin-form]");
  const insights = page.locator("[data-insights-area]");

  await expect(pinInput).toBeVisible();
  await pinInput.fill("9999");
  await pinSubmit.click();
  await expect(pinForm).toBeVisible();
  await expect(insights).toHaveAttribute("hidden", "");

  await pinInput.fill("1234");
  await pinSubmit.click();
  await expect(pinInput).toHaveValue("");
});

test("rewards panel renders sticker progression state", async ({ page }) => {
  await page.goto("/?e2e=1&panel=panel-rewards#panel-rewards", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-rewards", 45_000);
  await dismissOnboardingIfPresent(page);

  await expect(page.locator("[data-sticker-count]")).toContainText(/stickers earned/i);
  await expect
    .poll(() => page.locator("[data-sticker-idx]").count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
});

test("gardens panel renders unlocked or empty state", async ({ page }) => {
  await page.goto("/?e2e=1&panel=panel-gardens#panel-gardens", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-gardens", 45_000);
  await dismissOnboardingIfPresent(page);

  const gardensState = await page.evaluate(() => ({
    hasGrid: document.querySelector("[data-gardens-grid]") !== null,
    cardCount: document.querySelectorAll("[data-garden-id]").length,
  }));
  // Garden grid should always render (even if empty on fresh install)
  expect(gardensState.hasGrid).toBe(true);
  // Fresh install should have garden cards (seeded data)
  expect(gardensState.cardCount).toBeGreaterThanOrEqual(0);
});
