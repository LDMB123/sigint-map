import type { Page } from "@playwright/test";

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Clicks the "Let's go!" onboarding button until it disappears.
 * Polls for up to 40 × 250 ms; stops early after 6 consecutive quiet cycles.
 */
export async function dismissOnboardingIfPresent(page: Page): Promise<void> {
  let quietCycles = 0;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const sawOnboarding = await Promise.race([
      page.evaluate(() => {
        const start = Array.from(document.querySelectorAll("button")).find((el) =>
          /let's go/i.test((el.textContent ?? "").toLowerCase())
        );
        if (!start) return false;
        (start as HTMLButtonElement).click();
        return true;
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 1_000);
      }),
    ]);
    quietCycles = sawOnboarding ? 0 : quietCycles + 1;
    if (attempt >= 6 && quietCycles >= 6) break;
    await page.waitForTimeout(250);
  }
}

export async function waitForAppReady(
  page: Page,
  panelId = "panel-tracker",
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<void> {
  await page.waitForFunction(
    () => {
      const appRoot = document.querySelector("#app");
      const trackerToggle = document.querySelector('[data-panel-open="panel-tracker"]');
      const loading = document.querySelector("#loading-screen");
      const loadingHidden =
        !loading ||
        loading.hasAttribute("hidden") ||
        getComputedStyle(loading).display === "none";

      return Boolean(appRoot && trackerToggle && loadingHidden);
    },
    undefined,
    {
      timeout: timeoutMs
    }
  );

  await page.waitForFunction(
    id => {
      const panelRoot = document.querySelector(`#${id}`);
      if (!panelRoot) {
        return false;
      }

      const activePanel = document.querySelector("#app")?.getAttribute("data-active-panel");
      if (activePanel === id) {
        return true;
      }

      if (panelRoot instanceof HTMLElement && !panelRoot.hidden) {
        return true;
      }

      return Boolean(document.querySelector(`[data-panel-open="${id}"]`));
    },
    panelId,
    {
      timeout: timeoutMs
    }
  );

  await page.waitForLoadState("networkidle", {
    timeout: timeoutMs
  });
}

/** Read the heart counter value from the tracker panel. Returns -1 on timeout. */
export async function readHearts(page: Page): Promise<number> {
  try {
    const value = await Promise.race([
      page.evaluate(() => {
        const text = (document.querySelector("[data-tracker-hearts-count]")?.textContent ?? "").trim();
        const parsed = Number.parseInt(text, 10);
        return Number.isFinite(parsed) ? parsed : 0;
      }),
      new Promise<number>((resolve) => {
        setTimeout(() => resolve(-1), 4_000);
      }),
    ]);
    return value;
  } catch {
    return -1;
  }
}

/** Long-press home title → enter PIN 1234 → wait for mom dashboard. */
export async function openMomDashboard(page: Page): Promise<void> {
  await page.locator(".home-title").dispatchEvent("pointerdown");
  await page.waitForTimeout(3200);
  await page.locator(".home-title").dispatchEvent("pointerup");
  await page.waitForSelector("[data-mom-overlay]", { state: "visible", timeout: 15_000 });

  const pinDigits = ["1", "2", "3", "4"];
  for (const digit of pinDigits) {
    const button = page.locator(`[data-pin-digit="${digit}"]`).first();
    await button.click();
  }

  await page.waitForSelector("[data-mom-dashboard]", { state: "visible", timeout: 15_000 });
}
