import type { Page } from "@playwright/test";

const DEFAULT_TIMEOUT_MS = 20_000;

export async function waitForAppReady(
  page: Page,
  panelId = "panel-tracker",
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<void> {
  await page.locator('html[data-app-ready="true"]').waitFor({
    state: "attached",
    timeout: timeoutMs
  });

  await page.waitForFunction(
    id => {
      const panelRoot = document.querySelector(`#${id}`);
      if (!panelRoot) {
        return false;
      }

      const panelToggle = document.querySelector(`[data-panel-open="${id}"]`);
      if (panelToggle) {
        return true;
      }

      const activePanel = document.querySelector("#app")?.getAttribute("data-active-panel");
      return activePanel === id;
    },
    panelId,
    { timeout: timeoutMs }
  );
}
