import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { seedDefaultCategories } from "@/db/defaults";
import { loginAttempts, users } from "@/db/schema";
import { emailAllowed, finishGoogleLogin, OAUTH_COOKIE, OAUTH_COOKIE_PATH } from "@/lib/google";
import { createSession } from "@/lib/session";
import { createChallenge } from "@/lib/totp";

const fail = (reason: string) => redirect(`/login?google=${reason}`);

const sameText = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Username dari bagian depan email, disesuaikan aturan username, ditambah angka bila sudah dipakai. */
async function freeUsername(email: string) {
  let base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 26);
  if (base.length < 3) base = `user${base}`;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(Math.random() * 9000) + 1000}`;
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate));
    if (!taken) return candidate;
  }
  return `user${Date.now().toString(36)}`;
}

export async function GET(request: NextRequest) {
  const store = await cookies();
  const raw = store.get(OAUTH_COOKIE)?.value;
  store.delete({ name: OAUTH_COOKIE, path: OAUTH_COOKIE_PATH });

  const params = request.nextUrl.searchParams;
  if (params.get("error")) fail("batal"); // pengguna menutup atau menolak di halaman Google

  let saved: { state: string; nonce: string; verifier: string };
  try {
    saved = JSON.parse(raw ?? "");
  } catch {
    return fail("kedaluwarsa");
  }
  const state = params.get("state") ?? "";
  const code = params.get("code") ?? "";
  if (!code || !sameText(state, saved.state)) fail("kedaluwarsa");

  const profile = await finishGoogleLogin(request.nextUrl.origin, code, saved);
  if (!profile) fail("gagal");
  const { sub, email, name } = profile!;

  const [existing] = await db
    .select({ id: users.id, username: users.username, active: users.active, totp: users.totpSecret, setupStep: users.setupStep })
    .from(users)
    .where(eq(users.googleSub, sub));

  if (existing) {
    if (!existing.active) fail("nonaktif");
    await db.update(users).set({ email }).where(eq(users.id, existing.id));
    await db.insert(loginAttempts).values({ username: existing.username, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, success: true, createdAt: new Date() });
    // Akun yang memakai 2FA tetap diminta kode, lewat tahap kedua di halaman login.
    if (existing.totp) {
      await createChallenge(existing.id);
      redirect("/login?langkah=kode");
    }
    await createSession(existing.id);
    redirect(existing.setupStep === null ? "/dashboard" : "/mulai");
  }

  if (!emailAllowed(email)) fail("tidak-diizinkan");

  // Akun baru: langsung dibuat, lalu pengguna melengkapi profil di /mulai.
  const username = await freeUsername(email);
  const [created] = await db
    .insert(users)
    .values({ username, name: name.slice(0, 60), email, googleSub: sub, passwordHash: null, role: "user", setupStep: 1 })
    .onConflictDoNothing({ target: users.googleSub }) // dua tab login bersamaan: cukup satu akun
    .returning({ id: users.id });
  const userId = created?.id ?? (await db.select({ id: users.id }).from(users).where(eq(users.googleSub, sub)))[0].id;
  if (created) await seedDefaultCategories(db, userId);

  await createSession(userId);
  redirect("/mulai");
}
