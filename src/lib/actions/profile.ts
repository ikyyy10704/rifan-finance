"use server";

import { hash, verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { deleteAvatarFile, saveAvatar } from "@/lib/avatar";
import { requireUser } from "@/lib/dal";
import { deleteUserSessions } from "@/lib/session";
import { checkTotp, newTotpSecret, totpQr, verifyUserTotp } from "@/lib/totp";

export type ProfileState = { error?: string; ok?: string; savedAt?: number };

const passwordOf = (id: number) => db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, id)).get()!.hash;

// ---- Nama dan foto ----
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const name = z.string().trim().min(1, "Isi nama.").max(60, "Nama maksimal 60 karakter.").safeParse(formData.get("name") ?? "");
  if (!name.success) return { error: name.error.issues[0].message };

  const update: { name: string; avatar?: string } = { name: name.data };
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const saved = await saveAvatar(user.id, photo);
    if (saved.error) return { error: saved.error };
    update.avatar = saved.name;
  }

  db.update(users).set(update).where(eq(users.id, user.id)).run();
  if (update.avatar) await deleteAvatarFile(user.avatar);
  refresh();
  return { ok: update.avatar ? "Nama dan foto disimpan." : "Nama disimpan.", savedAt: Date.now() };
}

export async function removeAvatar() {
  const user = await requireUser();
  db.update(users).set({ avatar: null }).where(eq(users.id, user.id)).run();
  await deleteAvatarFile(user.avatar);
  refresh();
}

// ---- Password ----
const changeSchema = z
  .object({
    current: z.string().min(1, "Isi password saat ini."),
    next: z.string().min(8, "Password baru minimal 8 karakter."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "Konfirmasi password baru tidak sama." });

export async function changePassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = changeSchema.safeParse({
    current: formData.get("current") ?? "",
    next: formData.get("next") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await verify(passwordOf(user.id), parsed.data.current))) return { error: "Password saat ini salah." };

  db.update(users).set({ passwordHash: await hash(parsed.data.next) }).where(eq(users.id, user.id)).run();
  await deleteUserSessions(user.id); // perangkat lain keluar, perangkat ini tetap masuk
  return { ok: "Password diganti. Perangkat lain yang memakai akun ini sudah dikeluarkan.", savedAt: Date.now() };
}

// ---- Verifikasi dua langkah ----
export type TotpSetup = { error?: string; qr?: string; secret?: string };

export async function startTotpSetup(): Promise<TotpSetup> {
  const user = await requireUser();
  if (user.totpEnabled) return { error: "Verifikasi dua langkah sudah aktif." };
  const secret = newTotpSecret();
  db.update(users).set({ totpPending: secret }).where(eq(users.id, user.id)).run();
  return { qr: await totpQr(secret, user.username), secret };
}

export async function confirmTotpSetup(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const row = db.select({ pending: users.totpPending }).from(users).where(eq(users.id, user.id)).get();
  if (!row?.pending) return { error: "Mulai ulang aktivasi: tekan Aktifkan lagi." };

  const step = checkTotp(row.pending, String(formData.get("code") ?? ""));
  if (step === null) return { error: "Kode salah. Pastikan jam di HP benar, lalu masukkan kode yang sedang tampil." };

  db.update(users).set({ totpSecret: row.pending, totpPending: null, totpLastStep: step }).where(eq(users.id, user.id)).run();
  refresh();
  return { ok: "Verifikasi dua langkah aktif. Mulai login berikutnya, kode dari aplikasi authenticator akan diminta.", savedAt: Date.now() };
}

export async function disableTotp(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (!(await verify(passwordOf(user.id), String(formData.get("password") ?? "")))) return { error: "Password salah." };
  if (!verifyUserTotp(user.id, String(formData.get("code") ?? ""))) return { error: "Kode authenticator salah." };

  db.update(users).set({ totpSecret: null, totpPending: null, totpLastStep: null }).where(eq(users.id, user.id)).run();
  refresh();
  return { ok: "Verifikasi dua langkah dimatikan.", savedAt: Date.now() };
}
