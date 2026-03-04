/**
 * TG-6–19: High-priority E2E coverage gaps
 *
 * Tests that were missing from the original suite, covering games, companion,
 * DB batch atomicity, security-fix verifications, and mom mode.
 */
import { expect, test } from "@playwright/test";
import {
  dbWorkerInit,
  dbWorkerQueryRows,
  dbWorkerRequest,
  installDbWorkerHarness,
  terminateDbWorkerHarness,
} from "./fixtures/dbWorkerHarness";
import { launchGame, openGamesPanel } from "./fixtures/domainFlows";
import { applyFlowE2ESetup, dismissOnboardingIfPresent } from "./helpers";

applyFlowE2ESetup(test);

// ---------------------------------------------------------------------------
// TG-6: Paint game canvas renders
// ---------------------------------------------------------------------------
test("TG-6: paint game canvas renders after launch", async ({ page }) => {
  await openGamesPanel(page);
  await launchGame(page, "paint");
  // Paint shows a category picker first; click "free" to start painting.
  await expect
    .poll(
      () => page.evaluate(() => document.querySelectorAll("[data-paint-category]").length),
      { timeout: 20_000 }
    )
    .toBeGreaterThan(0);
  await page.locator('[data-paint-category="free"]').first().click({ force: true });
  // [data-paint-canvas] is created by game_paint.rs after category selection.
  await expect(page.locator("[data-paint-canvas]")).toBeVisible({ timeout: 20_000 });
});

// ---------------------------------------------------------------------------
// TG-7: Memory game cards render
// ---------------------------------------------------------------------------
test("TG-7: memory game cards render with data-card-idx attributes", async ({ page }) => {
  await openGamesPanel(page);
  await launchGame(page, "memory");
  // Memory shows a theme picker first; click "forest" to proceed.
  await expect
    .poll(
      () => page.evaluate(() => document.querySelectorAll("[data-memory-theme]").length),
      { timeout: 20_000 }
    )
    .toBeGreaterThan(0);
  await page.locator('[data-memory-theme="forest"]').first().click({ force: true });
  // Then difficulty selector appears; click "easy" to start the card grid.
  await expect
    .poll(
      () => page.evaluate(() => document.querySelectorAll("[data-memory-diff]").length),
      { timeout: 20_000 }
    )
    .toBeGreaterThan(0);
  await page.locator('[data-memory-diff="easy"]').first().click({ force: true });
  // Cards are rendered with [data-card-idx] by game_memory.rs after difficulty is chosen.
  await expect
    .poll(
      () => page.evaluate(() => document.querySelectorAll("[data-card-idx]").length),
      { timeout: 30_000 }
    )
    .toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// TG-8: Hug game arena renders
// ---------------------------------------------------------------------------
test("TG-8: hug game arena renders after launch", async ({ page }) => {
  await openGamesPanel(page);
  await launchGame(page, "hug");
  // After launching the hug game the arena should be visible.
  await expect(page.locator("#game-arena")).toBeVisible({ timeout: 20_000 });
});

// ---------------------------------------------------------------------------
// TG-9: Companion element visible on tracker panel
// ---------------------------------------------------------------------------
test("TG-9: companion element is visible on the tracker panel", async ({ page }) => {
  await page.goto("/?e2e=1&demo=1&panel=panel-tracker#panel-tracker", {
    waitUntil: "domcontentloaded",
  });
  await dismissOnboardingIfPresent(page);

  // [data-companion] is set on the companion image/container by companion.rs.
  await expect
    .poll(
      () => page.evaluate(() => document.querySelector("[data-companion]") !== null),
      { timeout: 30_000 }
    )
    .toBe(true);
});

// ---------------------------------------------------------------------------
// TG-10: Tracker panel exposes ≥4 unique action category buttons
// ---------------------------------------------------------------------------
test("TG-10: tracker panel shows at least 4 action category buttons", async ({ page }) => {
  await page.goto("/?e2e=1&demo=1&panel=panel-tracker#panel-tracker", {
    waitUntil: "domcontentloaded",
  });
  await dismissOnboardingIfPresent(page);

  await expect
    .poll(
      () => page.evaluate(() => document.querySelectorAll("[data-action]").length),
      { timeout: 30_000 }
    )
    .toBeGreaterThanOrEqual(4);
});

// ---------------------------------------------------------------------------
// TG-11: DB Batch handler executes atomically (CR-2 fix — db.exec not db.run)
// ---------------------------------------------------------------------------
test("TG-11: DB Batch handler commits multi-statement transaction atomically", async ({
  page,
}) => {
  await page.goto("/offline.html", { waitUntil: "domcontentloaded" });

  await installDbWorkerHarness(page, { startRequestId: 1 });

  let result: { ok: boolean; rowCount: number; hearts: number[] };
  try {
    await dbWorkerInit(page);

    const now = Date.now();
    const dayKey = new Date(now).toISOString().slice(0, 10);

    // Send a two-statement batch transaction.
    const batchId1 = `batch-tg11-a-${now}`;
    const batchId2 = `batch-tg11-b-${now}`;
    const batchResp = await dbWorkerRequest(page, {
      type: "Batch",
      statements: [
        [
          "INSERT OR IGNORE INTO kind_acts (id, category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
          [batchId1, "helping", "TG-11 batch A", "1", String(now), dayKey, "", "", "", "0"],
        ],
        [
          "INSERT OR IGNORE INTO kind_acts (id, category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
          [batchId2, "sharing", "TG-11 batch B", "2", String(now + 1), dayKey, "", "", "", "0"],
        ],
      ],
    });

    if (batchResp.type !== "Ok") {
      result = { ok: false, rowCount: 0, hearts: [] };
    } else {
      // Query back both rows to confirm the transaction committed.
      const rows = await dbWorkerQueryRows(
        page,
        "SELECT id, hearts_earned FROM kind_acts WHERE id IN (?1, ?2) ORDER BY id",
        [batchId1, batchId2],
      );
      result = {
        ok: rows.length === 2,
        rowCount: rows.length,
        hearts: rows.map((row) => Number(row.hearts_earned)),
      };
    }
  } finally {
    await terminateDbWorkerHarness(page);
  }

  expect(result.ok).toBe(true);
  expect(result.rowCount).toBe(2);
  expect(result.hearts).toEqual(expect.arrayContaining([1, 2]));
});

// ---------------------------------------------------------------------------
// TG-12: WASM bindings are exposed on localhost (SEC-6 fix)
// ---------------------------------------------------------------------------
test("TG-12: window.wasmBindings is exposed on localhost after app init", async ({ page }) => {
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });

  // wasm-init.js gates window.wasmBindings behind hostname === 'localhost'.
  // In E2E the server runs on localhost so the binding MUST be present.
  await expect
    .poll(
      () =>
        page.evaluate(
          () => typeof (window as any).wasmBindings === "object" && (window as any).wasmBindings !== null
        ),
      { timeout: 30_000 }
    )
    .toBe(true);
});

// ---------------------------------------------------------------------------
// TG-13: offline.html has no inline script content (SEC-4 CSP fix)
// ---------------------------------------------------------------------------
test("TG-13: offline.html contains no inline script blocks", async ({ page }) => {
  const response = await page.goto("/offline.html", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  const hasInlineScript = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll("script"));
    return scripts.some((s) => !s.src && (s.textContent ?? "").trim().length > 0);
  });

  expect(hasInlineScript).toBe(false);
});

// ---------------------------------------------------------------------------
// TG-14: Progress panel renders Mom's View section with PIN gate
// ---------------------------------------------------------------------------
test("TG-14: progress panel renders Mom's View section with PIN gate", async ({ page }) => {
  await page.goto("/?e2e=1&panel=panel-progress#panel-progress", {
    waitUntil: "domcontentloaded",
  });
  await dismissOnboardingIfPresent(page);

  // [data-moms-view] is always rendered by progress.rs as a <details> element.
  const momsView = page.locator("[data-moms-view]");
  await expect(momsView).toBeVisible({ timeout: 30_000 });
  await momsView.locator("summary").click();

  // [data-pin-form] is always rendered inside Mom's View — visible once details is open.
  await expect(page.locator("[data-pin-form]")).toBeVisible({ timeout: 15_000 });
});

// ---------------------------------------------------------------------------
// TG-15: Mom mode CSV export button is present after PIN unlock via home overlay
// ---------------------------------------------------------------------------
test("TG-15: mom mode CSV export button is present after PIN unlock", async ({ page }) => {
  // [data-mom-export-csv] lives in the mom overlay dialog opened via home long-press,
  // not in the progress panel's Mom's View section.
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-tracker", 45_000);
  await dismissOnboardingIfPresent(page);

  // Trigger the mom-mode PIN overlay via 3200 ms long-press on the home title.
  await page.locator(".home-title").dispatchEvent("pointerdown");
  await page.waitForTimeout(3_200);
  await page.locator(".home-title").dispatchEvent("pointerup");

  // [data-mom-overlay] dialog opens (setup mode on first run, verify mode thereafter).
  await page.waitForSelector("[data-mom-overlay]", { state: "visible", timeout: 15_000 });

  // Enter digits 1-4: sets the PIN on a fresh DB, or verifies it on subsequent runs.
  for (const digit of ["1", "2", "3", "4"]) {
    await page.locator(`[data-pin-digit="${digit}"]`).first().click();
  }

  // After correct PIN entry the dashboard is revealed.
  await page.waitForSelector("[data-mom-dashboard]", { state: "visible", timeout: 15_000 });

  // [data-mom-export-csv] is rendered by mom_mode.rs inside the dashboard.
  await expect(page.locator("[data-mom-export-csv]")).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// TG-16: Catcher / unicorn game arena renders
// ---------------------------------------------------------------------------
test("TG-16: catcher game arena renders after launch", async ({ page }) => {
  await launchGame(page, "catcher");
  await expect(page.locator("#game-arena")).toBeVisible({ timeout: 20_000 });
});

// ---------------------------------------------------------------------------
// TG-17: Stories panel shows at least one story cover
// ---------------------------------------------------------------------------
test("TG-17: stories panel shows at least one story cover", async ({ page }) => {
  await page.goto("/?e2e=1&demo=1&panel=panel-stories#panel-stories", {
    waitUntil: "domcontentloaded",
  });
  await dismissOnboardingIfPresent(page);

  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.querySelectorAll('#panel-stories:not([hidden]) [data-story]').length
        ),
      { timeout: 30_000 }
    )
    .toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// TG-18: All 5 game card types are present in panel-games
// ---------------------------------------------------------------------------
test("TG-18: all 5 game card types render in panel-games", async ({ page }) => {
  await page.goto("/?e2e=1&panel=panel-games#panel-games", { waitUntil: "domcontentloaded" });
  await dismissOnboardingIfPresent(page);

  const gameIds = ["memory", "paint", "catcher", "hug", "unicorn"];

  for (const gameId of gameIds) {
    await expect
      .poll(
        () =>
          page.evaluate(
            (id) => document.querySelectorAll(`[data-game="${id}"]`).length,
            gameId
          ),
        { timeout: 30_000, message: `Expected game card for "${gameId}" to be present` }
      )
      .toBeGreaterThan(0);
  }
});

// ---------------------------------------------------------------------------
// TG-19: DB Restore guard returns Error when called before Init (CR-4 fix)
// ---------------------------------------------------------------------------
test("TG-19: DB Restore returns Error when called before Init", async ({ page }) => {
  await page.goto("/offline.html", { waitUntil: "domcontentloaded" });

  await installDbWorkerHarness(page, { startRequestId: 1 });

  let result: { type: string; message: string };
  try {
    // Send Restore WITHOUT calling Init first — the CR-4 guard should reject it.
    const response = await dbWorkerRequest(
      page,
      {
        type: "Restore",
        snapshot_json: JSON.stringify({ export_format_version: 1, tables: { kind_acts: [] } }),
      },
      { timeoutMs: 10_000 },
    );
    result = { type: String(response.type), message: String(response.message || "") };
  } finally {
    await terminateDbWorkerHarness(page);
  }

  // CR-4 added: if (!db) { postMessage({ type: "Error", message: "Restore requires initialized database" }); return; }
  expect(result.type).toBe("Error");
  expect(result.message).toContain("Restore");
});
