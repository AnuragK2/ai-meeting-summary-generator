import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../../config/env.js";
import { MIGRATION_SQL } from "./migrations.js";

export type AppDatabase = Database.Database;

/**
 * Open a SQLite connection, ensure the parent directory exists for file-backed
 * databases, enable WAL + foreign keys, and run bootstrap migrations.
 *
 * Tests call this with `":memory:"` to get a fully isolated DB per suite.
 */
export function createDatabase(dbPath: string = config.dbPath): AppDatabase {
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(MIGRATION_SQL);
  return db;
}
