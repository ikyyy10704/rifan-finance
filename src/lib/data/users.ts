import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";

export async function listUsers() {
  await requireAdmin();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      active: users.active,
      avatar: users.avatar,
      totpSecret: users.totpSecret,
    })
    .from(users)
    .orderBy(asc(users.id));
  return rows.map(({ totpSecret, ...u }) => ({ ...u, totpEnabled: !!totpSecret })); // rahasia 2FA tidak dikirim ke halaman
}
