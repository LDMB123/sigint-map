// SQLite Web Worker with tiered storage fallback for Safari.
// Safari 26.2 does NOT support the OPFS synchronous access handle VFS
// that @anthropic-ai/sqlite-wasm requires. This worker tries three backends:
//   1. OPFS VFS (Chrome, future Safari) — best performance
//   2. kvvfs (localStorage bridge) — works everywhere, 5-10MB limit
//   3. In-memory + periodic Blob export to OPFS — unlimited but slower persistence
//
// All messages are DbRequest/DbResponse (defined in Rust, serialized via serde).

import "./runtime-diagnostics.js";
import {
  DB_SCHEMA_VERSION,
  DB_WORKER_API_VERSION,
  DB_WORKER_MIN_CLIENT_API_VERSION,
  EXPORT_FORMAT_VERSION,
} from "./db-contract.js";
import { CANONICAL_SKILLS, SKILL_ALIASES, toCanonicalSkill } from "./skill-taxonomy.js";
import { REFLECTION_PROMPTS } from "./reflection-prompts.generated.js";

self.__BKH_RUNTIME_DIAGNOSTICS__?.install({
  scope: "db-worker"
});

let db = null;
let backend = 'none';
let cachedSqlite3 = null;
let initInProgress = false;
let initWaiters = [];  // request_ids waiting for concurrent Init to finish
self.DB_WORKER_API_VERSION = DB_WORKER_API_VERSION;
self.DB_WORKER_MIN_CLIENT_API_VERSION = DB_WORKER_MIN_CLIENT_API_VERSION;

// Prepared statement cache — reduces query latency by 5-10ms per request
const STMT_CACHE = new Map();
const STMT_CACHE_MAX = 128;

// Pre-computed at module level — avoids regex on every initDb() call
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Get or create cached prepared statement (FIFO eviction at capacity).
function getOrPrepare(db, sql) {
  if (!STMT_CACHE.has(sql)) {
    if (STMT_CACHE.size >= STMT_CACHE_MAX) {
      const [evictKey] = STMT_CACHE.keys();
      if (evictKey) {
        try { STMT_CACHE.get(evictKey)?.finalize(); } catch (_) {}
        STMT_CACHE.delete(evictKey);
      }
    }
    STMT_CACHE.set(sql, db.prepare(sql));
  }
  return STMT_CACHE.get(sql);
}

// ── Tier 1: OPFS (synchronous access handle VFS) ──
async function tryOpfs(sqlite3) {
  // Safari 26.2 does NOT support FileSystemSyncAccessHandle
  if (IS_SAFARI) return null;

  if (!sqlite3.oo1.OpfsDb) return null;
  try {
    const opfs = new sqlite3.oo1.OpfsDb('/blaires-kind-heart.sqlite3', 'cw');
    return opfs;
  } catch (_) {
    return null;
  }
}

// ── Tier 2: kvvfs (localStorage-backed, ~5MB limit) ──
function tryKvvfs(sqlite3) {
  try {
    const kvDb = new sqlite3.oo1.DB({
      filename: 'file:blaires-kind-heart.sqlite3?vfs=kvvfs',
      flags: 'cw'
    });
    return kvDb;
  } catch (_) {
    return null;
  }
}

// ── Tier 3: In-memory + pagehide blob export to OPFS ──
let opfsDir = null;

async function tryMemoryWithBlob(sqlite3) {
  const memDb = new sqlite3.oo1.DB(':memory:', 'cw');

  // Try to restore from OPFS blob
  try {
    const root = await navigator.storage.getDirectory();
    opfsDir = root;
    const fileHandle = await root.getFileHandle('blaires-kind-heart.db', { create: false });
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > 0) {
      const bytes = new Uint8Array(buffer);
      // SQLITE_DESERIALIZE_FREEONCLOSE (1) + SQLITE_DESERIALIZE_RESIZEABLE (2) = 3
      // The WASM binding copies bytes to the WASM heap via sqlite3_malloc, so
      // FREEONCLOSE safely frees it on close, and RESIZEABLE allows the DB to
      // grow beyond the initial blob size (without this, INSERTs fail with
      // SQLITE_FULL once the DB exceeds the original OPFS blob size).
      const rc = sqlite3.capi.sqlite3_deserialize(
        memDb.pointer, 'main', bytes, bytes.length, bytes.length, 3
      );
      if (rc !== 0) {
        console.warn('[db-worker] sqlite3_deserialize failed (rc=' + rc + '), starting fresh');
      }
    }
  } catch (_) {
    // No prior export or OPFS unavailable — start fresh
  }

  // If we couldn't get opfsDir yet, try now (for future exports)
  if (!opfsDir) {
    try {
      opfsDir = await navigator.storage.getDirectory();
    } catch (_) { /* no OPFS at all */ }
  }

  // Exports triggered only on pagehide (no periodic write churn)
  return memDb;
}

async function exportToBlob(sqlite3, memDb) {
  if (!opfsDir) return;
  try {
    const bytes = sqlite3.capi.sqlite3_js_db_export(memDb.pointer);
    const fileHandle = await opfsDir.getFileHandle('blaires-kind-heart.db', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(bytes);
    await writable.close();
  } catch (err) {
    const msg = String(err?.message ?? err);
    if (msg.includes('quota') || msg.includes('QuotaExceeded')) {
      self.postMessage({ type: 'quota-warning' });
    }
    // Other export failures non-critical — next pagehide will retry
  }
}

// ── Schema ──
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS kind_acts (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    canonical_category TEXT NOT NULL DEFAULT 'love',
    description TEXT NOT NULL DEFAULT '',
    hearts_earned INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    day_key TEXT NOT NULL,
    reflection_type TEXT DEFAULT NULL,
    bonus_context TEXT DEFAULT NULL,
    emotion_selected TEXT DEFAULT NULL,
    combo_day INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_acts_day ON kind_acts(day_key);

  CREATE TABLE IF NOT EXISTS quests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '',
    day_key TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_quests_day ON quests(day_key);
  CREATE INDEX IF NOT EXISTS idx_quests_day_completed ON quests(day_key, completed);

  CREATE TABLE IF NOT EXISTS streaks (
    day_key TEXT PRIMARY KEY,
    acts_count INTEGER NOT NULL DEFAULT 0,
    quests_completed INTEGER NOT NULL DEFAULT 0,
    hearts_total INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS stories_progress (
    story_id TEXT PRIMARY KEY,
    page_index INTEGER NOT NULL DEFAULT 0,
    choices_json TEXT NOT NULL DEFAULT '[]',
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    unlock_tier INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_stories_progress_completed ON stories_progress(completed);

  CREATE TABLE IF NOT EXISTS stickers (
    id TEXT PRIMARY KEY,
    sticker_type TEXT NOT NULL,
    earned_at INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS ai_cache (
    prompt_hash TEXT PRIMARY KEY,
    response TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS game_scores (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    combo INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    played_at INTEGER NOT NULL,
    day_key TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scores_day ON game_scores(day_key);
  CREATE INDEX IF NOT EXISTS idx_scores_game ON game_scores(game_id);

  CREATE TABLE IF NOT EXISTS weekly_goals (
    id TEXT PRIMARY KEY,
    week_key TEXT NOT NULL,
    goal_type TEXT NOT NULL,
    target INTEGER NOT NULL DEFAULT 10,
    progress INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    completed_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_goals_week ON weekly_goals(week_key);

  CREATE TABLE IF NOT EXISTS mom_notes (
    id TEXT PRIMARY KEY,
    week_key TEXT NOT NULL,
    note_text TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notes_week ON mom_notes(week_key);
  CREATE INDEX IF NOT EXISTS idx_notes_week_created ON mom_notes(week_key, created_at DESC);

  CREATE TABLE IF NOT EXISTS skill_mastery (
    skill_type TEXT PRIMARY KEY,
    total_count INTEGER NOT NULL DEFAULT 0,
    week_count INTEGER NOT NULL DEFAULT 0,
    mastery_level INTEGER NOT NULL DEFAULT 0,
    last_practiced TEXT NOT NULL,
    focus_priority INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS skill_aliases (
    alias_skill TEXT PRIMARY KEY,
    canonical_skill TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_skill_aliases_canonical ON skill_aliases(canonical_skill);

  CREATE TABLE IF NOT EXISTS weekly_insights (
    week_key TEXT PRIMARY KEY,
    top_skill TEXT NOT NULL,
    focus_skill TEXT NOT NULL,
    pattern_text TEXT NOT NULL DEFAULT '',
    reflection_rate INTEGER NOT NULL DEFAULT 0,
    skill_breakdown TEXT DEFAULT NULL,
    generated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reflection_prompts (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    emoji TEXT NOT NULL,
    response_options TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quest_chains (
    id TEXT PRIMARY KEY,
    chain_name TEXT NOT NULL,
    skill_category TEXT NOT NULL,
    theme_emoji TEXT NOT NULL,
    quest_ids TEXT NOT NULL,
    week_key TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    total_quests INTEGER NOT NULL DEFAULT 7,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    garden_unlocked INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_chains_week ON quest_chains(week_key);

  CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    badge_type TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    unlock_criteria TEXT NOT NULL,
    earned INTEGER NOT NULL DEFAULT 0,
    earned_at INTEGER,
    tier TEXT NOT NULL DEFAULT 'bronze'
  );
  CREATE INDEX IF NOT EXISTS idx_badges_earned ON badges(earned);
  CREATE INDEX IF NOT EXISTS idx_badges_type_tier_earned ON badges(badge_type, tier, earned);

  CREATE TABLE IF NOT EXISTS companion_skins (
    id TEXT PRIMARY KEY,
    skin_name TEXT NOT NULL,
    unlock_badge_id TEXT,
    is_unlocked INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS gardens (
    id TEXT PRIMARY KEY,
    garden_name TEXT NOT NULL,
    quest_chain_id TEXT NOT NULL,
    theme_emoji TEXT NOT NULL,
    growth_stage INTEGER NOT NULL DEFAULT 0,
    unlocked_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_gardens_unlocked_at ON gardens(unlocked_at DESC);

  CREATE TABLE IF NOT EXISTS weekly_themes (
    id TEXT PRIMARY KEY,
    week_key TEXT NOT NULL UNIQUE,
    skill_category TEXT NOT NULL,
    theme_name TEXT NOT NULL,
    quest_chain_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_themes_week ON weekly_themes(week_key);

  CREATE TABLE IF NOT EXISTS family_acts (
    id TEXT PRIMARY KEY,
    member TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    day_key TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_family_acts_day ON family_acts(day_key);

  CREATE TABLE IF NOT EXISTS companion_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS offline_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sql TEXT NOT NULL,
    params TEXT NOT NULL,
    timestamp REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_offline_queue_timestamp ON offline_queue(timestamp);

  CREATE TABLE IF NOT EXISTS errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp REAL NOT NULL,
    severity INTEGER NOT NULL,
    error_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors(timestamp);
`;

function readSchemaVersion(dbInstance) {
  try {
    const rows = dbInstance.exec(
      "SELECT value FROM meta WHERE key = 'schema_version' LIMIT 1",
      { returnValue: "resultRows" }
    );
    if (!rows || !rows[0] || rows[0].length === 0) {
      return 0;
    }
    const raw = rows[0][0];
    const parsed = Number.parseInt(String(raw), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (_) {
    return 0;
  }
}

function writeSchemaVersion(dbInstance, version) {
  dbInstance.exec(
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?1)",
    { bind: [String(version)] }
  );
}

function toSafeInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSnapshotSkillMasteryRows(rows) {
  const today = new Date().toISOString().split("T")[0];
  const merged = new Map();

  for (const row of rows) {
    const canonicalSkill = toCanonicalSkill(String(row?.skill_type ?? ""));
    const current = merged.get(canonicalSkill) || {
      skill_type: canonicalSkill,
      total_count: 0,
      week_count: 0,
      mastery_level: 0,
      last_practiced: today,
      focus_priority: 50,
    };
    current.total_count += Math.max(0, toSafeInt(row?.total_count, 0));
    current.week_count += Math.max(0, toSafeInt(row?.week_count, 0));
    current.mastery_level = Math.max(current.mastery_level, Math.max(0, toSafeInt(row?.mastery_level, 0)));
    current.focus_priority = Math.max(current.focus_priority, Math.max(0, toSafeInt(row?.focus_priority, 0)));
    const practiced = typeof row?.last_practiced === "string" && row.last_practiced.length > 0
      ? row.last_practiced
      : today;
    if (practiced > current.last_practiced) {
      current.last_practiced = practiced;
    }
    merged.set(canonicalSkill, current);
  }

  for (const skill of CANONICAL_SKILLS) {
    if (!merged.has(skill)) {
      merged.set(skill, {
        skill_type: skill,
        total_count: 0,
        week_count: 0,
        mastery_level: 0,
        last_practiced: today,
        focus_priority: 50,
      });
    }
  }

  return Array.from(merged.values());
}

function normalizeV1Snapshot(parsed) {
  const tables = { ...(parsed.tables || {}) };
  tables.kind_acts = (Array.isArray(tables.kind_acts) ? tables.kind_acts : []).map((row) => ({
    ...row,
    canonical_category: toCanonicalSkill(String(row?.canonical_category ?? row?.category ?? "love")),
    reflection_type: row?.reflection_type ?? null,
    bonus_context: row?.bonus_context ?? null,
    emotion_selected: row?.emotion_selected ?? null,
    combo_day: toSafeInt(row?.combo_day, 0),
  }));
  tables.skill_mastery = normalizeSnapshotSkillMasteryRows(
    Array.isArray(tables.skill_mastery) ? tables.skill_mastery : []
  );
  tables.reflection_prompts = (Array.isArray(tables.reflection_prompts) ? tables.reflection_prompts : []).map(
    (row) => ({
      ...row,
      category: toCanonicalSkill(String(row?.category ?? "love")),
    })
  );
  tables.skill_aliases = Object.entries(SKILL_ALIASES).map(([alias_skill, canonical_skill]) => ({
    alias_skill,
    canonical_skill,
  }));

  return {
    ...parsed,
    export_format_version: EXPORT_FORMAT_VERSION,
    schema_version: DB_SCHEMA_VERSION,
    tables,
  };
}

function normalizeSnapshotForImport(parsed) {
  const version = Number(parsed?.export_format_version ?? 0);
  if (version === EXPORT_FORMAT_VERSION) {
    return parsed;
  }
  if (version === EXPORT_FORMAT_VERSION - 1) {
    return normalizeV1Snapshot(parsed);
  }
  throw new Error(
    `Invalid snapshot: export_format_version must be ${EXPORT_FORMAT_VERSION} (or ${EXPORT_FORMAT_VERSION - 1} for legacy import)`
  );
}

function restoreFromSnapshot(snapshotJson) {
  const parsed = JSON.parse(snapshotJson);
  const normalized = normalizeSnapshotForImport(parsed);

  const snapshotSchemaVersion = Number(normalized.schema_version ?? 0);
  if (Number.isFinite(snapshotSchemaVersion) && snapshotSchemaVersion > DB_SCHEMA_VERSION) {
    throw new Error(
      `Snapshot schema version ${snapshotSchemaVersion} is newer than worker schema ${DB_SCHEMA_VERSION}`
    );
  }

  const tables = normalized.tables ?? {};
  const restoreTables = [
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
    "quest_chains",
    "weekly_themes",
    "family_acts",
    "companion_state",
    "offline_queue",
    "errors"
  ];

  db.exec("BEGIN TRANSACTION");
  try {
    for (const tableName of restoreTables) {
      const rows = Array.isArray(tables[tableName]) ? tables[tableName] : [];
      if (tableName === "settings") {
        db.exec("DELETE FROM settings WHERE key != 'parent_pin' AND key NOT LIKE 'feature.%'");
      } else {
        db.exec(`DELETE FROM ${tableName}`);
      }

      for (const row of rows) {
        const entries = Object.entries(row ?? {});
        if (entries.length === 0) {
          continue;
        }
        const columns = entries.map(([column]) => {
          const col = String(column).replace(/"/g, '""');
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) {
            throw new Error(`Invalid column name: ${col}`);
          }
          return `"${col}"`;
        }).join(", ");
        const placeholders = entries.map((_, index) => `?${index + 1}`).join(", ");
        const values = entries.map(([, value]) =>
          value === null || value === undefined ? null : value
        );

        const insertVerb = tableName === "settings" ? "INSERT OR REPLACE" : "INSERT";
        db.exec(
          `${insertVerb} INTO ${tableName} (${columns}) VALUES (${placeholders})`,
          { bind: values }
        );
      }
    }

    writeSchemaVersion(db, DB_SCHEMA_VERSION);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// ── Init with tiered fallback ──
async function initDb() {
  try {
    const { default: initSqlite } = await import('./sqlite/sqlite3.js');
    const sqlite3 = await initSqlite();
    cachedSqlite3 = sqlite3;

    // Try backends in order of preference
    db = await tryOpfs(sqlite3);
    if (db) { backend = 'opfs'; }

    if (!db) {
      db = tryKvvfs(sqlite3);
      if (db) { backend = 'kvvfs'; }
    }

    if (!db) {
      db = await tryMemoryWithBlob(sqlite3);
      if (db) { backend = 'memory+blob'; }
    }

    if (!db) {
      throw new Error('All storage backends failed');
    }

    // Runtime tuning: balanced durability/perf for local-first app workloads.
    try { db.exec("PRAGMA foreign_keys = ON"); } catch (_) {}
    try { db.exec("PRAGMA synchronous = NORMAL"); } catch (_) {}
    try { db.exec("PRAGMA temp_store = MEMORY"); } catch (_) {}
    try { db.exec("PRAGMA busy_timeout = 5000"); } catch (_) {}
    if (backend === 'opfs' || backend === 'kvvfs') {
      try { db.exec("PRAGMA journal_mode = WAL"); } catch (_) {}
    }

    db.exec(SCHEMA);

    const currentSchemaVersion = readSchemaVersion(db);
    if (currentSchemaVersion > DB_SCHEMA_VERSION) {
      throw new Error(
        `Database schema version ${currentSchemaVersion} is newer than worker schema ${DB_SCHEMA_VERSION}`
      );
    }

    // Run migrations — single loop avoids 8 redundant try-catch frames
    const MIGRATIONS = [
      "ALTER TABLE kind_acts ADD COLUMN reflection_type TEXT DEFAULT NULL;",
      "ALTER TABLE kind_acts ADD COLUMN bonus_context TEXT DEFAULT NULL;",
      "ALTER TABLE kind_acts ADD COLUMN emotion_selected TEXT DEFAULT NULL;",
      "ALTER TABLE kind_acts ADD COLUMN canonical_category TEXT NOT NULL DEFAULT 'love';",
      "CREATE INDEX IF NOT EXISTS idx_acts_category ON kind_acts(category)",
      "ALTER TABLE kind_acts ADD COLUMN combo_day INTEGER DEFAULT 0;",
      "ALTER TABLE stories_progress ADD COLUMN unlock_tier INTEGER DEFAULT 0;",
      "ALTER TABLE weekly_insights ADD COLUMN skill_breakdown TEXT DEFAULT NULL;",
      "ALTER TABLE game_scores ADD COLUMN combo INTEGER NOT NULL DEFAULT 0",
      "CREATE TABLE IF NOT EXISTS skill_aliases (alias_skill TEXT PRIMARY KEY, canonical_skill TEXT NOT NULL)",
      "CREATE INDEX IF NOT EXISTS idx_skill_aliases_canonical ON skill_aliases(canonical_skill)",
    ];
    for (const sql of MIGRATIONS) {
      try { db.exec(sql); } catch (_) { /* already applied */ }
    }

    seedSkillAliases();
    seedCanonicalSkillMasteryRows();
    normalizeLegacySkillMasteryRows();
    backfillCanonicalCategories();
    seedFeatureFlags();
    seedReflectionPrompts();

    writeSchemaVersion(db, DB_SCHEMA_VERSION);

    // DB ready
    return true;
  } catch (err) {
    console.warn('[db-worker] Init failed:', err);
    return false;
  }
}

// ── Message handler ──
function normalizeRequestId(requestId) {
  return typeof requestId === "number" ? requestId : 0;
}

function reply(type, requestId, extra = {}) {
  self.postMessage({
    type,
    request_id: normalizeRequestId(requestId),
    ...extra
  });
}

function replyOk(requestId) {
  reply("Ok", requestId);
}

function replyRows(requestId, data) {
  reply("Rows", requestId, { data });
}

function replyError(requestId, message) {
  reply("Error", requestId, { message });
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function withPreparedStmt(sql, params, runner) {
  const stmt = getOrPrepare(db, sql);
  if (Array.isArray(params) && params.length > 0) {
    stmt.bind(params);
  }
  try {
    return runner(stmt);
  } finally {
    try {
      stmt.reset();
      stmt.clearBindings();
    } catch (_) { }
  }
}

function runTransaction(work) {
  db.exec("BEGIN TRANSACTION");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function buildCanonicalCategoryCaseExpression(column = "category") {
  const parts = [];
  for (const skill of CANONICAL_SKILLS) {
    parts.push(`WHEN ${column} = '${skill}' THEN '${skill}'`);
  }
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    parts.push(`WHEN ${column} = '${alias}' THEN '${canonical}'`);
  }
  return `CASE ${parts.join(" ")} ELSE '${CANONICAL_SKILLS[CANONICAL_SKILLS.length - 1]}' END`;
}

function seedSkillAliases() {
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    db.exec(
      "INSERT OR REPLACE INTO skill_aliases (alias_skill, canonical_skill) VALUES (?1, ?2)",
      { bind: [alias, canonical] }
    );
  }
}

function seedCanonicalSkillMasteryRows() {
  const today = new Date().toISOString().split("T")[0];
  for (const skill of CANONICAL_SKILLS) {
    db.exec(
      `INSERT OR IGNORE INTO skill_mastery (skill_type, total_count, week_count, mastery_level, last_practiced, focus_priority)
       VALUES (?1, 0, 0, 0, ?2, 50)`,
      { bind: [skill, today] }
    );
  }
}

function normalizeLegacySkillMasteryRows() {
  const canonicalToAliases = new Map();
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (!canonicalToAliases.has(canonical)) {
      canonicalToAliases.set(canonical, []);
    }
    canonicalToAliases.get(canonical).push(alias);
  }

  for (const [canonical, aliases] of canonicalToAliases.entries()) {
    if (aliases.length === 0) {
      continue;
    }
    const placeholders = aliases.map(() => "?").join(", ");
    db.exec(
      `UPDATE skill_mastery
       SET total_count = total_count + COALESCE((SELECT SUM(total_count) FROM skill_mastery WHERE skill_type IN (${placeholders})), 0),
           week_count = week_count + COALESCE((SELECT SUM(week_count) FROM skill_mastery WHERE skill_type IN (${placeholders})), 0),
           focus_priority = MAX(focus_priority, COALESCE((SELECT MAX(focus_priority) FROM skill_mastery WHERE skill_type IN (${placeholders})), 0))
       WHERE skill_type = ?`,
      { bind: [...aliases, ...aliases, ...aliases, canonical] }
    );
    db.exec(
      `DELETE FROM skill_mastery WHERE skill_type IN (${placeholders})`,
      { bind: aliases }
    );
  }
}

function backfillCanonicalCategories() {
  const caseExpr = buildCanonicalCategoryCaseExpression("category");
  db.exec(
    `UPDATE kind_acts
     SET canonical_category = ${caseExpr}
     WHERE canonical_category IS NULL OR canonical_category = ''`
  );
}

function seedFeatureFlags() {
  const defaults = [
    ["feature.skill_progression_v1", "1"],
    ["feature.adaptive_quests_v1", "1"],
    ["feature.reflection_v1", "1"],
    ["feature.parent_insights_v1", "1"],
  ];
  for (const [key, value] of defaults) {
    db.exec(
      "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
      { bind: [key, value] }
    );
  }
}

function seedReflectionPrompts() {
  const promptCheck = db.exec(
    "SELECT COUNT(*) as c FROM reflection_prompts",
    { returnValue: "resultRows" }
  );
  if (!promptCheck[0] || promptCheck[0][0] !== 0) {
    return;
  }

  try {
    db.exec("BEGIN");
    for (const prompt of REFLECTION_PROMPTS) {
      db.exec(
        `INSERT INTO reflection_prompts (id, category, prompt_text, emoji, response_options)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
        {
          bind: [
            prompt.id,
            toCanonicalSkill(prompt.category),
            prompt.prompt_text,
            prompt.emoji,
            JSON.stringify(prompt.response_options ?? []),
          ],
        }
      );
    }
    db.exec("COMMIT");
  } catch (seedErr) {
    try {
      db.exec("ROLLBACK");
    } catch (_) {
      // ignore rollback failures in seed fallback path
    }
    console.warn("[db-worker] reflection_prompts seed failed:", seedErr);
  }
}

function requireDb(requestId, message = "DB not initialized") {
  if (db) {
    return true;
  }
  replyError(requestId, message);
  return false;
}

async function handleInitRequest(requestId) {
  // Guard against concurrent Init — wait for first to finish, then reply
  if (initInProgress) {
    initWaiters.push(normalizeRequestId(requestId));
    return;
  }

  initInProgress = true;
  let ok;
  try {
    ok = await initDb();
  } finally {
    initInProgress = false;
  }

  if (ok) {
    replyOk(requestId);
  } else {
    replyError(
      requestId,
      "Database initialization failed - all storage backends unavailable"
    );
  }

  // Flush any Init requests that arrived while we were initializing
  for (const waiterId of initWaiters) {
    if (ok) {
      replyOk(waiterId);
    } else {
      replyError(
        waiterId,
        "Database initialization failed - all storage backends unavailable"
      );
    }
  }
  initWaiters = [];
}

const REQUEST_HANDLERS = {
  Init: async ({ requestId }) => {
    await handleInitRequest(requestId);
  },

  Export: async ({ requestId }) => {
    if (backend === "memory+blob" && db && cachedSqlite3) {
      await exportToBlob(cachedSqlite3, db);
    }
    replyOk(requestId);
  },

  Restore: async ({ request, requestId }) => {
    if (!requireDb(requestId, "Restore requires initialized database")) {
      return;
    }

    const snapshotJson = request?.snapshot_json;
    if (typeof snapshotJson !== "string" || snapshotJson.trim().length === 0) {
      replyError(requestId, "Restore requires snapshot_json");
      return;
    }

    try {
      restoreFromSnapshot(snapshotJson);
      replyOk(requestId);
    } catch (error) {
      replyError(requestId, `Restore failed: ${formatError(error)}`);
    }
  },

  Exec: async ({ request, requestId }) => {
    if (!requireDb(requestId)) {
      return;
    }
    withPreparedStmt(request?.sql, request?.params, (stmt) => {
      stmt.step();
    });
    replyOk(requestId);
  },

  Query: async ({ request, requestId }) => {
    if (!requireDb(requestId)) {
      return;
    }

    const rows = withPreparedStmt(request?.sql, request?.params, (stmt) => {
      const result = [];
      const colCount = stmt.columnCount;
      const colNames = [];
      for (let i = 0; i < colCount; i++) {
        colNames.push(stmt.getColumnName(i));
      }

      while (stmt.step()) {
        const row = {};
        for (let i = 0; i < colCount; i++) {
          row[colNames[i]] = stmt.get(i);
        }
        result.push(row);
      }
      return result;
    });

    replyRows(requestId, rows);
  },

  Batch: async ({ request, requestId }) => {
    if (!requireDb(requestId)) {
      return;
    }

    const statements = request?.statements;
    if (!statements || !Array.isArray(statements)) {
      replyError(requestId, "Batch requires statements array");
      return;
    }

    try {
      runTransaction(() => {
        for (const [sql, batchParams] of statements) {
          withPreparedStmt(sql, batchParams, (stmt) => {
            stmt.step();
          });
        }
      });
      replyOk(requestId);
    } catch (error) {
      replyError(requestId, `Batch failed: ${formatError(error)}`);
    }
  }
};

self.onmessage = async function(event) {
  const { request, request_id = 0, api_version } = event.data;
  const requestId = normalizeRequestId(request_id);

  if (typeof api_version === "number" && api_version < self.DB_WORKER_MIN_CLIENT_API_VERSION) {
    replyError(
      requestId,
      `Client API version ${api_version} is too old (min ${self.DB_WORKER_MIN_CLIENT_API_VERSION})`
    );
    return;
  }

  // serde(tag = "type") sends { type: "Exec", ... }
  // Wrapper sends: { request: { type: "Exec", ... }, request_id: N }
  const reqType = request?.type || (typeof request === 'string' ? request : null);
  if (!reqType) {
    replyError(requestId, `Unknown request type: ${reqType}`);
    return;
  }

  // Keep explicit Restore branch for contract readability + dedicated errors.
  if (reqType === "Restore") {
    await REQUEST_HANDLERS.Restore({ request, requestId });
    return;
  }

  const handler = REQUEST_HANDLERS[reqType];
  if (!handler) {
    replyError(requestId, `Unknown request type: ${reqType}`);
    return;
  }

  try {
    await handler({ request, requestId });
  } catch (err) {
    replyError(requestId, formatError(err));
  }
};
