import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as schema from "./schema";

export function databasePath() {
  const custom = process.env.DATABASE_PATH;
  // turbopackIgnore: path dari env tidak boleh membuat build ikut menyertakan seluruh proyek.
  return custom ? resolve(/*turbopackIgnore: true*/ custom) : join(process.cwd(), "data", "keuangan.db");
}

// Dipakai bersama oleh aplikasi dan skrip CLI (migrate, user:create).
export function createDb(file = databasePath()) {
  mkdirSync(dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;
