import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { db } from "@/db";
import { loginChallenges, users } from "@/db/schema";
import { hashToken } from "./session";

// Kode 6 digit, berganti tiap 30 detik (standar Google Authenticator, Authy, Microsoft Authenticator).
const make = (secret: string, label = "") =>
  new TOTP({ issuer: "Rifan Finance", label, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secret) });

export const newTotpSecret = () => new Secret({ size: 20 }).base32;

export async function totpQr(secret: string, username: string) {
  const uri = make(secret, username).toString();
  const svg = await QRCode.toString(uri, { type: "svg", margin: 1, color: { dark: "#073B2E", light: "#FFFFFF" } });
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

/** Nomor langkah waktu bila kode cocok (toleransi ±30 detik), null bila salah. */
export function checkTotp(secret: string, code: string): number | null {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const delta = make(secret).validate({ token: clean, window: 1 });
  if (delta === null) return null;
  return Math.floor(Date.now() / 30000) + delta;
}

/** Cek kode untuk user tertentu dan tandai langkahnya supaya kode yang sama tidak bisa dipakai ulang. */
export function verifyUserTotp(userId: number, code: string): boolean {
  const u = db.select({ secret: users.totpSecret, last: users.totpLastStep }).from(users).where(eq(users.id, userId)).get();
  if (!u?.secret) return false;
  const step = checkTotp(u.secret, code);
  if (step === null || (u.last !== null && step <= u.last)) return false;
  db.update(users).set({ totpLastStep: step }).where(eq(users.id, userId)).run();
  return true;
}

// ---- Tiket login tahap kedua ----
export const CHALLENGE_COOKIE = "rf_2fa";
const CHALLENGE_MINUTES = 5;

export async function createChallenge(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + CHALLENGE_MINUTES * 60 * 1000);
  db.delete(loginChallenges).where(eq(loginChallenges.userId, userId)).run();
  db.insert(loginChallenges).values({ id: hashToken(token), userId, expiresAt }).run();
  (await cookies()).set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/login",
    expires: expiresAt,
  });
}

/** User dari tiket yang masih berlaku, atau null. */
export async function readChallenge() {
  const token = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  return (
    db
      .select({ userId: users.id, username: users.username, active: users.active })
      .from(loginChallenges)
      .innerJoin(users, eq(users.id, loginChallenges.userId))
      .where(and(eq(loginChallenges.id, hashToken(token)), gt(loginChallenges.expiresAt, new Date())))
      .get() ?? null
  );
}

export async function clearChallenge() {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  if (token) db.delete(loginChallenges).where(eq(loginChallenges.id, hashToken(token))).run();
  store.delete({ name: CHALLENGE_COOKIE, path: "/login" });
}
