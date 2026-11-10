"use server";

import { hash, verify } from "@node-rs/argon2";
import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { loginAttempts, users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/session";
import { clearChallenge, createChallenge, readChallenge, verifyUserTotp } from "@/lib/totp";
import { loginSchema } from "@/lib/validators";

export type LoginState = { error?: string; username?: string; step?: "password" | "code" };

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

// Hash pengganti agar waktu respons sama saat username tidak ditemukan.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hash("rifan-finance-dummy-password"));

/** Pesan blokir bila sudah 5 kali gagal dalam 15 menit terakhir (password atau kode 2FA). */
function lockMessage(username: string): string | null {
  const now = Date.now();
  const failures = db
    .select({ createdAt: loginAttempts.createdAt })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.username, username),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, new Date(now - WINDOW_MS)),
      ),
    )
    .orderBy(loginAttempts.createdAt)
    .all();
  if (failures.length < MAX_FAILURES) return null;
  const unlockAt = failures[failures.length - MAX_FAILURES].createdAt.getTime() + WINDOW_MS;
  const minutes = Math.max(1, Math.ceil((unlockAt - now) / 60000));
  return `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`;
}

async function recordAttempt(username: string, success: boolean) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  db.insert(loginAttempts).values({ username, ip, success, createdAt: new Date() }).run();
}

/** Satu action untuk tiga tombol di halaman login: password, kode 2FA, dan batal ke tahap password. */
export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  const stage = formData.get("stage");
  if (stage === "code") return verifyLoginCode(prev, formData);
  if (stage === "cancel") {
    await clearChallenge();
    return { step: "password", username: prev.username };
  }

  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  const typed = String(formData.get("username") ?? "").trim();
  if (!parsed.success) return { error: parsed.error.issues[0].message, username: typed };

  const { username, password } = parsed.data;
  const locked = lockMessage(username);
  if (locked) return { error: locked, username: typed };

  const user = db.select().from(users).where(eq(users.username, username)).get();
  const ok = user
    ? await verify(user.passwordHash, password)
    : (await verify(await getDummyHash(), password), false);
  const success = ok && !!user?.active;
  await recordAttempt(username, success);

  if (!success) {
    // Pesan sama untuk username salah, password salah, atau akun nonaktif.
    return { error: "Username atau password salah.", username: typed };
  }

  if (user!.totpSecret) {
    await createChallenge(user!.id);
    return { step: "code", username: typed };
  }

  await createSession(user!.id);
  redirect("/dashboard");
}

async function verifyLoginCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  const challenge = await readChallenge();
  if (!challenge || !challenge.active) {
    await clearChallenge();
    return { step: "password", username: prev.username, error: "Waktu memasukkan kode habis. Masuk lagi dengan password." };
  }

  const locked = lockMessage(challenge.username);
  if (locked) {
    await clearChallenge();
    return { step: "password", username: prev.username, error: locked };
  }

  const ok = verifyUserTotp(challenge.userId, String(formData.get("code") ?? ""));
  await recordAttempt(challenge.username, ok);
  if (!ok) {
    return { step: "code", username: prev.username, error: "Kode salah atau sudah kedaluwarsa. Cek kode terbaru di aplikasi authenticator." };
  }

  await clearChallenge();
  await createSession(challenge.userId);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
