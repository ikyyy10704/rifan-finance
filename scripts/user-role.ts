// Ubah peran akun yang sudah ada.
// Contoh: npm run user:role -- --username ikyyyl --role admin
import { eq } from "drizzle-orm";
import { parseArgs } from "node:util";
import { createDb } from "../src/db/client";
import { users } from "../src/db/schema";

const { values } = parseArgs({ options: { username: { type: "string" }, role: { type: "string" } } });
const username = values.username?.trim().toLowerCase();
const role = values.role;

if (!username || (role !== "admin" && role !== "user")) {
  console.error("Pakai: npm run user:role -- --username <username> --role admin|user");
  process.exit(1);
}

const db = createDb(undefined, 1);
const res = await db.update(users).set({ role }).where(eq(users.username, username)).returning({ id: users.id });
await db.$client.end();
if (res.length === 0) {
  console.error(`Username "${username}" tidak ditemukan.`);
  process.exit(1);
}
console.log(`Peran ${username} sekarang: ${role}`);
