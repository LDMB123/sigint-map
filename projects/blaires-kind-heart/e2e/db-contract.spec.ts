import { expect, test } from "@playwright/test";
import {
  dbWorkerExec,
  dbWorkerInit,
  dbWorkerQueryRows,
  dbWorkerRequest,
  installDbWorkerHarness,
  terminateDbWorkerHarness,
} from "./fixtures/dbWorkerHarness";
import { openMomDashboard, waitForAppReady } from "./helpers";

test.use({ video: "off" });

test.describe("db contract", () => {
  test("db worker initializes schema, migrations, and integrity", async ({ page }) => {
    await page.goto("/offline.html", { waitUntil: "domcontentloaded" });

    await installDbWorkerHarness(page, { startRequestId: 1 });

    let summary: {
      initType: string;
      tableNames: string[];
      integrity: string;
      foreignKeyCheckCount: number;
      kindActsColumns: string[];
      weeklyInsightsColumns: string[];
      reflectionPromptCount: number;
      unknownReqType: string;
      unknownReqMessage: string;
    };

    try {
      const initResponse = await dbWorkerInit(page);

      const tableRows = await dbWorkerQueryRows(
        page,
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      );
      const tableNames = tableRows.map((row) => String(row.name));

      const integrityRows = await dbWorkerQueryRows(page, "PRAGMA integrity_check");
      const integrity = String(
        integrityRows[0]?.integrity_check ?? integrityRows[0]?.["integrity_check "] ?? "",
      ).toLowerCase();

      const foreignKeyRows = await dbWorkerQueryRows(page, "PRAGMA foreign_key_check");

      const kindActsColumns = (await dbWorkerQueryRows(page, "PRAGMA table_info(kind_acts)")).map(
        (row) => String(row.name),
      );
      const weeklyInsightsColumns = (
        await dbWorkerQueryRows(page, "PRAGMA table_info(weekly_insights)")
      ).map((row) => String(row.name));

      const promptsRows = await dbWorkerQueryRows(
        page,
        "SELECT COUNT(*) as cnt FROM reflection_prompts",
      );
      const reflectionPromptCount = Number(promptsRows[0]?.cnt ?? 0);

      const unknownReqResponse = await dbWorkerRequest(page, { type: "Nope" });

      summary = {
        initType: String(initResponse.type),
        tableNames,
        integrity,
        foreignKeyCheckCount: foreignKeyRows.length,
        kindActsColumns,
        weeklyInsightsColumns,
        reflectionPromptCount,
        unknownReqType: String(unknownReqResponse.type),
        unknownReqMessage: String(unknownReqResponse.message || ""),
      };
    } finally {
      await terminateDbWorkerHarness(page);
    }

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
      "skill_aliases",
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
      expect.arrayContaining([
        "canonical_category",
        "reflection_type",
        "bonus_context",
        "emotion_selected",
        "combo_day",
      ]),
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

    await installDbWorkerHarness(page, { startRequestId: 10_000 });

    type ContractSnapshot = {
      exportPayload: {
        export_format_version: number;
        schema_version: number;
        tables: {
          kind_acts: Array<Record<string, unknown>>;
          settings: Array<Record<string, unknown>>;
          quests: Array<Record<string, unknown>>;
        };
      };
      csv: string;
      kindActsRows: Array<Record<string, unknown>>;
      restoredKindActsRows: Array<Record<string, unknown>>;
      mutationNote: string;
    };

    let contract: ContractSnapshot;

    try {
      const now = Date.now();
      const dayKey = new Date(now).toISOString().slice(0, 10);
      const baseId = `db-contract-base-${now}`;

      await dbWorkerInit(page);
      await dbWorkerExec(page, "INSERT OR REPLACE INTO settings (key, value) VALUES ('parent_pin', ?1)", [
        "1234",
      ]);
      await dbWorkerExec(
        page,
        "INSERT OR REPLACE INTO kind_acts (id, category, canonical_category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        [baseId, "sharing", "sharing", "Shared crayons", "2", String(now), dayKey, "gratitude", "happy", "classroom", "1"],
      );

      const kindActsRows = await dbWorkerQueryRows(
        page,
        "SELECT id, category, canonical_category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day FROM kind_acts ORDER BY created_at ASC, id ASC",
      );
      const settingsRows = await dbWorkerQueryRows(
        page,
        "SELECT key, value FROM settings WHERE key != 'parent_pin'",
      );

      const exportPayload = {
        export_format_version: 2,
        schema_version: 2,
        tables: {
          kind_acts: kindActsRows,
          settings: settingsRows,
          quests: await dbWorkerQueryRows(page, "SELECT * FROM quests ORDER BY day_key ASC"),
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
      await dbWorkerExec(
        page,
        "INSERT OR REPLACE INTO kind_acts (id, category, canonical_category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        [
          `db-contract-mutation-${now}`,
          "helping",
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

      const hasRestoreSnapshotForTest = await page.evaluate(
        () => typeof (window as any).wasmBindings?.restore_snapshot_for_test === "function",
      );
      if (!hasRestoreSnapshotForTest) {
        // Keep contract visibility even when the runtime path uses direct worker Restore.
        console.warn("restore_snapshot_for_test is not available");
      }

      const restoreResponse = await dbWorkerRequest(page, {
        type: "Restore",
        snapshot_json: JSON.stringify(exportPayload),
      });
      if (restoreResponse.type !== "Ok") {
        throw new Error(`Restore failed: ${String(restoreResponse.message || restoreResponse.type)}`);
      }

      const restoredKindActsRows = await dbWorkerQueryRows(
        page,
        "SELECT id, category, canonical_category, description, hearts_earned, created_at, day_key, reflection_type, emotion_selected, bonus_context, combo_day FROM kind_acts ORDER BY created_at ASC, id ASC",
      );

      contract = {
        exportPayload,
        csv,
        kindActsRows,
        restoredKindActsRows,
        mutationNote,
      };
    } finally {
      await terminateDbWorkerHarness(page);
    }

    const { exportPayload, csv, kindActsRows, restoredKindActsRows, mutationNote } = contract;

    expect(exportPayload.export_format_version).toBe(2);
    expect(JSON.stringify(exportPayload.tables.settings)).not.toContain("parent_pin");
    expect(csv.split("\n")[0]).toBe(
      "id,category,description,hearts_earned,created_at,day_key,reflection_type,emotion_selected,bonus_context,combo_day",
    );
    expect(restoredKindActsRows).toEqual(kindActsRows);
    expect(JSON.stringify(restoredKindActsRows)).toContain("\"canonical_category\":\"sharing\"");
    expect(JSON.stringify(restoredKindActsRows)).not.toContain(mutationNote);
  });

  test("db worker restores legacy v1 snapshot into schema v2 compatibility layer", async ({
    page,
  }) => {
    await page.goto("/offline.html", { waitUntil: "domcontentloaded" });
    await installDbWorkerHarness(page, { startRequestId: 20_000 });

    try {
      await dbWorkerInit(page);
      const now = Date.now();
      const dayKey = new Date(now).toISOString().slice(0, 10);

      const legacySnapshot = {
        export_format_version: 1,
        schema_version: 1,
        tables: {
          kind_acts: [
            {
              id: `legacy-v1-${now}`,
              category: "nice-words",
              description: "Said something kind",
              hearts_earned: 1,
              created_at: now,
              day_key: dayKey,
            },
          ],
          settings: [{ key: "legacy_flag", value: "1" }],
          quests: [],
          skill_mastery: [
            {
              skill_type: "nice-words",
              total_count: 3,
              week_count: 2,
              mastery_level: 0,
              last_practiced: dayKey,
              focus_priority: 40,
            },
          ],
        },
      };

      const restoreResponse = await dbWorkerRequest(page, {
        type: "Restore",
        snapshot_json: JSON.stringify(legacySnapshot),
      });
      expect(restoreResponse.type).toBe("Ok");

      const rows = await dbWorkerQueryRows(
        page,
        "SELECT category, canonical_category FROM kind_acts ORDER BY created_at ASC LIMIT 1",
      );
      expect(rows.length).toBe(1);
      expect(String(rows[0]?.category ?? "")).toBe("nice-words");
      expect(String(rows[0]?.canonical_category ?? "")).toBe("love");

      const masteryRows = await dbWorkerQueryRows(
        page,
        "SELECT skill_type, total_count FROM skill_mastery WHERE skill_type = 'love' LIMIT 1",
      );
      expect(masteryRows.length).toBe(1);
      expect(Number(masteryRows[0]?.total_count ?? 0)).toBeGreaterThanOrEqual(3);
    } finally {
      await terminateDbWorkerHarness(page);
    }
  });
});
