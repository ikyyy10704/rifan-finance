import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, databasePath } from "../src/db/client";
import { seedDefaultCategories } from "../src/db/defaults";
import { users } from "../src/db/schema";

const db = createDb();
migrate(db, { migrationsFolder: "drizzle" });

// Akun yang dibuat sebelum ada fitur kategori ikut mendapat kategori bawaan.
for (const u of db.select({ id: users.id, username: users.username }).from(users).all()) {
  const n = seedDefaultCategories(db, u.id);
  if (n) console.log(`${n} kategori bawaan ditambahkan untuk ${u.username}`);
}
console.log(`Migrasi selesai: ${databasePath()}`);
