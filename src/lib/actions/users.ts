"use server";

import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { seedDefaultCategories } from "@/db/defaults";
import { sessions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { deleteUserSessions } from "@/lib/session";
import { newUserSchema } from "@/lib/validators";

export type UserFormState = { error?: string; ok?: string; savedAt?: number };

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();
  const parsed = newUserSchema.safeParse({
    username: formData.get("username") ?? "",
    name: formData.get("name") ?? "",
    password: formData.get("password") ?? "",
    role: formData.get("role") ?? "user",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (db.select({ id: users.id }).from(users).where(eq(users.username, d.username)).get()) {
    return { error: `Username "${d.username}" sudah dipakai.` };
  }
  const created = db
    .insert(users)
    .values({ username: d.username, name: d.name, role: d.role, passwordHash: await hash(d.password) })
    .returning({ id: users.id })
    .get();
  seedDefaultCategories(db, created.id);

  refresh();
  return { ok: `Akun ${d.username} dibuat. Berikan password-nya langsung ke pemilik akun.`, savedAt: Date.now() };
}

const resetSchema = z.object({
  userId: z.coerce.number().int().positive(),
  password: z.string().min(8, "Password minimal 8 karakter."),
});

export async function resetPassword(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();
  const parsed = resetSchema.safeParse({ userId: formData.get("userId"), password: formData.get("password") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const res = db
    .update(users)
    .set({ passwordHash: await hash(parsed.data.password) })
    .where(eq(users.id, parsed.data.userId))
    .run();
  if (res.changes === 0) return { error: "Akun tidak ditemukan." };

  // Perangkat lain yang masih login dengan password lama ikut keluar.
  await deleteUserSessions(parsed.data.userId);
  refresh();
  return { ok: "Password diganti. Perangkat lain yang memakai akun ini sudah dikeluarkan.", savedAt: Date.now() };
}

/** Untuk pengguna yang kehilangan HP berisi aplikasi authenticator. */
export async function resetUserTotp(userId: number) {
  const admin = await requireAdmin();
  if (userId === admin.id) return; // admin mematikan 2FA miliknya sendiri lewat Profil (butuh password + kode)
  db.update(users).set({ totpSecret: null, totpPending: null, totpLastStep: null }).where(eq(users.id, userId)).run();
  refresh();
}

export async function setUserActive(userId: number, active: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id) return;
  db.update(users).set({ active }).where(eq(users.id, userId)).run();
  if (!active) db.delete(sessions).where(eq(sessions.userId, userId)).run();
  refresh();
}
