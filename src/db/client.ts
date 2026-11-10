import { attachDatabasePool } from "@vercel/functions";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { SUPABASE_ROOT_CA } from "./supabase-ca";

// SUM/COUNT di PostgreSQL menghasilkan bigint/numeric yang bawaannya dibaca sebagai string.
// Rupiah di sini selalu bilangan bulat jauh di bawah 2^53, jadi aman dibaca sebagai number.
pg.types.setTypeParser(20, Number); // int8
pg.types.setTypeParser(1700, Number); // numeric

const isLocal = (url: string) => /@(localhost|127\.0\.0\.1)[:/]/.test(url);

// Dipakai bersama oleh aplikasi dan skrip CLI (migrate, user:create).
export function createDb(url = process.env.DATABASE_URL, max = 5) {
  if (!url) throw new Error("DATABASE_URL belum diisi di .env.local (connection string Supabase, Transaction pooler).");
  const pool = new pg.Pool({
    connectionString: url,
    max,
    // Koneksi menganggur ditutup cepat. Di Vercel, server bisa "ditidurkan" di antara permintaan;
    // koneksi yang masih terbuka saat itu menjadi basi dan permintaan berikutnya macet.
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000, // gagal dengan jelas, bukan menunggu tanpa batas
    // Koneksi terenkripsi dengan verifikasi penuh: sertifikat server harus ditandatangani CA Supabase
    // dan cocok dengan nama host. Database lokal (uji) tanpa SSL.
    ssl: isLocal(url) ? false : { ca: SUPABASE_ROOT_CA },
  });
  // Vercel menunggu koneksi menganggur ditutup sebelum menidurkan server (tidak berpengaruh di luar Vercel).
  attachDatabasePool(pool);
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createDb>;
type Executor = Pick<Db, "execute">;

/** Query SQL mentah: semua baris. Alias kolom camelCase harus diberi tanda kutip ganda. */
export async function all<T>(db: Executor, query: SQL): Promise<T[]> {
  return (await db.execute(query)).rows as T[];
}

/** Query SQL mentah: baris pertama atau undefined. */
export async function one<T>(db: Executor, query: SQL): Promise<T | undefined> {
  return (await all<T>(db, query))[0];
}
