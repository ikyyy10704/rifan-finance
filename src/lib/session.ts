import "server-only";
import { and, eq, gt, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "rf_session";
const SESSION_DAYS = 30;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export type SessionUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "user";
  avatar: string | null;
  totpEnabled: boolean;
};

// Null jika cookie tidak ada, sesi kedaluwarsa, sudah dihapus, atau akunnya dinonaktifkan.
// cache(): layout dan halaman dalam satu request cukup sekali query.
export const readSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Pengecekan sesi bergantung pada waktu sekarang dan data di database, jadi harus menunggu
  // request sungguhan (bukan prerender/prefetch). Semua data per pengguna lewat sini.
  await connection();

  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      avatar: users.avatar,
      totpSecret: users.totpSecret,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true)));
  if (!row) return null;
  const { totpSecret, ...user } = row;
  return { ...user, totpEnabled: !!totpSecret };
});

/** Hapus semua sesi milik user, kecuali sesi browser yang sedang dipakai (jika ada). */
export async function deleteUserSessions(userId: number) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const current = token ? hashToken(token) : "";
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, current)));
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}
