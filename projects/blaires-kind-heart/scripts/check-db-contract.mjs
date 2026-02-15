import { access, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readText(relativePath) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  return readFile(fullPath, "utf8");
}

async function ensureFile(relativePath) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  await access(fullPath);
}

function assertPattern({ source, regex, description, file, failures }) {
  if (!regex.test(source)) {
    failures.push(`${file}: missing ${description} (${regex})`);
  }
}

async function main() {
  const failures = [];

  const rustMessagesFile = "rust/db_messages.rs";
  const workerFile = "public/db-worker.js";
  const queueFile = "rust/offline_queue.rs";
  const errorsFile = "rust/errors/reporter.rs";
  const momModeFile = "rust/mom_mode.rs";
  const contractDocFile = "docs/PERSISTENCE_CONTRACT.md";
  const runtimeContractSpecFile = "e2e/db-contract.spec.ts";

  const [
    rustMessages,
    workerSource,
    queueSource,
    errorsSource,
    momModeSource,
    contractDoc,
    runtimeContractSpec,
  ] = await Promise.all([
    readText(rustMessagesFile),
    readText(workerFile),
    readText(queueFile),
    readText(errorsFile),
    readText(momModeFile),
    readText(contractDocFile),
    readText(runtimeContractSpecFile),
  ]);

  const rustVersionMatch = rustMessages.match(/DB_WORKER_API_VERSION:\s*u16\s*=\s*(\d+)/);
  const workerVersionMatch = workerSource.match(/DB_WORKER_API_VERSION\s*=\s*(\d+)/);
  const workerMinVersionMatch = workerSource.match(/DB_WORKER_MIN_CLIENT_API_VERSION\s*=\s*(\d+)/);
  const workerSchemaVersionMatch = workerSource.match(/const DB_SCHEMA_VERSION\s*=\s*(\d+)/);

  if (!rustVersionMatch) {
    failures.push(`${rustMessagesFile}: could not find DB_WORKER_API_VERSION`);
  }
  if (!workerVersionMatch) {
    failures.push(`${workerFile}: could not find self.DB_WORKER_API_VERSION`);
  }
  if (!workerMinVersionMatch) {
    failures.push(`${workerFile}: could not find self.DB_WORKER_MIN_CLIENT_API_VERSION`);
  }
  if (!workerSchemaVersionMatch) {
    failures.push(`${workerFile}: could not find DB_SCHEMA_VERSION`);
  }

  if (rustVersionMatch && workerVersionMatch) {
    const rustVersion = Number(rustVersionMatch[1]);
    const workerVersion = Number(workerVersionMatch[1]);
    if (rustVersion !== workerVersion) {
      failures.push(
        `DB worker API version mismatch (rust=${rustVersion}, worker=${workerVersion})`,
      );
    }
  }

  const rustMessagePatterns = [
    {
      regex: /Export,\s*Restore\s*\{\s*snapshot_json:\s*String,\s*\}/s,
      description: "Restore request in Rust protocol enum",
    },
  ];

  for (const pattern of rustMessagePatterns) {
    assertPattern({
      source: rustMessages,
      regex: pattern.regex,
      description: pattern.description,
      file: rustMessagesFile,
      failures,
    });
  }

  const requiredWorkerTables = [
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

  for (const tableName of requiredWorkerTables) {
    assertPattern({
      source: workerSource,
      regex: new RegExp(`CREATE TABLE IF NOT EXISTS ${escapeRegex(tableName)}\\s*\\(`),
      description: `required table ${tableName}`,
      file: workerFile,
      failures,
    });
  }

  const requiredWorkerPatterns = [
    {
      regex: /const DB_SCHEMA_VERSION\s*=\s*\d+/,
      description: "worker schema version constant",
    },
    {
      regex: /SELECT value FROM meta WHERE key = 'schema_version' LIMIT 1/,
      description: "schema version read from meta table",
    },
    {
      regex: /currentSchemaVersion > DB_SCHEMA_VERSION/,
      description: "downgrade protection check",
    },
    {
      regex: /INSERT OR REPLACE INTO meta \(key, value\) VALUES \('schema_version', \?1\)/,
      description: "schema version persistence write",
    },
    {
      regex: /ALTER TABLE kind_acts ADD COLUMN reflection_type TEXT DEFAULT NULL;/,
      description: "kind_acts reflection_type migration",
    },
    {
      regex: /ALTER TABLE kind_acts ADD COLUMN bonus_context TEXT DEFAULT NULL;/,
      description: "kind_acts bonus_context migration",
    },
    {
      regex: /ALTER TABLE kind_acts ADD COLUMN emotion_selected TEXT DEFAULT NULL;/,
      description: "kind_acts emotion_selected migration",
    },
    {
      regex: /ALTER TABLE kind_acts ADD COLUMN combo_day INTEGER DEFAULT 0;/,
      description: "kind_acts combo_day migration",
    },
    {
      regex: /ALTER TABLE weekly_insights ADD COLUMN skill_breakdown TEXT DEFAULT NULL;/,
      description: "weekly_insights skill_breakdown migration",
    },
    {
      regex: /ALTER TABLE stories_progress ADD COLUMN unlock_tier INTEGER DEFAULT 0;/,
      description: "stories_progress unlock_tier migration",
    },
    {
      regex: /if \(reqType === "Restore"\)/,
      description: "Restore request handler",
    },
    {
      regex: /restoreFromSnapshot\(snapshotJson\);/,
      description: "restore snapshot application call",
    },
    {
      regex: /DELETE FROM settings WHERE key != 'parent_pin'/,
      description: "restore preserves parent PIN setting",
    },
    {
      regex: /writeSchemaVersion\(db, DB_SCHEMA_VERSION\);/,
      description: "restore rewrites schema version after import",
    },
  ];

  for (const pattern of requiredWorkerPatterns) {
    assertPattern({
      source: workerSource,
      regex: pattern.regex,
      description: pattern.description,
      file: workerFile,
      failures,
    });
  }

  const queuePatterns = [
    {
      regex: /CREATE TABLE IF NOT EXISTS offline_queue\s*\(/,
      description: "offline_queue table creation",
    },
    {
      regex: /SELECT id, sql, params FROM offline_queue ORDER BY timestamp ASC/,
      description: "deterministic queue flush order",
    },
    {
      regex: /DELETE FROM offline_queue WHERE id IN/,
      description: "selective deletion for successful queue entries",
    },
  ];

  for (const pattern of queuePatterns) {
    assertPattern({
      source: queueSource,
      regex: pattern.regex,
      description: pattern.description,
      file: queueFile,
      failures,
    });
  }

  const errorPatterns = [
    {
      regex: /CREATE TABLE IF NOT EXISTS errors\s*\(/,
      description: "errors table creation",
    },
    {
      regex: /CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors\(timestamp\);?/,
      description: "errors timestamp index",
    },
  ];

  for (const pattern of errorPatterns) {
    assertPattern({
      source: errorsSource,
      regex: pattern.regex,
      description: pattern.description,
      file: errorsFile,
      failures,
    });
  }

  if (
    /CREATE TABLE IF NOT EXISTS errors[\s\S]*;\s*CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors\(timestamp\)/.test(
      errorsSource,
    )
  ) {
    failures.push(
      `${errorsFile}: schema init batches table + index in one SQL string; split into separate db_client::exec calls`,
    );
  }

  const docPatterns = [
    {
      regex: /^# Persistence Contract/m,
      description: "document title",
    },
    {
      regex: /`npm run qa:db-contract`/,
      description: "qa gate command reference",
    },
    {
      regex: /DB_WORKER_API_VERSION/,
      description: "worker protocol section",
    },
    {
      regex: /meta\.schema_version/,
      description: "schema version contract section",
    },
    {
      regex: /Export JSON|Export Acts CSV|parent_pin/,
      description: "export contract section",
    },
    {
      regex: /Restore JSON|data-mom-restore-json|restore/i,
      description: "restore contract section",
    },
  ];

  for (const pattern of docPatterns) {
    assertPattern({
      source: contractDoc,
      regex: pattern.regex,
      description: pattern.description,
      file: contractDocFile,
      failures,
    });
  }

  const momModePatterns = [
    {
      regex: /data-mom-export-json/,
      description: "JSON export action",
    },
    {
      regex: /data-mom-export-csv/,
      description: "CSV export action",
    },
    {
      regex: /SELECT key, value FROM settings WHERE key != 'parent_pin'/,
      description: "PIN excluded from exported settings",
    },
    {
      regex: /blaires-kind-heart-export-.*\.json/,
      description: "JSON export filename contract",
    },
    {
      regex: /blaires-kind-heart-kind-acts-.*\.csv/,
      description: "CSV export filename contract",
    },
    {
      regex: /data-mom-restore-json/,
      description: "restore JSON action",
    },
    {
      regex: /data-mom-restore-input/,
      description: "restore JSON file input",
    },
    {
      regex: /db_client::restore_snapshot/,
      description: "restore flow dispatches worker restore request",
    },
  ];

  for (const pattern of momModePatterns) {
    assertPattern({
      source: momModeSource,
      regex: pattern.regex,
      description: pattern.description,
      file: momModeFile,
      failures,
    });
  }

  const runtimeSpecPatterns = [
    {
      regex: /mom dashboard exports JSON and CSV backups/,
      description: "export runtime contract test",
    },
    {
      regex: /export_format_version\)\.toBe\(1\)/,
      description: "JSON export format assertion",
    },
    {
      regex: /not\.toContain\("parent_pin"\)/,
      description: "runtime PIN exclusion assertion",
    },
    {
      regex: /id,category,description,hearts_earned,created_at,day_key,reflection_type,emotion_selected,bonus_context,combo_day/,
      description: "CSV header contract assertion",
    },
    {
      regex: /restore_snapshot_for_test/,
      description: "runtime restore invocation through wasm test bridge",
    },
    {
      regex: /mutationNote/,
      description: "runtime restore test mutates tracker data after export",
    },
    {
      regex: /expect\(restoredKindActsRows\)\.toEqual\(kindActsRows\)/,
      description: "runtime restore verifies pre-export data restored exactly",
    },
    {
      regex: /not\.toContain\(mutationNote\)/,
      description: "runtime restore verifies post-export mutation was removed",
    },
    {
      regex: /await openMomDashboard\(\);/,
      description: "runtime restore flow re-opens Mom dashboard after restore",
    },
  ];

  for (const pattern of runtimeSpecPatterns) {
    assertPattern({
      source: runtimeContractSpec,
      regex: pattern.regex,
      description: pattern.description,
      file: runtimeContractSpecFile,
      failures,
    });
  }

  await ensureFile(contractDocFile).catch(() => {
    failures.push(`${contractDocFile}: file is missing`);
  });

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[qa-db-contract] FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("[qa-db-contract] PASS static persistence contract checks");
}

main().catch((error) => {
  console.error(`[qa-db-contract] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
