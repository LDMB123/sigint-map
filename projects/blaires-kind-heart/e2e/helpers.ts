import type { Page } from "@playwright/test";

const DEFAULT_TIMEOUT_MS = 20_000;

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
