import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.use({ video: "off" });

test.describe("db contract", () => {
  test("db worker enforces protocol, migrations, and integrity", async ({ page }) => {
    await page.goto("/offline.html", { waitUntil: "domcontentloaded" });

    const summary = await page.evaluate(async () => {
      const worker = new Worker("/db-worker.js", { type: "module" });
      let requestId = 1;

      const request = (requestPayload: unknown, apiVersion = 1) =>
        new Promise<any>((resolve, reject) => {
          const currentId = requestId++;

          const cleanup = () => {
            worker.removeEventListener("message", onMessage);
            worker.removeEventListener("error", onError);
            clearTimeout(timer);
          };

          const onMessage = (event: MessageEvent<any>) => {
            const payload = event.data || {};
            if (payload.request_id !== currentId) return;
            cleanup();
            resolve(payload);
          };

          const onError = (event: ErrorEvent) => {
            cleanup();
            reject(new Error(event.message || "Worker error"));
          };

          const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for db worker response ${currentId}`));
          }, 20_000);

          worker.addEventListener("message", onMessage);
          worker.addEventListener("error", onError);
          worker.postMessage({
            api_version: apiVersion,
            request: requestPayload,
            request_id: currentId,
          });
        });

      const queryRows = async (sql: string, params: string[] = []) => {
        const response = await request({ type: "Query", sql, params });
        if (response.type !== "Rows") {
          throw new Error(`Expected Rows response for "${sql}" but got ${response.type}`);
        }
        return Array.isArray(response.data) ? response.data : [];
      };

      try {
        const workerSource = await fetch("/db-worker.js").then((res) => res.text());
        const workerSchemaMatch = workerSource.match(/const DB_SCHEMA_VERSION\s*=\s*(\d+)/);
        const expectedSchemaVersion = workerSchemaMatch
          ? Number.parseInt(workerSchemaMatch[1], 10)
          : 0;

        const initResponse = await request({ type: "Init" });
        const legacyResponse = await request({ type: "Init" }, 0);

        const tableRows = await queryRows(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
        );
        const tableNames = tableRows.map((row) => String(row.name));

        const integrityRows = await queryRows("PRAGMA integrity_check");
        const integrity =
          String(integrityRows[0]?.integrity_check ?? integrityRows[0]?.["integrity_check "] ?? "")
            .toLowerCase();

        const foreignKeyRows = await queryRows("PRAGMA foreign_key_check");

        const kindActsColumns = (await queryRows("PRAGMA table_info(kind_acts)")).map((row) =>
          String(row.name),
        );
        const weeklyInsightsColumns = (
          await queryRows("PRAGMA table_info(weekly_insights)")
        ).map((row) => String(row.name));

        const promptsRows = await queryRows("SELECT COUNT(*) as cnt FROM reflection_prompts");
        const reflectionPromptCount = Number(promptsRows[0]?.cnt ?? 0);
        const schemaVersionRows = await queryRows(
          "SELECT value FROM meta WHERE key = 'schema_version' LIMIT 1",
        );
        const persistedSchemaVersion = Number.parseInt(
          String(schemaVersionRows[0]?.value ?? "0"),
          10,
        );

        return {
          expectedSchemaVersion,
          persistedSchemaVersion,
          initType: initResponse.type,
          legacyType: legacyResponse.type,
          legacyMessage: String(legacyResponse.message || ""),
          tableNames,
          integrity,
          foreignKeyCheckCount: foreignKeyRows.length,
          kindActsColumns,
          weeklyInsightsColumns,
          reflectionPromptCount,
        };
      } finally {
        worker.terminate();
      }
    });

    const requiredTables = [
      "kind_acts",
      "quests",
      "streaks",
      "stories_progress",
      "stickers",
      "settings",
      "ai_cache",
      "meta",
      "game_scores",
      "weekly_goals",
      "mom_notes",
      "skill_mastery",
      "weekly_insights",
      "reflection_prompts",
      "badges",
      "companion_skins",
      "gardens",
    ];

    expect(summary.expectedSchemaVersion).toBeGreaterThan(0);
    expect(summary.persistedSchemaVersion).toBe(summary.expectedSchemaVersion);
    expect(summary.initType).toBe("Ok");
    expect(summary.tableNames).toEqual(expect.arrayContaining(requiredTables));
    expect(summary.integrity).toBe("ok");
    expect(summary.foreignKeyCheckCount).toBe(0);
    expect(summary.kindActsColumns).toEqual(
      expect.arrayContaining(["reflection_type", "bonus_context", "emotion_selected", "combo_day"]),
    );
    expect(summary.weeklyInsightsColumns).toEqual(expect.arrayContaining(["skill_breakdown"]));
    expect(summary.reflectionPromptCount).toBeGreaterThan(0);
    expect(summary.legacyType).toBe("Error");
    expect(summary.legacyMessage).toContain("Unsupported DB protocol version");
  });

  test("mom dashboard exports JSON and CSV backups", async ({ page }) => {
    await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, "panel-tracker");

    const openMomDashboard = async () => {
      const title = page.locator(".home-title");
      await expect(title).toBeVisible();
      await title.dispatchEvent("pointerdown", {
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
      });
      await page.waitForTimeout(3200);
      await title.dispatchEvent("pointerup", {
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
      });

      await expect(page.locator("[data-mom-overlay]")).toBeVisible();
      const pinOverlay = page.locator("[data-mom-overlay]");
      for (const digit of ["1", "2", "3", "4"]) {
        const digitButton = pinOverlay.locator(`[data-pin-digit="${digit}"]`);
        await expect(digitButton).toBeVisible();
        let clicked = false;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            // Force click to bypass transient "element is not stable" failures
            // while the keypad animation settles.
            await digitButton.click({ force: true, timeout: 2500 });
            clicked = true;
            break;
          } catch {
            await page.waitForTimeout(80);
          }
        }
        if (!clicked) {
          throw new Error(`Failed to click PIN digit ${digit}`);
        }
      }

      await expect(page.locator("[data-mom-dashboard]")).toBeVisible();
    };

    await openMomDashboard();
    await expect(page.locator("[data-mom-export-json]")).toBeVisible();
    await expect(page.locator("[data-mom-export-csv]")).toBeVisible();
    await expect(page.locator("[data-mom-restore-json]")).toBeVisible();
    await expect(page.locator("[data-mom-restore-input]")).toBeAttached();

    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("[data-mom-export-json]").click(),
    ]);
    expect(jsonDownload.suggestedFilename()).toMatch(
      /^blaires-kind-heart-export-\d{4}-\d{2}-\d{2}\.json$/,
    );
    const jsonPath = await jsonDownload.path();
    if (!jsonPath) {
      throw new Error("JSON export download path was not available");
    }
    const jsonRaw = await readFile(jsonPath, "utf8");
    const jsonPayload = JSON.parse(jsonRaw) as {
      export_format_version?: number;
      schema_version?: string | number;
      tables?: Record<string, unknown>;
    };
    expect(jsonPayload.export_format_version).toBe(1);
    expect(Number.parseInt(String(jsonPayload.schema_version ?? "0"), 10)).toBeGreaterThan(0);
    const tables = jsonPayload.tables ?? {};
    expect(tables).toHaveProperty("kind_acts");
    expect(tables).toHaveProperty("mom_notes");
    expect(tables).toHaveProperty("settings");
    const kindActsRows = Array.isArray(tables.kind_acts)
      ? (tables.kind_acts as Array<Record<string, unknown>>)
      : [];
    const settingsRows = Array.isArray(tables.settings)
      ? (tables.settings as Array<Record<string, unknown>>)
      : [];
    expect(settingsRows.map((row) => String(row.key ?? ""))).not.toContain("parent_pin");

    const [csvDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("[data-mom-export-csv]").click(),
    ]);
    expect(csvDownload.suggestedFilename()).toMatch(
      /^blaires-kind-heart-kind-acts-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    const csvPath = await csvDownload.path();
    if (!csvPath) {
      throw new Error("CSV export download path was not available");
    }
    const csvRaw = await readFile(csvPath, "utf8");
    const [csvHeader] = csvRaw.trimEnd().split(/\r?\n/);
    expect(csvHeader).toBe(
      "id,category,description,hearts_earned,created_at,day_key,reflection_type,emotion_selected,bonus_context,combo_day",
    );

    const mutationNote = `post-export mutation note ${Date.now()}`;
    await page.locator("[data-mom-note]").fill(mutationNote);
    await page.locator("[data-goal-toggle=\"acts\"]").click();
    await page.locator("[data-slider-plus=\"acts\"]").click();
    await page.locator("[data-mom-save]").click();
    await expect(page.locator("[data-mom-dashboard]")).toHaveCount(0);

    await openMomDashboard();
    await expect(page.locator("[data-mom-note]")).toHaveValue(mutationNote);

    await page.evaluate(async ({ snapshot }) => {
      const bindings = (window as typeof window & {
        wasmBindings?: {
          restore_snapshot_for_test?: (payload: string) => Promise<unknown>;
        };
      }).wasmBindings;
      if (!bindings?.restore_snapshot_for_test) {
        throw new Error("restore_snapshot_for_test wasm export is unavailable");
      }
      await bindings.restore_snapshot_for_test(snapshot);
    }, { snapshot: jsonRaw });
    await page.waitForTimeout(250);

    const [jsonAfterRestoreDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("[data-mom-export-json]").click(),
    ]);
    const jsonAfterRestorePath = await jsonAfterRestoreDownload.path();
    if (!jsonAfterRestorePath) {
      throw new Error("Post-restore JSON export download path was not available");
    }
    const jsonAfterRestoreRaw = await readFile(jsonAfterRestorePath, "utf8");
    const jsonAfterRestorePayload = JSON.parse(jsonAfterRestoreRaw) as {
      tables?: Record<string, unknown>;
    };
    const restoredKindActsRows = Array.isArray(jsonAfterRestorePayload.tables?.kind_acts)
      ? (jsonAfterRestorePayload.tables?.kind_acts as Array<Record<string, unknown>>)
      : [];
    expect(restoredKindActsRows).toEqual(kindActsRows);
    const restoredMomNotesRows = Array.isArray(jsonAfterRestorePayload.tables?.mom_notes)
      ? (jsonAfterRestorePayload.tables?.mom_notes as Array<Record<string, unknown>>)
      : [];
    const restoredMomNoteText = restoredMomNotesRows
      .map((row) => String(row.note_text ?? ""))
      .join("\n");
    expect(restoredMomNoteText).not.toContain(mutationNote);

    await page.locator("[data-mom-close]").click();
    await expect(page.locator("[data-mom-dashboard]")).toHaveCount(0);
    await openMomDashboard();
  });
});
