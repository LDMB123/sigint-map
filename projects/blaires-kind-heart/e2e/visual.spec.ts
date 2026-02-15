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
  "panel-progress"
] as const;

async function stabilizeForSnapshots(page: import("@playwright/test").Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      [class*="particle"],
      [class*="sparkle"],
      [class*="glow"],
      [class*="shimmer"],
      [class*="confetti"] {
        opacity: 0 !important;
        filter: none !important;
      }
    `
  });
}

async function forceLoadingScreen(page: import("@playwright/test").Page): Promise<void> {
  const found = await page.evaluate(() => {
    const loading = document.getElementById("loading-screen");
    if (!loading) {
      return false;
    }

    loading.removeAttribute("hidden");
    loading.setAttribute("data-e2e-force-visible", "1");
    Object.assign(loading.style, {
      display: "flex",
      visibility: "visible",
      opacity: "1",
      pointerEvents: "none"
    });

    const app = document.getElementById("app");
    if (app) {
      app.setAttribute("aria-hidden", "true");
      app.style.visibility = "hidden";
    }

    return true;
  });

  expect(found).toBe(true);
}

test.describe("visual gate: desktop", () => {
  test("loading screen", async ({ page }) => {
    await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
    await stabilizeForSnapshots(page);
    await forceLoadingScreen(page);

    const loading = page.locator("#loading-screen");
    await expect(loading).toBeVisible();
    await expect(loading).toHaveScreenshot("desktop-loading-screen.png", {
      animations: "disabled",
      caret: "hide",
      scale: "css"
    });
  });

  for (const panelId of PANELS) {
    test(`panel ${panelId}`, async ({ page }) => {
      await page.goto(`/?e2e=1&panel=${panelId}#${panelId}`, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page, panelId);
      await stabilizeForSnapshots(page);

      const panel = page.locator(`#${panelId}`);
      await expect(panel).toBeVisible();
      await expect(panel).toHaveScreenshot(`desktop-${panelId}.png`, {
        animations: "disabled",
        caret: "hide",
        scale: "css"
      });
    });
  }
});

test.describe("visual gate: mobile", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  test("loading screen", async ({ page }) => {
    await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
    await stabilizeForSnapshots(page);
    await forceLoadingScreen(page);

    const loading = page.locator("#loading-screen");
    await expect(loading).toBeVisible();
    await expect(loading).toHaveScreenshot("mobile-loading-screen.png", {
      animations: "disabled",
      caret: "hide",
      scale: "css"
    });
  });

  for (const panelId of PANELS) {
    test(`panel ${panelId}`, async ({ page }) => {
      await page.goto(`/?e2e=1&panel=${panelId}#${panelId}`, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page, panelId);
      await stabilizeForSnapshots(page);

      const panel = page.locator(`#${panelId}`);
      await expect(panel).toBeVisible();
      await expect(panel).toHaveScreenshot(`mobile-${panelId}.png`, {
        animations: "disabled",
        caret: "hide",
        scale: "css"
      });
    });
  }
});
