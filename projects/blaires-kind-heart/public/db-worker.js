// SQLite Web Worker with tiered storage fallback for Safari.
// Safari 26.2 does NOT support the OPFS synchronous access handle VFS
// that @anthropic-ai/sqlite-wasm requires. This worker tries three backends:
//   1. OPFS VFS (Chrome, future Safari) — best performance
//   2. kvvfs (localStorage bridge) — works everywhere, 5-10MB limit
//   3. In-memory + periodic Blob export to OPFS — unlimited but slower persistence
//
// All messages are DbRequest/DbResponse (defined in Rust, serialized via serde).

import "./runtime-diagnostics.js";

self.__BKH_RUNTIME_DIAGNOSTICS__?.install({
  scope: "db-worker"
});

let db = null;
let backend = 'none';
self.DB_WORKER_API_VERSION = 1;
self.DB_WORKER_MIN_CLIENT_API_VERSION = 1;
const DB_SCHEMA_VERSION = 1;

// Phase 2.3: Prepared statement cache for hot-path queries
// Key: SQL string, Value: compiled statement
// Reduces query latency by 5-10ms per request
const STMT_CACHE = new Map();

// ── Tier 1: OPFS (synchronous access handle VFS) ──
async function tryOpfs(sqlite3) {
  // Safari 26.2 does NOT support FileSystemSyncAccessHandle
  // Skip OPFS detection entirely to avoid timeout
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    console.log('[db-worker] Safari detected, skipping OPFS (not supported)');
    return null;
  }

  if (!sqlite3.oo1.OpfsDb) return null;
  try {
    const opfs = new sqlite3.oo1.OpfsDb('/blaires-kind-heart.sqlite3', 'cw');
    console.log('[db-worker] OPFS backend opened');
    return opfs;
  } catch (_) {
    console.warn('[db-worker] OPFS backend unavailable');
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
    console.log('[db-worker] kvvfs backend opened');
    return kvDb;
  } catch (_) {
    console.warn('[db-worker] kvvfs backend unavailable');
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
      const rc = sqlite3.capi.sqlite3_deserialize(
        memDb.pointer, 'main', bytes, bytes.length, bytes.length,
        0 // SQLITE_DESERIALIZE_FREEONCLOSE is 0 for copy mode
      );
      if (rc === 0) {
        console.log(`[db-worker] Restored ${(bytes.length / 1024).toFixed(1)}KB from OPFS blob`);
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

  // Phase 3: Removed periodic export — rely on pagehide-triggered Export request only
  // This reduces OPFS write churn while maintaining data safety (exports on navigation)
  console.log('[db-worker] Memory + blob backend opened (pagehide-only export)');
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
    console.warn('[db-worker] Blob export failed:', err);
  }
}

// ── Schema ──
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS kind_acts (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    hearts_earned INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    day_key TEXT NOT NULL
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
    completed_at INTEGER
  );

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

  CREATE TABLE IF NOT EXISTS skill_mastery (
    skill_type TEXT PRIMARY KEY,
    total_count INTEGER NOT NULL DEFAULT 0,
    week_count INTEGER NOT NULL DEFAULT 0,
    mastery_level INTEGER NOT NULL DEFAULT 0,
    last_practiced TEXT NOT NULL,
    focus_priority INTEGER NOT NULL DEFAULT 0
  );

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

  CREATE TABLE IF NOT EXISTS weekly_themes (
    id TEXT PRIMARY KEY,
    week_key TEXT NOT NULL UNIQUE,
    skill_category TEXT NOT NULL,
    theme_name TEXT NOT NULL,
    quest_chain_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_themes_week ON weekly_themes(week_key);
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

function restoreFromSnapshot(snapshotJson) {
  const parsed = JSON.parse(snapshotJson);
  if (!parsed || parsed.export_format_version !== 1) {
    throw new Error("Invalid snapshot: export_format_version must be 1");
  }

  const snapshotSchemaVersion = Number(parsed.schema_version ?? 0);
  if (Number.isFinite(snapshotSchemaVersion) && snapshotSchemaVersion > DB_SCHEMA_VERSION) {
    throw new Error(
      `Snapshot schema version ${snapshotSchemaVersion} is newer than worker schema ${DB_SCHEMA_VERSION}`
    );
  }

  const tables = parsed.tables ?? {};
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
    "weekly_insights",
    "reflection_prompts",
    "badges",
    "companion_skins",
    "gardens",
    "quest_chains",
    "weekly_themes"
  ];

  db.exec("BEGIN TRANSACTION");
  try {
    for (const tableName of restoreTables) {
      const rows = Array.isArray(tables[tableName]) ? tables[tableName] : [];
      if (tableName === "settings") {
        db.exec("DELETE FROM settings WHERE key != 'parent_pin'");
      } else {
        db.exec(`DELETE FROM ${tableName}`);
      }

      for (const row of rows) {
        const entries = Object.entries(row ?? {});
        if (entries.length === 0) {
          continue;
        }
        const columns = entries.map(([column]) => column).join(", ");
        const placeholders = entries.map((_, index) => `?${index + 1}`).join(", ");
        const values = entries.map(([, value]) =>
          value === null || value === undefined ? null : value
        );

        db.exec(
          `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
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

    db.exec(SCHEMA);

    const currentSchemaVersion = readSchemaVersion(db);
    if (currentSchemaVersion > DB_SCHEMA_VERSION) {
      throw new Error(
        `Database schema version ${currentSchemaVersion} is newer than worker schema ${DB_SCHEMA_VERSION}`
      );
    }

    // Run migrations for existing tables
    try {
      db.exec(`
        ALTER TABLE kind_acts ADD COLUMN reflection_type TEXT DEFAULT NULL;
      `);
    } catch (_) { /* Column already exists */ }

    try {
      db.exec(`
        ALTER TABLE kind_acts ADD COLUMN bonus_context TEXT DEFAULT NULL;
      `);
    } catch (_) { /* Column already exists */ }

    // Add emotion_selected column for emotion vocabulary check-ins
    try {
      db.exec(`
        ALTER TABLE kind_acts ADD COLUMN emotion_selected TEXT DEFAULT NULL;
      `);
    } catch (_) { /* Column already exists */ }

    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_acts_category ON kind_acts(category);
      `);
    } catch (_) { /* Index already exists */ }

    // Add combo_day column for daily combo detection
    try {
      db.exec(`
        ALTER TABLE kind_acts ADD COLUMN combo_day INTEGER DEFAULT 0;
      `);
    } catch (_) { /* Column already exists */ }

    // Add unlock_tier column for story progression
    try {
      db.exec(`
        ALTER TABLE stories_progress ADD COLUMN unlock_tier INTEGER DEFAULT 0;
      `);
    } catch (_) { /* Column already exists */ }

    // Add skill_breakdown column for parent insights caching
    try {
      db.exec(`
        ALTER TABLE weekly_insights ADD COLUMN skill_breakdown TEXT DEFAULT NULL;
      `);
    } catch (_) { /* Column already exists */ }

    // Seed skill_mastery table if empty
    const skillCheck = db.exec('SELECT COUNT(*) as c FROM skill_mastery', { returnValue: 'resultRows' });
    if (skillCheck[0] && skillCheck[0][0] === 0) {
      const skills = ['hug', 'nice-words', 'sharing', 'helping', 'love', 'unicorn'];
      const today = new Date().toISOString().split('T')[0];
      db.exec('BEGIN');
      for (const skill of skills) {
        db.exec(
          `INSERT INTO skill_mastery (skill_type, total_count, week_count, mastery_level, last_practiced, focus_priority)
           VALUES (?, 0, 0, 0, ?, 50)`,
          { bind: [skill, today] }
        );
      }
      db.exec('COMMIT');
      console.log('[db-worker] Seeded skill_mastery with 6 categories');
    }

    // Seed reflection_prompts if empty
    const promptCheck = db.exec('SELECT COUNT(*) as c FROM reflection_prompts', { returnValue: 'resultRows' });
    if (promptCheck[0] && promptCheck[0][0] === 0) {
      const prompts = [
        // HUG category (3 variants)
        ['hug-1', 'hug', 'How did your hug make them feel?', '🤗', JSON.stringify(['Happy & loved 💝', 'Safe & cozy 🫂', 'Warm inside 😊'])],
        ['hug-2', 'hug', 'What made this the perfect time for a hug?', '🤗', JSON.stringify(['They needed comfort 🥹', 'To show I care 💖', 'Just felt right ✨'])],
        ['hug-3', 'hug', 'Did they hug you back?', '🤗', JSON.stringify(['Yes, tight hug! 🫂', 'Yes, gentle hug 🤗', 'Not yet, maybe next time 💝'])],

        // NICE WORDS category (3 variants)
        ['nice-words-1', 'nice-words', 'What nice thing did you say?', '💬', JSON.stringify(['You\'re awesome! 🌟', 'I like you! 💕', 'Great job! 👏'])],
        ['nice-words-2', 'nice-words', 'How did their face change?', '💬', JSON.stringify(['Big smile! 😄', 'Eyes sparkled ✨', 'Looked surprised 😮'])],
        ['nice-words-3', 'nice-words', 'Why did you say something kind?', '💬', JSON.stringify(['Wanted to help 🤝', 'They looked sad 😢', 'Felt like it 💝'])],

        // SHARING category (3 variants)
        ['sharing-1', 'sharing', 'Was it hard to share?', '🤝', JSON.stringify(['A little bit 😅', 'Not really 😊', 'Very hard but I did it! 💪'])],
        ['sharing-2', 'sharing', 'What did you share?', '🤝', JSON.stringify(['My toy 🧸', 'My snack 🍎', 'My time 🕐'])],
        ['sharing-3', 'sharing', 'How did they say thank you?', '🤝', JSON.stringify(['Big thank you! 🙏', 'Gave me a hug 🤗', 'Smiled at me 😊'])],

        // HELPING category (3 variants)
        ['helping-1', 'helping', 'What did you help with?', '🆘', JSON.stringify(['Cleaning up 🧹', 'Finding something 🔍', 'Carrying things 📦'])],
        ['helping-2', 'helping', 'Did you notice they needed help?', '🆘', JSON.stringify(['Yes, I saw! 👀', 'They asked me 🗣️', 'Mom told me 👩'])],
        ['helping-3', 'helping', 'How did helping make YOU feel?', '🆘', JSON.stringify(['Proud of myself 😌', 'Happy inside 😊', 'Like a superhero 🦸'])],

        // LOVE category (3 variants)
        ['love-1', 'love', 'Who did you show love to?', '❤️', JSON.stringify(['Family member 👨‍👩‍👧', 'My friend 👫', 'My pet 🐕'])],
        ['love-2', 'love', 'How did you show your love?', '❤️', JSON.stringify(['Big hug 🤗', 'Drew a picture 🎨', 'Spent time together ⏰'])],
        ['love-3', 'love', 'Why is loving others important?', '❤️', JSON.stringify(['Makes them happy 😊', 'Shows I care 💝', 'Feels good 🫶'])],

        // UNICORN KINDNESS category (3 variants)
        ['unicorn-1', 'unicorn', 'What made this extra magical?', '🦄', JSON.stringify(['Super creative! 🎨', 'Big surprise! 🎁', 'Did something new ✨'])],
        ['unicorn-2', 'unicorn', 'Was this a surprise kindness?', '🦄', JSON.stringify(['Yes, surprise! 🎉', 'Planned it 📝', 'Just happened 💫'])],
        ['unicorn-3', 'unicorn', 'How creative was your kindness?', '🦄', JSON.stringify(['Very creative! 🌈', 'Pretty creative ✨', 'Simple but special 💖'])]
      ];
      db.exec('BEGIN');
      for (const [id, cat, text, emoji, opts] of prompts) {
        db.exec(
          `INSERT INTO reflection_prompts (id, category, prompt_text, emoji, response_options)
           VALUES (?, ?, ?, ?, ?)`,
          { bind: [id, cat, text, emoji, opts] }
        );
      }
      db.exec('COMMIT');
      console.log('[db-worker] Seeded reflection_prompts with templates');
    }

    writeSchemaVersion(db, DB_SCHEMA_VERSION);

    console.log(`[db-worker] Ready (backend: ${backend})`);
    return true;
  } catch (err) {
    console.error('[db-worker] Init failed:', err);
    return false;
  }
}

// ── Message handler ──
self.onmessage = async function(event) {
  const { request, request_id } = event.data;

  // Handle Init — serde(tag = "type") sends { type: "Init" } or wrapped { request: { type: "Init" } }
  const reqType = request?.type || (typeof request === 'string' ? request : null);
  if (reqType === 'Init') {
    const ok = await initDb();
    if (ok) {
      self.postMessage({
        type: 'Ok', request_id: request_id || 0
      });
    } else {
      self.postMessage({
        type: 'Error',
        request_id: request_id || 0,
        message: 'Database initialization failed - all storage backends unavailable'
      });
    }
    return;
  }

  // Export request (for manual flush before tab close)
  if (reqType === 'Export') {
    if (backend === 'memory+blob' && db) {
      const { default: initSqlite } = await import('./sqlite/sqlite3.js');
      const sqlite3 = await initSqlite();
      await exportToBlob(sqlite3, db);
    }
    self.postMessage({ type: 'Ok', request_id: request_id || 0 });
    return;
  }

  if (reqType === "Restore") {
    const snapshotJson = request?.snapshot_json;
    if (typeof snapshotJson !== "string" || snapshotJson.trim().length === 0) {
      self.postMessage({
        type: "Error",
        request_id: request_id || 0,
        message: "Restore requires snapshot_json"
      });
      return;
    }

    try {
      restoreFromSnapshot(snapshotJson);
      self.postMessage({ type: "Ok", request_id: request_id || 0 });
    } catch (error) {
      self.postMessage({
        type: "Error",
        request_id: request_id || 0,
        message: `Restore failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    return;
  }

  if (!db) {
    self.postMessage({
      type: 'Error', request_id: request_id || 0, message: 'DB not initialized'
    });
    return;
  }

  // Phase 2.3: Get or create cached prepared statement
  function getOrPrepare(db, sql) {
    if (!STMT_CACHE.has(sql)) {
      STMT_CACHE.set(sql, db.prepare(sql));
    }
    return STMT_CACHE.get(sql);
  }

  // serde(tag = "type") sends: { type: "Exec", sql: "...", params: [...] }
  // The wrapper send_request puts it in: { request: { type: "Exec", ... }, request_id: N }
  // We already extracted reqType above. Now get sql/params from request directly.
  const sql = request?.sql;
  const params = request?.params;

  try {
    // Exec (INSERT, UPDATE, DELETE)
    if (reqType === 'Exec') {
      const stmt = getOrPrepare(db, sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      stmt.step();
      stmt.reset(); // Reset for reuse, don't finalize cached statements
      self.postMessage({ type: 'Ok', request_id });
      return;
    }

    // Query (SELECT)
    if (reqType === 'Query') {
      const rows = [];
      const stmt = getOrPrepare(db, sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      const colCount = stmt.columnCount;
      while (stmt.step()) {
        const row = {};
        for (let i = 0; i < colCount; i++) {
          row[stmt.getColumnName(i)] = stmt.get(i);
        }
        rows.push(row);
      }
      stmt.reset(); // Reset for reuse, don't finalize cached statements
      self.postMessage({ type: 'Rows', request_id, data: rows });
      return;
    }

    // Batch (multiple Exec statements in a transaction)
    if (reqType === 'Batch') {
      const statements = request?.statements;
      if (!statements || !Array.isArray(statements)) {
        self.postMessage({
          type: 'Error',
          request_id,
          message: 'Batch requires statements array'
        });
        return;
      }

      // Execute all statements in a transaction
      db.run('BEGIN TRANSACTION');
      try {
        for (const [sql, params] of statements) {
          const stmt = getOrPrepare(db, sql);
          if (params && params.length > 0) {
            stmt.bind(params);
          }
          stmt.step();
          stmt.reset(); // Reset for reuse, don't finalize cached statements
        }
        db.run('COMMIT');
        self.postMessage({ type: 'Ok', request_id });
      } catch (err) {
        db.run('ROLLBACK');
        self.postMessage({
          type: 'Error',
          request_id,
          message: `Batch failed: ${err.message}`
        });
      }
      return;
    }

    // Batch (multiple statements in transaction) - duplicate handler, should be removed
    if (reqType === 'Batch') {
      const statements = request?.statements;
      db.exec('BEGIN');
      try {
        for (const [batchSql, batchParams] of statements) {
          const stmt = getOrPrepare(db, batchSql);
          if (batchParams && batchParams.length > 0) stmt.bind(batchParams);
          stmt.step();
          stmt.reset(); // Reset for reuse, don't finalize cached statements
        }
        db.exec('COMMIT');
      } catch (batchErr) {
        db.exec('ROLLBACK');
        throw batchErr;
      }
      self.postMessage({ type: 'Ok', request_id });
      return;
    }

    self.postMessage({
      type: 'Error', request_id, message: `Unknown request type: ${reqType}`
    });
  } catch (err) {
    self.postMessage({
      type: 'Error', request_id, message: String(err)
    });
  }
};
