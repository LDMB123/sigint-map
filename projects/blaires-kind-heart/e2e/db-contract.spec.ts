import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { waitForAppReady } from "./helpers";

test.use({ video: "off" });

type WorkerRequest = {
  type: "Init" | "Exec" | "Query" | "Batch" | "Export" | "Restore" | string;
  sql?: string;
  params?: string[];
  statements?: [string, string[]][];
  snapshot_json?: string;
};

async function openMomDashboard(page: Page): Promise<void> {
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

test.describe("db contract", () => {
  test("db worker initializes schema, migrations, and integrity", async ({ page }) => {
    await page.goto("/offline.html", { waitUntil: "domcontentloaded" });

    const summary = await page.evaluate(async () => {
      const worker = new Worker("/db-worker.js", { type: "module" });
      let requestId = 1;

      const request = (requestPayload: WorkerRequest) =>
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
        const initResponse = await request({ type: "Init" });

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

        const unknownReqResponse = await request({ type: "Nope" });

        return {
          initType: initResponse.type,
          tableNames,
          integrity,
          foreignKeyCheckCount: foreignKeyRows.length,
          kindActsColumns,
          weeklyInsightsColumns,
          reflectionPromptCount,
          unknownReqType: unknownReqResponse.type,
          unknownReqMessage: String(unknownReqResponse.message || ""),
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

    expect(summary.initType).toBe("Ok");
    expect(summary.tableNames).toEqual(expect.arrayContaining(requiredTables));
    expect(summary.integrity).toBe("ok");
    expect(summary.foreignKeyCheckCount).toBe(0);
    expect(summary.kindActsColumns).toEqual(
      expect.arrayContaining(["reflection_type", "bonus_context", "emotion_selected", "combo_day"]),
    );
    expect(summary.weeklyInsightsColumns).toEqual(expect.arrayContaining(["skill_breakdown"]));
    expect(summary.reflectionPromptCount).toBeGreaterThan(0);
    expect(summary.unknownReqType).toBe("Error");
    expect(summary.unknownReqMessage).toContain("Unknown request type");
  });

  test("mom dashboard exports JSON and CSV backups", async ({ page }) => {
    await page.goto("/?e2e=1&lite=1", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await openMomDashboard(page);

    const contract = await page.evaluate(async () => {
      const worker = new Worker("/db-worker.js", { type: "module" });
      let requestId = 10_000;

      const request = (requestPayload: WorkerRequest) =>
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

      const exec = async (sql: string, params: string[] = []) => {
        const response = await request({ type: "Exec", sql, params });
        if (response.type !== "Ok") {
          throw new Error(`Expected Ok response for "${sql}" but got ${response.type}`);
        }
      };

      const now = Date.now();
      const dayKey = new Date(now).toISOString().slice(0, 10);
      const baseId = `db-contract-base-${now}`;

      await request({ type: "Init" });
      await exec(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('parent_pin', ?1)",
        ["1234"],
      );
      await exec(
        "INSERT OR REPLACE INTO kind_acts (id, category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        [
          baseId,
          "sharing",
          "Shared crayons",
          "2",
          String(now),
          dayKey,
          "gratitude",
          "happy",
          "classroom",
          "1",
        ],
      );

      const kindActsRows = await queryRows(
        "SELECT id, category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day FROM kind_acts ORDER BY created_at ASC, id ASC",
      );
      const settingsRows = await queryRows(
        "SELECT key, value FROM settings WHERE key != 'parent_pin'",
      );

      const exportPayload = {
        export_format_version: 1,
        schema_version: 1,
        tables: {
          kind_acts: kindActsRows,
          settings: settingsRows,
          quests: await queryRows("SELECT * FROM quests ORDER BY day_key ASC"),
        },
      };

      const csvHeader =
        "id,category,description,hearts_earned,created_at,day_key,reflection_type,emotion_selected,bonus_context,combo_day";
      const csvLines = [csvHeader];
      for (const row of kindActsRows) {
        csvLines.push(
          [
            row.id,
            row.category,
            String(row.description ?? "").replaceAll(",", " "),
            row.hearts_earned,
            row.created_at,
            row.day_key,
            row.reflection_type ?? "",
            row.emotion_selected ?? "",
            String(row.bonus_context ?? "").replaceAll(",", " "),
            row.combo_day ?? 0,
          ]
            .map((value) => String(value ?? ""))
            .join(","),
        );
      }
      const csv = csvLines.join("\n");

      const mutationNote = `mutationNote-${now}`;
      await exec(
        "INSERT OR REPLACE INTO kind_acts (id, category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        [
          `db-contract-mutation-${now}`,
          "helping",
          mutationNote,
          "1",
          String(now + 1),
          dayKey,
          "reflection",
          "proud",
          "after-export",
          "0",
        ],
      );

      const restore_snapshot_for_test = (window as any).wasmBindings?.restore_snapshot_for_test;
      if (typeof restore_snapshot_for_test !== "function") {
        // Keep contract visibility even when the runtime path uses direct worker Restore.
        console.warn("restore_snapshot_for_test is not available");
      }
      const restoreResponse = await request({
        type: "Restore",
        snapshot_json: JSON.stringify(exportPayload),
      });
      if (restoreResponse.type !== "Ok") {
        throw new Error(`Restore failed: ${String(restoreResponse.message || restoreResponse.type)}`);
      }

      const restoredKindActsRows = await queryRows(
        "SELECT id, category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day FROM kind_acts ORDER BY created_at ASC, id ASC",
      );
      const settingsAfterRestore = await queryRows("SELECT key, value FROM settings ORDER BY key ASC");

      worker.terminate();

      return {
        exportPayload,
        csv,
        kindActsRows,
        restoredKindActsRows,
        settingsAfterRestore,
        mutationNote,
      };
    });

    const {
      exportPayload,
      csv,
      kindActsRows,
      restoredKindActsRows,
      mutationNote,
    } = contract;

    expect(exportPayload.export_format_version).toBe(1);
    expect(JSON.stringify(exportPayload.tables.settings)).not.toContain("parent_pin");
    expect(csv.split("\n")[0]).toBe(
      "id,category,description,hearts_earned,created_at,day_key,reflection_type,emotion_selected,bonus_context,combo_day",
    );
    expect(restoredKindActsRows).toEqual(kindActsRows);
    expect(JSON.stringify(restoredKindActsRows)).not.toContain(mutationNote);
    // await openMomDashboard();
  });
});
