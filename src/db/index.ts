import "server-only";
import { createDb, type Db } from "./client";

const globalForDb = globalThis as unknown as { rifanDb?: Db };

// Koneksi baru dibuat saat query pertama, bukan saat file di-import. `next build` memuat semua route
// untuk mengumpulkan konfigurasinya; tanpa ini build gagal bila DATABASE_URL belum tersedia saat build.
// Di dev, satu koneksi disimpan di globalThis supaya hot reload tidak membuka koneksi baru terus.
function instance(): Db {
  if (globalForDb.rifanDb) return globalForDb.rifanDb;
  const db = createDb();
  globalForDb.rifanDb = db;
  return db;
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = instance();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
