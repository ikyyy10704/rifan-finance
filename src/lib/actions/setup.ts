"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accounts, categories, users } from "@/db/schema";
import { requireSignedIn } from "@/lib/dal";
import { findProvider, PROVIDER_IDS } from "@/lib/providers";
import { usernameSchema } from "@/lib/validators";

// Tiga langkah perkenalan untuk akun baru dari Google. users.setup_step menyimpan langkah
// terjauh yang sudah dibuka; null berarti selesai dan aplikasi terbuka penuh.

export type SetupState = { error?: string; field?: string };

async function setupUser() {
  const user = await requireSignedIn();
  if (user.setupStep === null) redirect("/dashboard");
  return user;
}

const advance = (userId: number, current: number, next: number) =>
  db.update(users).set({ setupStep: Math.max(current, next) }).where(eq(users.id, userId));

// ---- Langkah 1: nama dan username ----
const profileSchema = z.object({
  name: z.string().trim().min(1, "Isi nama panggilan.").max(60, "Nama maksimal 60 karakter."),
  username: usernameSchema,
});

export async function saveSetupProfile(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const user = await setupUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name") ?? "", username: formData.get("username") ?? "" });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: String(issue.path[0]) };
  }
  const { name, username } = parsed.data;
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.username, username), ne(users.id, user.id)));
  if (taken) return { error: `Username @${username} sudah dipakai orang lain. Coba tambah angka atau titik.`, field: "username" };

  await db.update(users).set({ name, username }).where(eq(users.id, user.id));
  await advance(user.id, user.setupStep!, 2);
  redirect("/mulai?langkah=2");
}

// ---- Langkah 2: dompet pertama ----
const accountSchema = z.object({
  provider: z.enum(PROVIDER_IDS, { error: "Pilih jenis dompet." }),
  name: z.string().trim().min(1, "Isi nama dompet.").max(40, "Nama dompet maksimal 40 karakter."),
  initialBalance: z
    .string()
    .transform((s) => Number(s.replace(/\D/g, "") || "0"))
    .pipe(z.number().int().min(0).max(1_000_000_000_000, "Saldo awal terlalu besar.")),
});

export async function saveSetupAccount(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const user = await setupUser();

  // Kembali ke langkah ini setelah dompet dibuat: boleh lanjut tanpa menambah lagi.
  if (formData.get("skip") === "1") {
    const [one] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, user.id)).limit(1);
    if (!one) return { error: "Buat satu dompet dulu supaya transaksi punya tempat dicatat." };
    await advance(user.id, user.setupStep!, 3);
    redirect("/mulai?langkah=3");
  }

  const parsed = accountSchema.safeParse({
    provider: formData.get("provider"),
    name: formData.get("name") ?? "",
    initialBalance: String(formData.get("initialBalance") ?? ""),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: String(issue.path[0]) };
  }
  const d = parsed.data;
  await db.insert(accounts).values({
    userId: user.id,
    provider: d.provider,
    type: findProvider(d.provider)!.type,
    name: d.name,
    initialBalance: d.initialBalance,
  });
  await advance(user.id, user.setupStep!, 3);
  redirect("/mulai?langkah=3");
}

// ---- Langkah 3: kategori yang dipakai ----
export async function saveSetupCategories(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const user = await setupUser();
  if (user.setupStep! < 3) redirect(`/mulai?langkah=${user.setupStep}`);

  const keep = new Set(formData.getAll("keep").map(Number));
  const own = await db.select({ id: categories.id, kind: categories.kind }).from(categories).where(eq(categories.userId, user.id));
  if (!own.some((c) => c.kind === "expense" && keep.has(c.id))) return { error: "Pilih minimal satu kategori pengeluaran." };
  if (!own.some((c) => c.kind === "income" && keep.has(c.id))) return { error: "Pilih minimal satu kategori pemasukan." };

  // Yang tidak dicentang disembunyikan, bukan dihapus: bisa dimunculkan lagi di halaman Kategori.
  const on = own.filter((c) => keep.has(c.id)).map((c) => c.id);
  const off = own.filter((c) => !keep.has(c.id)).map((c) => c.id);
  if (on.length) await db.update(categories).set({ archived: false }).where(inArray(categories.id, on));
  if (off.length) await db.update(categories).set({ archived: true }).where(inArray(categories.id, off));

  await db.update(users).set({ setupStep: null }).where(eq(users.id, user.id));
  redirect("/dashboard");
}
