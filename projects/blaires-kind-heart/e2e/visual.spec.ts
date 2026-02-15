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
      .loading-screen::before,
      .loading-screen::after,
      .panel-body::before,
      .panel-body::after {
        animation: none !important;
        transition: none !important;
        display: none !important;
        content: none !important;
      }
      #loading-screen[data-e2e-force-visible="1"][hidden] {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      #loading-screen[data-e2e-force-visible="1"].loading-screen--exit {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
      }
      #loading-screen .loading-bar-fill {
        animation: none !important;
        transition: none !important;
      }
      #loading-screen[data-e2e-force-visible="1"] ~ .skip-link,
      #loading-screen[data-e2e-force-visible="1"] ~ .app-shell {
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
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
    loading.classList.remove("loading-screen--exit");

    const app = document.getElementById("app");
    if (app) {
      app.setAttribute("aria-hidden", "true");
      app.style.visibility = "hidden";
    }

    const progress = loading.querySelector("[data-loading-bar]");
    if (progress instanceof HTMLElement) {
      progress.style.width = "42%";
      progress.style.transition = "none";
    }

    return true;
  });

  expect(found).toBe(true);
}

async function waitForDomSettle(
  page: import("@playwright/test").Page,
  selector: string,
  quietMs = 300,
  timeoutMs = 10_000
): Promise<void> {
  await page.waitForFunction(
    async ({ sel, quiet }) => {
      const root = document.querySelector(sel);
      if (!root) {
        return false;
      }
      await new Promise<void>(resolve => {
        let timer = window.setTimeout(done, quiet);
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = window.setTimeout(done, quiet);
        });
        function done(): void {
          observer.disconnect();
          resolve();
        }
        observer.observe(root, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true
        });
      });
      return true;
    },
    { sel: selector, quiet: quietMs },
    { timeout: timeoutMs }
  );
}

test.describe("visual gate: desktop", () => {
  test("loading screen", async ({ page }) => {
    await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
    await stabilizeForSnapshots(page);
    await forceLoadingScreen(page);
    await waitForDomSettle(page, "#loading-screen", 300, 30_000);

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
      await waitForDomSettle(page, `#${panelId}`);

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
    await waitForDomSettle(page, "#loading-screen", 300, 30_000);

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
      await waitForDomSettle(page, `#${panelId}`);

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
