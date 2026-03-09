import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8000";

async function poll(check, message, { attempts = 40, intervalMs = 250 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(message);
}

async function waitForDashboard(page, { mobile = false, navigate = true } = {}) {
  if (navigate) {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  }
  await page.locator("#spotlightCard").waitFor();
  await poll(async () => {
    const resultCount = (await page.locator(mobile ? "#mobileResultCount" : "#resultCount").textContent())?.trim() || "";
    const spotlightMarkup = (await page.locator("#spotlightCard").innerHTML()).trim();
    return resultCount && resultCount !== "—" && spotlightMarkup.length > 0;
  }, "Dashboard never finished rendering");
}

function visiblePriceSelectors() {
  return [
    ".td-price",
    ".product-price",
    ".summary-pill",
    ".deal-price",
    ".compare-metric-value",
    ".hero-metric-value",
  ].join(", ");
}

async function collectCommonState(page) {
  return page.evaluate((selector) => {
    const priceNodes = [...document.querySelectorAll(selector)];
    return {
      activeTab: document.querySelector(".tab.active")?.dataset?.tab || null,
      lastUpdated: document.getElementById("lastUpdated")?.textContent?.trim() || "",
      dataFreshness: document.getElementById("dataFreshness")?.textContent?.trim() || "",
      priceCoverage: document.getElementById("priceCoverage")?.textContent?.trim() || "",
      adminNotice: document.getElementById("adminActionsNotice")?.textContent?.trim() || "",
      falseZeroPriceVisible: priceNodes.some((node) => /^\$0(?:\.00)?$/.test(node.textContent.trim())),
      noPriceLabelVisible: document.body.textContent.includes("No price"),
    };
  }, visiblePriceSelectors());
}

const browser = await chromium.launch({ headless: true });

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const desktopPage = await desktopContext.newPage();
  await waitForDashboard(desktopPage);

  assert.equal(await desktopPage.locator('link[rel="manifest"]').getAttribute("href"), "/manifest.webmanifest", "Expected manifest metadata to remain wired to the exported PWA asset");
  assert.equal(await desktopPage.locator('link[rel="apple-touch-icon"]').getAttribute("href"), "/apple-touch-icon.png", "Expected Apple install metadata to remain available");
  assert.equal(await desktopPage.locator(".install-sheet").count(), 0, "Install guidance should not auto-open over the dashboard shell");
  await desktopPage.locator("#installAppBtn").focus();
  assert.equal(
    await desktopPage.evaluate(() => document.activeElement?.id),
    "installAppBtn",
    "Install trigger should be focusable before opening the sheet",
  );
  await desktopPage.locator("#installAppBtn").press("Enter");
  await poll(
    async () => await desktopPage.locator(".install-sheet").isVisible(),
    "Install guidance sheet never opened from the shell action",
  );
  await poll(
    async () => {
      const active = await desktopPage.evaluate(() => document.activeElement?.textContent?.trim() || "");
      return active === "Close";
    },
    "Install guidance sheet never moved focus to its close control",
  );
  await desktopPage.keyboard.press("Escape");
  await poll(
    async () => (await desktopPage.locator(".install-sheet").count()) === 0,
    "Install guidance sheet never closed",
  );
  await poll(
    async () => (await desktopPage.evaluate(() => document.activeElement?.id)) === "installAppBtn",
    "Closing install guidance should restore focus to the install trigger",
  );

  const initialState = await collectCommonState(desktopPage);
  const initialTheme = await desktopPage.locator("html").getAttribute("data-theme");
  assert.equal(initialState.falseZeroPriceVisible, false, "Visible UI should never render null pricing as $0");
  assert.equal(initialState.noPriceLabelVisible, true, "Expected unavailable pricing copy to remain visible");
  if (initialState.adminNotice) {
    assert.equal(await desktopPage.locator("#refreshBtn").isDisabled(), true, "Production read-only mode should disable refresh actions");
    assert.match(initialState.adminNotice, /disabled|read-only/i, "Expected a clear production admin-actions notice");
  }

  await desktopPage.locator("#pricedOnlyBtn").click();
  await poll(
    async () => (await desktopPage.locator("#pricedOnlyBtn").getAttribute("aria-pressed")) === "true",
    "Priced-only mode did not become active",
  );

  await desktopPage.locator("#viewFullTableBtn").click();
  await poll(
    async () => await desktopPage.locator("#panel-table").isVisible(),
    "Overview CTA never switched to table view",
  );
  await desktopPage.getByRole("tab", { name: "Overview" }).click();
  await poll(
    async () => await desktopPage.locator("#panel-overview").isVisible(),
    "Overview tab never became visible again",
  );
  const focusedStoreName = await desktopPage.locator("#storePreviewSection [data-focus-store]").first().getAttribute("data-focus-store");
  await desktopPage.locator("#storePreviewSection [data-focus-store]").first().click();
  await poll(
    async () => await desktopPage.locator("#focusedStoreOverviewSummary").isVisible(),
    "Focused store summary never appeared in overview",
  );
  await desktopPage.locator("#openMapListBtn").click();
  await poll(
    async () => await desktopPage.locator("#panel-map").isVisible(),
    "Overview CTA never switched to map view",
  );
  assert.ok(focusedStoreName, "Expected a preview store name for focus carryover");
  await poll(
    async () => {
      const detail = await desktopPage.locator("#focusedStoreMapDetail").textContent();
      return Boolean(detail && detail.includes(focusedStoreName));
    },
    "Focused store did not carry into the map detail panel",
  );

  await desktopPage.locator("#sortSelect").selectOption("price-asc");

  const mapSummary = await desktopPage.locator("#mapSummary").innerText();
  assert.match(mapSummary, /dispensar/i, "Map summary should render dispensary copy");

  await desktopPage.locator("[data-theme-toggle]").click({ force: true });
  await poll(
    async () => (await desktopPage.locator("html").getAttribute("data-theme")) !== initialTheme,
    "Theme toggle never changed the active theme",
  );
  const toggledTheme = await desktopPage.locator("html").getAttribute("data-theme");
  if (toggledTheme !== "dark") {
    await poll(
      async () => new URL(desktopPage.url()).searchParams.get("theme") === toggledTheme,
      "Shared URL never reflected the non-default theme",
    );
  }

  const sharedUrl = desktopPage.url();
  assert.match(sharedUrl, /tab=map/, "Shared URL should preserve the active tab");
  assert.match(sharedUrl, /priced=1/, "Shared URL should preserve priced-only mode");
  assert.match(sharedUrl, /sort=price/, "Shared URL should preserve sorting");
  if (toggledTheme !== "dark") {
    assert.match(sharedUrl, new RegExp(`theme=${toggledTheme}`), "Shared URL should preserve the non-default theme");
  }

  const restoreContext = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const restorePage = await restoreContext.newPage();
  await restorePage.goto(sharedUrl, { waitUntil: "domcontentloaded" });
  await poll(
    async () => {
      return restorePage.evaluate(() => {
        const activeTab = document.querySelector(".tab.active")?.getAttribute("data-tab");
        const pricedOnly = document.getElementById("pricedOnlyBtn")?.getAttribute("aria-pressed");
        const theme = document.documentElement.getAttribute("data-theme");
        return activeTab === "map" && pricedOnly === "true" && Boolean(theme);
      });
    },
    "Reloaded shared view never restored the expected URL state",
  );

  const restoredState = await collectCommonState(restorePage);
  assert.equal(restoredState.activeTab, "map", "Reloaded shared view should restore the map tab");
  assert.equal(await restorePage.locator("#pricedOnlyBtn").getAttribute("aria-pressed"), "true", "Reloaded shared view should restore priced-only mode");
  assert.equal(await restorePage.locator("html").getAttribute("data-theme"), toggledTheme, "Reloaded shared view should restore the chosen theme");
  assert.equal(restoredState.falseZeroPriceVisible, false, "Reloaded shared view should not render $0 from null pricing");

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await waitForDashboard(mobilePage, { mobile: true });
  await mobilePage.locator('button[aria-controls="filterSheet"]').focus();
  await mobilePage.locator('button[aria-controls="filterSheet"]').press("Enter");
  await poll(
    async () => await mobilePage.locator("#filterSheet").isVisible(),
    "Mobile filter sheet never opened from keyboard activation",
  );
  await poll(
    async () => {
      const active = await mobilePage.evaluate(() => document.activeElement?.textContent?.trim() || "");
      return active === "Close";
    },
    "Mobile filter sheet never moved focus to its close button",
  );
  await mobilePage.keyboard.press("Escape");
  await poll(
    async () => (await mobilePage.locator("#filterSheet").count()) === 0,
    "Mobile filter sheet never closed from Escape",
  );
  await poll(
    async () => {
      const active = await mobilePage.evaluate(() => document.activeElement?.getAttribute("aria-controls"));
      return active === "filterSheet";
    },
    "Closing the mobile filter sheet should restore focus to its trigger",
  );
  await mobilePage.getByRole("tab", { name: "Map" }).click();
  await poll(
    async () => await mobilePage.locator("#panel-map").isVisible(),
    "Mobile map tab never became visible",
  );

  const mobileState = await mobilePage.evaluate(() => ({
    overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    filterBarWidth: document.getElementById("filterBar")?.clientWidth || 0,
    mapSummary: document.getElementById("mapSummary")?.textContent?.trim() || "",
  }));
  assert.ok(mobileState.overflowPx <= 1, `Expected no horizontal overflow on mobile, saw ${mobileState.overflowPx}px`);
  assert.ok(mobileState.filterBarWidth > 0, "Expected the mobile filter bar to remain visible");
  assert.match(mobileState.mapSummary, /mapped from the current view/i, "Expected the mobile map summary to remain readable");

  console.log(JSON.stringify({
    baseUrl: BASE_URL,
    initialState,
    initialTheme,
    toggledTheme,
    sharedUrl,
    restoredState,
    mobileState,
  }, null, 2));

  await desktopContext.close();
  await restoreContext.close();
  await mobileContext.close();
} finally {
  await browser.close();
}
