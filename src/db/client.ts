import { drizzle } from "drizzle-orm/postgres-js";
import type { SQL } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

// Dipakai bersama oleh aplikasi dan skrip CLI (migrate, user:create).
export function createDb(url = process.env.DATABASE_URL, max = 5) {
  if (!url) throw new Error("DATABASE_URL belum diisi di .env.local (connection string Supabase, Transaction pooler).");
  const client = postgres(url, {
    prepare: false, // Transaction pooler Supabase tidak mendukung prepared statement
    max,
    idle_timeout: 20,
    // SUM/COUNT di PostgreSQL menghasilkan bigint/numeric (dibaca sebagai string). Rupiah di sini selalu bilangan bulat
    // jauh di bawah 2^53, jadi aman dibaca sebagai number.
    types: { int8: { to: 20, from: [20, 1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) } },
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
type Executor = Pick<Db, "execute">;

/** Query SQL mentah: semua baris. Alias kolom camelCase harus diberi tanda kutip ganda. */
export async function all<T>(db: Executor, query: SQL): Promise<T[]> {
  return (await db.execute(query)) as unknown as T[];
}

/** Query SQL mentah: baris pertama atau undefined. */
export async function one<T>(db: Executor, query: SQL): Promise<T | undefined> {
  return (await all<T>(db, query))[0];
}
