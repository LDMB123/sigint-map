/**
 * Database utility functions for import scripts
 * Provides a simple API for working with SQLite in Node.js scripts
 */

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let db: Database.Database | null = null;

/**
 * Initializes the SQLite database connection
 * Reads schema from src/lib/db/schema.sql and applies it
 */
export function initializeDb(): void {
  const dbPath = join(process.cwd(), "data", "dmb-almanac.db");
  db = new Database(dbPath);

  // Enable optimizations
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("cache_size = -64000");
  db.pragma("synchronous = NORMAL");

  // Read and execute schema
  const schemaPath = join(process.cwd(), "src", "lib", "db", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Execute entire schema at once (SQLite can handle multiple statements)
  db.exec(schema);

  console.log("Database initialized successfully");
}

/**
 * Gets the database instance
 * Must call initializeDb() first
 */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDb() first.");
  }
  return db;
}

/**
 * Closes the database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Executes a SQL statement without returning results
 */
export function run(sql: string, params?: unknown[]): void {
  if (!db) {
    throw new Error("Database not initialized");
  }

  if (params) {
    db.prepare(sql).run(params);
  } else {
    db.exec(sql);
  }
}

/**
 * Inserts multiple rows into a table
 * Uses a transaction for better performance
 */
export function insertMany(table: string, rows: Record<string, unknown>[]): void {
  if (!db) {
    throw new Error("Database not initialized");
  }

  if (rows.length === 0) return;

  // Get column names from first row
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

  const stmt = db.prepare(sql);
  const insertAll = db.transaction((items: Record<string, unknown>[]) => {
    for (const item of items) {
      const values = columns.map((col) => item[col]);
      stmt.run(values);
    }
  });

  insertAll(rows);
}

/**
 * Inserts multiple rows into a table, ignoring conflicts
 * Uses a transaction for better performance
 */
export function insertManyIgnore(table: string, rows: Record<string, unknown>[]): void {
  if (!db) {
    throw new Error("Database not initialized");
  }

  if (rows.length === 0) return;

  // Get column names from first row
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

  const stmt = db.prepare(sql);
  const insertAll = db.transaction((items: Record<string, unknown>[]) => {
    for (const item of items) {
      const values = columns.map((col) => item[col]);
      stmt.run(values);
    }
  });

  insertAll(rows);
}
