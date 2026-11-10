import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "../src/db/client";
import { seedDefaultCategories } from "../src/db/defaults";
import { users } from "../src/db/schema";

async function main() {
  const db = createDb(undefined, 1);
  await migrate(db, { migrationsFolder: "drizzle" });

  // Akun yang dibuat sebelum ada fitur kategori ikut mendapat kategori bawaan.
  for (const u of await db.select({ id: users.id, username: users.username }).from(users)) {
    const n = await seedDefaultCategories(db, u.id);
    if (n) console.log(`${n} kategori bawaan ditambahkan untuk ${u.username}`);
  }
  console.log("Migrasi selesai.");
  await db.$client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
