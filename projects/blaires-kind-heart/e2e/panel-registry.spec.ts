import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { dismissOnboardingIfPresent, waitForAppReady } from "./helpers";

test.use({ video: "off", serviceWorkers: "block" });
test.setTimeout(120_000);

type PanelMeta = {
  id: string;
  parent: string | null;
  breadcrumb: {
    icon: string;
    label: string;
    aria: string;
  };
  panel_title: string;
  panel_aria: string;
  theme_token: string;
};

let cachedPanelMetaMap: Record<string, PanelMeta> | null = null;

async function loadPanelMetaMap() {
  if (cachedPanelMetaMap) {
    return cachedPanelMetaMap;
  }

  const configPath = path.join(process.cwd(), "config", "panels.json");
  const source = await readFile(configPath, "utf8");
  const parsed = JSON.parse(source) as {
    panels?: Array<{
      id?: string;
      parent?: string | null;
      breadcrumb?: { icon?: string; label?: string; aria?: string };
      panel_title?: string;
      panel_aria?: string;
      theme_token?: string;
    }>;
  };

  const panelMap: Record<string, PanelMeta> = {};
  for (const panel of parsed.panels ?? []) {
    if (!panel?.id) {
      continue;
    }
    panelMap[panel.id] = {
      id: panel.id,
      parent: panel.parent ?? null,
      breadcrumb: {
        icon: panel.breadcrumb?.icon ?? "",
        label: panel.breadcrumb?.label ?? panel.id,
        aria: panel.breadcrumb?.aria ?? panel.id,
      },
      panel_title: panel.panel_title ?? panel.id,
      panel_aria: panel.panel_aria ?? panel.id,
      theme_token: panel.theme_token ?? "",
    };
  }

  cachedPanelMetaMap = panelMap;
  return panelMap;
}

test("panel metadata hydrates breadcrumb controls and panel theme", async ({ page }) => {
  const expectedPanels = await loadPanelMetaMap();

  await page.goto("/?e2e=1&panel=panel-games#panel-games", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-games", 45_000);
  await dismissOnboardingIfPresent(page);

  const result = await page.evaluate((expectedMap) => {
    const failures: string[] = [];

    const sections = Array.from(document.querySelectorAll(".panel[data-panel-id]"));
    for (const section of sections) {
      const panelId = section.getAttribute("data-panel-id");
      if (!panelId) {
        failures.push("panel missing data-panel-id");
        continue;
      }

      const panelMeta = (expectedMap as Record<string, any>)[panelId];
      if (!panelMeta || typeof panelMeta !== "object") {
        failures.push(`${panelId}: missing panel metadata`);
        continue;
      }

      if (panelMeta.theme_token && section.getAttribute("data-panel-theme") !== panelMeta.theme_token) {
        failures.push(`${panelId}: theme mismatch`);
      }

      const panelAria = section.getAttribute("aria-label") ?? "";
      if (panelMeta.panel_aria && panelAria !== panelMeta.panel_aria) {
        failures.push(`${panelId}: aria mismatch`);
      }

      const panelTitle = section.querySelector(".panel-title")?.textContent?.trim() ?? "";
      if (panelMeta.panel_title && panelTitle !== panelMeta.panel_title) {
        failures.push(`${panelId}: title mismatch`);
      }

      const breadcrumb = section.querySelector(".breadcrumb");
      if (!breadcrumb) {
        failures.push(`${panelId}: missing breadcrumb`);
        continue;
      }

      const home = breadcrumb.querySelector("[data-nav-home]");
      if (!home) {
        failures.push(`${panelId}: missing home breadcrumb control`);
      }

      const current = breadcrumb.querySelector("[data-breadcrumb-current]")?.textContent?.trim() ?? "";
      if (!current) {
        failures.push(`${panelId}: missing breadcrumb current label`);
      }

      const parent = breadcrumb.querySelector("[data-nav-panel]");
      if (panelMeta.parent) {
        if (!parent) {
          failures.push(`${panelId}: missing parent breadcrumb control`);
        } else if (parent.getAttribute("data-nav-panel") !== panelMeta.parent) {
          failures.push(`${panelId}: parent breadcrumb target mismatch`);
        }
      } else if (parent) {
        failures.push(`${panelId}: unexpected parent breadcrumb control`);
      }
    }

    return { failures };
  }, expectedPanels);

  expect(result.failures).toEqual([]);
});

test("breadcrumb labels remain non-empty when panel registry module fails", async ({ page }) => {
  await page.route("**/panel-registry.js", async (route) => {
    await route.abort();
  });

  await page.goto("/?e2e=1&panel=panel-games#panel-games", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-games", 45_000);
  await dismissOnboardingIfPresent(page);

  const result = await page.evaluate(() => {
    const failures: string[] = [];
    const sections = Array.from(document.querySelectorAll(".panel[data-panel-id]"));
    for (const section of sections) {
      const panelId = section.getAttribute("data-panel-id");
      if (!panelId) {
        failures.push("panel missing data-panel-id");
        continue;
      }

      const breadcrumb = section.querySelector(".breadcrumb");
      if (!breadcrumb) {
        failures.push(`${panelId}: missing breadcrumb`);
        continue;
      }

      if (!breadcrumb.querySelector("[data-nav-home]")) {
        failures.push(`${panelId}: missing home breadcrumb control`);
      }

      const current = breadcrumb.querySelector("[data-breadcrumb-current]")?.textContent?.trim() ?? "";
      if (!current) {
        failures.push(`${panelId}: empty fallback breadcrumb label`);
      }

      if (breadcrumb.querySelector("[data-nav-panel]")) {
        failures.push(`${panelId}: unexpected parent breadcrumb in fallback mode`);
      }
    }

    return { failures };
  });

  expect(result.failures).toEqual([]);
});

test("home tracker badge updates after logging a kind act", async ({ page }) => {
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-tracker", 45_000);
  await dismissOnboardingIfPresent(page);

  const badge = page.locator("[data-home-tracker-hearts]");
  await expect(badge).toHaveCount(1);
  await expect(badge).toHaveAttribute("aria-label", "Hearts today");

  const initialText = (await badge.textContent()) ?? "0";
  const initialValue = Number.parseInt(initialText.trim(), 10) || 0;

  await page.locator('[data-panel-open="panel-tracker"][data-home-btn]').click();
  await expect.poll(async () => {
    return page.locator("#panel-tracker").evaluate((el) => !el.hasAttribute("hidden"));
  }).toBe(true);

  const firstAction = page.locator("#tracker-body [data-action]").first();
  await expect(firstAction).toBeVisible();
  await firstAction.click();

  await expect
    .poll(async () => {
      const badgeText = (await badge.textContent()) ?? "0";
      return Number.parseInt(badgeText.trim(), 10) || 0;
    })
    .toBeGreaterThan(initialValue);
});
