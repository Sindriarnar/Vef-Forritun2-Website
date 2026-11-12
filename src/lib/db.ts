import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Shared SQLite connection, used both by the Next.js server and by the
 * scraper (`npm run scrape`). Never import this from a client component.
 *
 * The file location comes from DATABASE_PATH (see .env.example).
 */

type DB = Database.Database;

// Keep one connection per process. In `next dev` modules are reloaded on
// every change, so the connection is stashed on globalThis to avoid
// opening a new one on each hot reload.
const globalForDb = globalThis as unknown as { __hvadDb?: DB };

export function getDb(): DB {
  if (!globalForDb.__hvadDb) {
    globalForDb.__hvadDb = openDb();
  }
  return globalForDb.__hvadDb;
}

function openDb(): DB {
  // The location is configurable at runtime, so tell Turbopack not to try
  // to trace (and bundle) whatever folder it might point to.
  const dbPath = path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.DATABASE_PATH ?? "./data/hvad.db",
  );
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  // WAL lets the website read while the scraper is writing.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  migrate(db);
  return db;
}

/** Runs db/schema.sql. Every statement in it is idempotent. */
export function migrate(db: DB) {
  addMissingColumns(db);
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  db.exec(fs.readFileSync(schemaPath, "utf8"));
}

/**
 * Columns added to db/schema.sql after the first version. CREATE TABLE IF
 * NOT EXISTS skips tables that already exist, so databases created before
 * get them here (before the views that use them are re-created).
 */
const ADDED_COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: "items", column: "min_age", definition: "INTEGER" },
  { table: "items", column: "audience", definition: "TEXT CHECK (audience IN ('born', 'fjolskylda'))" },
  { table: "items", column: "version", definition: "TEXT" },
];

function addMissingColumns(db: DB) {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    // No columns = the table doesn't exist yet; schema.sql creates it with everything.
    if (columns.length && !columns.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
}

/** ISO-8601 UTC without milliseconds, the format used in every table. */
export function toIso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
