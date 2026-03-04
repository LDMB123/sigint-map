import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { dismissOnboardingIfPresent, waitForAppReady } from "./helpers";

test.use({ video: "off", serviceWorkers: "block" });
test.setTimeout(120_000);

const PANEL_IDS = [
  "panel-tracker",
  "panel-quests",
  "panel-stories",
  "panel-rewards",
  "panel-games",
  "panel-progress",
  "panel-gardens",
  "panel-adventures",
  "panel-mystuff",
] as const;

type PanelMeta = {
  id: string;
  parent: string | null;
  panel_title: string;
  panel_aria: string;
  theme_token: string;
  breadcrumb: {
    icon: string;
    label: string;
    aria: string;
  };
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
      panel_title?: string;
      panel_aria?: string;
      theme_token?: string;
      breadcrumb?: { icon?: string; label?: string; aria?: string };
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
      panel_title: panel.panel_title ?? panel.id,
      panel_aria: panel.panel_aria ?? panel.id,
      theme_token: panel.theme_token ?? "",
      breadcrumb: {
        icon: panel.breadcrumb?.icon ?? "",
        label: panel.breadcrumb?.label ?? panel.id,
        aria: panel.breadcrumb?.aria ?? panel.id,
      },
    };
  }

  cachedPanelMetaMap = panelMap;
  return panelMap;
}

test("index shell contract keeps panel roots and entrypoint triggers", async ({ page }) => {
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-tracker", 45_000);
  await dismissOnboardingIfPresent(page);

  const report = await page.evaluate((panelIds) => {
    const failures: string[] = [];

    const loading = document.querySelector("#loading-screen");
    if (!loading) {
      failures.push("missing #loading-screen");
    }

    const app = document.querySelector("#app.home-scene");
    if (!app) {
      failures.push("missing #app.home-scene");
    }

    const shell = document.querySelector(".app-shell");
    if (!shell) {
      failures.push("missing .app-shell");
    }

    const breadcrumbHomeTemplate = document.querySelector("template#breadcrumb-home-template");
    const breadcrumbParentTemplate = document.querySelector("template#breadcrumb-parent-template");
    if (!breadcrumbHomeTemplate) {
      failures.push("missing #breadcrumb-home-template");
    }
    if (!breadcrumbParentTemplate) {
      failures.push("missing #breadcrumb-parent-template");
    }

    for (const panelId of panelIds) {
      const section = document.querySelector(`#${panelId}`);
      if (!section) {
        failures.push(`${panelId}: missing panel section`);
        continue;
      }

      if (!section.classList.contains("panel")) {
        failures.push(`${panelId}: missing .panel class`);
      }

      if (section.getAttribute("data-panel-id") !== panelId) {
        failures.push(`${panelId}: data-panel-id mismatch`);
      }

      if (!(section as HTMLElement).hasAttribute("hidden")) {
        failures.push(`${panelId}: expected hidden panel shell state`);
      }

      const breadcrumb = section.querySelector(`.breadcrumb[data-panel-id=\"${panelId}\"]`);
      if (!breadcrumb) {
        failures.push(`${panelId}: missing breadcrumb shell`);
      }

      const trigger = document.querySelector(`[data-panel-open=\"${panelId}\"]`);
      if (!trigger) {
        failures.push(`${panelId}: missing data-panel-open trigger`);
      }
    }

    const gameArena = document.querySelector("#game-arena");
    if (!gameArena) {
      failures.push("missing #game-arena");
    } else if (!(gameArena as HTMLElement).hasAttribute("hidden")) {
      failures.push("#game-arena should be hidden by default");
    }

    const gameExitButton = document.querySelector("#game-exit-btn");
    if (!gameExitButton) {
      failures.push("missing #game-exit-btn");
    } else if (!(gameExitButton as HTMLElement).hasAttribute("hidden")) {
      failures.push("#game-exit-btn should be hidden by default");
    }

    return failures;
  }, PANEL_IDS);

  expect(report).toEqual([]);
});

test("index shell contract hydrates breadcrumb controls for all panel shells", async ({ page }) => {
  const expectedPanels = await loadPanelMetaMap();

  await page.goto("/?e2e=1&panel=panel-games#panel-games", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-games", 45_000);
  await dismissOnboardingIfPresent(page);

  const report = await page.evaluate((expectedMap) => {
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
        failures.push(`${panelId}: data-panel-theme mismatch`);
      }

      const breadcrumb = section.querySelector(`.breadcrumb[data-panel-id=\"${panelId}\"]`);
      if (!breadcrumb) {
        failures.push(`${panelId}: missing breadcrumb`);
        continue;
      }

      if (!breadcrumb.querySelector("[data-nav-home]")) {
        failures.push(`${panelId}: missing [data-nav-home]`);
      }

      const current = breadcrumb.querySelector("[data-breadcrumb-current]");
      if (!current || !(current.textContent ?? "").trim()) {
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

    return failures;
  }, expectedPanels);

  expect(report).toEqual([]);
});

test("index shell contract deep-link hash restore opens expected panel routes", async ({ page }) => {
  for (const panelId of PANEL_IDS) {
    await page.goto(`/?e2e=1&panel=${panelId}#${panelId}`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, panelId, 45_000);
    await dismissOnboardingIfPresent(page);

    const state = await page.evaluate((expectedPanelId) => {
      const panel = document.querySelector(`#${expectedPanelId}`) as HTMLElement | null;
      const current = panel?.querySelector("[data-breadcrumb-current]")?.textContent?.trim() ?? "";
      return {
        hash: window.location.hash,
        panelVisible: Boolean(panel && !panel.hasAttribute("hidden")),
        current,
      };
    }, panelId);

    expect(state.hash).toBe(`#${panelId}`);
    expect(state.panelVisible).toBe(true);
    expect(state.current.length).toBeGreaterThan(0);
  }
});
