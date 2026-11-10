// Salin semua data dari database SQLite lama (data/keuangan.db) ke PostgreSQL Supabase.
// Pakai: npm run db:migrate   (buat tabel dulu)
//        npm run db:copy-sqlite [-- --from data/keuangan.db]
// Aman: berhenti bila tabel tujuan sudah berisi data, dan semuanya dalam satu transaksi.
import Database from "better-sqlite3";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import postgres from "postgres";

const { values } = parseArgs({ options: { from: { type: "string", default: "data/keuangan.db" } } });
const file = values.from!;
if (!existsSync(file)) {
  console.error(`File ${file} tidak ditemukan.`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi di .env.local.");
  process.exit(1);
}

// Urutan mengikuti foreign key: induk dulu.
const TABLES: { name: string; bools?: string[]; ms?: string[] }[] = [
  { name: "users", bools: ["active"] },
  { name: "sessions", ms: ["expires_at"] },
  { name: "login_attempts", bools: ["success"], ms: ["created_at"] },
  { name: "login_challenges", ms: ["expires_at"] },
  { name: "accounts", bools: ["archived"] },
  { name: "categories", bools: ["archived"] },
  { name: "transactions" },
  { name: "import_batches" },
  { name: "import_rows" },
  { name: "notifications" },
  { name: "push_subscriptions" },
];
const AVATAR_DIR = join("data", "avatars");

async function main() {
  const lite = new Database(file, { readonly: true, fileMustExist: true });
  const pg = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const liteTables = new Set((lite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((t) => t.name));

  try {
    for (const t of TABLES) {
      const [{ n }] = await pg`SELECT COUNT(*)::int AS n FROM ${pg(t.name)}`;
      if (n > 0) throw new Error(`Tabel ${t.name} di Supabase sudah berisi ${n} baris. Penyalinan dibatalkan supaya tidak dobel.`);
    }

    await pg.begin(async (tx) => {
      for (const t of TABLES) {
        if (!liteTables.has(t.name)) continue;
        const rows = lite.prepare(`SELECT * FROM "${t.name}"`).all() as Record<string, unknown>[];
        if (rows.length === 0) {
          console.log(`${t.name}: kosong`);
          continue;
        }
        for (const r of rows) {
          for (const c of t.bools ?? []) r[c] = !!r[c];
          for (const c of t.ms ?? []) r[c] = new Date(Number(r[c]));
          if (t.name === "users") {
            // Foto profil pindah dari file ke kolom avatar_data.
            const name = r.avatar as string | null;
            const path = name && /^\d+-[a-f0-9]{16}\.webp$/.test(name) ? join(AVATAR_DIR, name) : null;
            if (path && existsSync(path)) {
              r.avatar_data = readFileSync(path);
              r.avatar = randomBytes(8).toString("hex");
            } else {
              r.avatar = null;
              r.avatar_data = null;
            }
          }
        }
        // Kirim per 500 baris supaya tidak melewati batas parameter PostgreSQL.
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          await tx`INSERT INTO ${tx(t.name)} ${tx(chunk, Object.keys(chunk[0]))}`;
        }
        // id dibawa apa adanya, jadi urutan id berikutnya harus dimajukan.
        const hasSerial = await tx`SELECT pg_get_serial_sequence(${t.name}, 'id') AS s`;
        if (hasSerial[0].s) {
          await tx`SELECT setval(pg_get_serial_sequence(${t.name}, 'id'), (SELECT MAX(id) FROM ${tx(t.name)}))`;
        }
        console.log(`${t.name}: ${rows.length} baris`);
      }
    });
    console.log(`Selesai. Semua data sudah disalin ke ${new URL(process.env.DATABASE_URL!).host}.`);
  } finally {
    lite.close();
    await pg.end();
  }
}

main().catch((e) => {
  console.error("Gagal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
