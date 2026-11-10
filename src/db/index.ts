import "server-only";
import { createDb, type Db } from "./client";

const globalForDb = globalThis as unknown as { rifanDb?: Db };

// Simpan satu koneksi di globalThis supaya hot reload di dev tidak membuka koneksi baru terus.
export const db = globalForDb.rifanDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.rifanDb = db;
