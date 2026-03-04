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

  const contractConfigFile = "config/db-contract.json";
  const rustContractGeneratedFile = "rust/db_contract_generated.rs";
  const jsContractGeneratedFile = "public/db-contract.js";
  const rustMessagesFile = "rust/db_messages.rs";
  const workerFile = "public/db-worker.js";
  const queueFile = "rust/offline_queue.rs";
  const errorsFile = "rust/errors/reporter.rs";
  const momModeFile = "rust/mom_mode.rs";
  const momModeStoreFile = "rust/mom_mode_store.rs";
  const contractDocFile = "docs/PERSISTENCE_CONTRACT.md";
  const runtimeContractSpecFile = "e2e/db-contract.spec.ts";

  const [
    contractConfigRaw,
    rustContractGeneratedSource,
    jsContractGeneratedSource,
    rustMessages,
    workerSource,
    queueSource,
    errorsSource,
    momModeSource,
    momModeStoreSource,
    contractDoc,
    runtimeContractSpec,
  ] = await Promise.all([
    readText(contractConfigFile),
    readText(rustContractGeneratedFile),
    readText(jsContractGeneratedFile),
    readText(rustMessagesFile),
    readText(workerFile),
    readText(queueFile),
    readText(errorsFile),
    readText(momModeFile),
    readText(momModeStoreFile).catch(() => ""),
    readText(contractDocFile),
    readText(runtimeContractSpecFile),
  ]);

  const momModeInvariantSource = `${momModeSource}\n${momModeStoreSource}`;

  let contractConfig = null;
  try {
    contractConfig = JSON.parse(contractConfigRaw);
  } catch (error) {
    failures.push(
      `${contractConfigFile}: invalid JSON (${error instanceof Error ? error.message : String(error)})`,
    );
  }

  const dbWorkerApiVersion = Number(contractConfig?.db_worker_api_version);
  const dbWorkerMinClientApiVersion = Number(contractConfig?.db_worker_min_client_api_version);
  const dbSchemaVersion = Number(contractConfig?.db_schema_version);
  const exportFormatVersion = Number(contractConfig?.export_format_version);

  for (const [key, value] of [
    ["db_worker_api_version", dbWorkerApiVersion],
    ["db_worker_min_client_api_version", dbWorkerMinClientApiVersion],
    ["db_schema_version", dbSchemaVersion],
    ["export_format_version", exportFormatVersion],
  ]) {
    if (!Number.isInteger(value) || value < 1) {
      failures.push(`${contractConfigFile}: ${key} must be a positive integer`);
    }
  }

  const generatedContractPatterns = [
    {
      file: rustContractGeneratedFile,
      source: rustContractGeneratedSource,
      regex: new RegExp(`DB_WORKER_API_VERSION:\\s*u16\\s*=\\s*${dbWorkerApiVersion}`),
      description: "Rust DB worker API version constant",
    },
    {
      file: rustContractGeneratedFile,
      source: rustContractGeneratedSource,
      regex: new RegExp(
        `DB_WORKER_MIN_CLIENT_API_VERSION:\\s*u16\\s*=\\s*${dbWorkerMinClientApiVersion}`,
      ),
      description: "Rust min client API version constant",
    },
    {
      file: rustContractGeneratedFile,
      source: rustContractGeneratedSource,
      regex: new RegExp(`DB_SCHEMA_VERSION:\\s*u16\\s*=\\s*${dbSchemaVersion}`),
      description: "Rust DB schema version constant",
    },
    {
      file: rustContractGeneratedFile,
      source: rustContractGeneratedSource,
      regex: new RegExp(`EXPORT_FORMAT_VERSION:\\s*u16\\s*=\\s*${exportFormatVersion}`),
      description: "Rust export format version constant",
    },
    {
      file: jsContractGeneratedFile,
      source: jsContractGeneratedSource,
      regex: new RegExp(`export const DB_WORKER_API_VERSION = ${dbWorkerApiVersion};`),
      description: "JS DB worker API version constant",
    },
    {
      file: jsContractGeneratedFile,
      source: jsContractGeneratedSource,
      regex: new RegExp(
        `export const DB_WORKER_MIN_CLIENT_API_VERSION = ${dbWorkerMinClientApiVersion};`,
      ),
      description: "JS min client API version constant",
    },
    {
      file: jsContractGeneratedFile,
      source: jsContractGeneratedSource,
      regex: new RegExp(`export const DB_SCHEMA_VERSION = ${dbSchemaVersion};`),
      description: "JS DB schema version constant",
    },
    {
      file: jsContractGeneratedFile,
      source: jsContractGeneratedSource,
      regex: new RegExp(`export const EXPORT_FORMAT_VERSION = ${exportFormatVersion};`),
      description: "JS export format version constant",
    },
  ];

  for (const pattern of generatedContractPatterns) {
    assertPattern({
      source: pattern.source,
      regex: pattern.regex,
      description: pattern.description,
      file: pattern.file,
      failures,
    });
  }

  const rustMessagePatterns = [
    {
      regex: /include!\("db_contract_generated\.rs"\);/,
      description: "generated DB contract constants include",
    },
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
    "skill_aliases",
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
      regex: /import\s*\{[\s\S]*DB_SCHEMA_VERSION[\s\S]*\}\s*from "\.\/db-contract\.js";/,
      description: "worker imports shared DB contract constants",
    },
    {
      regex: /self\.DB_WORKER_API_VERSION\s*=\s*DB_WORKER_API_VERSION;/,
      description: "worker exposes API version from shared contract",
    },
    {
      regex: /self\.DB_WORKER_MIN_CLIENT_API_VERSION\s*=\s*DB_WORKER_MIN_CLIENT_API_VERSION;/,
      description: "worker exposes minimum client API version from shared contract",
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
      regex: /ALTER TABLE kind_acts ADD COLUMN canonical_category TEXT NOT NULL DEFAULT 'love';/,
      description: "kind_acts canonical_category migration",
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
      regex: /CREATE TABLE IF NOT EXISTS skill_aliases \(alias_skill TEXT PRIMARY KEY, canonical_skill TEXT NOT NULL\)/,
      description: "skill_aliases table migration",
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
      regex: /function normalizeSnapshotForImport\(parsed\)/,
      description: "restore import normalization entrypoint",
    },
    {
      regex: /version === EXPORT_FORMAT_VERSION - 1/,
      description: "restore supports legacy v1 snapshot import",
    },
    {
      regex: /export_format_version must be .*legacy import/s,
      description: "restore rejects unknown export format versions",
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
      regex: /mom_mode_store::export_json_tables|SELECT key, value FROM settings WHERE key != 'parent_pin'/,
      description: "mom_mode export flow uses helper or inline settings export query",
    },
    {
      regex: /SELECT key, value FROM settings WHERE key != 'parent_pin'/,
      description: "PIN excluded from exported settings",
      source: momModeInvariantSource,
      file: `${momModeFile}, ${momModeStoreFile}`,
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
      regex: /mom_mode_store::restore_snapshot|db_client::restore_snapshot/,
      description: "restore flow dispatches helper or worker restore request",
    },
    {
      regex: /db_client::restore_snapshot/,
      description: "restore flow dispatches worker restore request",
      source: momModeInvariantSource,
      file: `${momModeFile}, ${momModeStoreFile}`,
    },
  ];

  for (const pattern of momModePatterns) {
    assertPattern({
      source: pattern.source ?? momModeSource,
      regex: pattern.regex,
      description: pattern.description,
      file: pattern.file ?? momModeFile,
      failures,
    });
  }

  const runtimeSpecPatterns = [
    {
      regex: /mom dashboard exports JSON and CSV backups/,
      description: "export runtime contract test",
    },
    {
      regex: new RegExp(`export_format_version\\)\\.toBe\\(${exportFormatVersion}\\)`),
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
      regex: /await openMomDashboard\(page\);/,
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
  for (const requiredFile of [
    contractConfigFile,
    rustContractGeneratedFile,
    jsContractGeneratedFile,
  ]) {
    await ensureFile(requiredFile).catch(() => {
      failures.push(`${requiredFile}: file is missing`);
    });
  }

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
