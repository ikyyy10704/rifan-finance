"use server";

import { and, eq, not, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { CATEGORY_ICONS, CATEGORY_TONES } from "@/lib/category-options";

export type CategoryFormState = { error?: string; ok?: string; savedAt?: number };

const nameSchema = z.string().trim().min(1, "Isi nama kategori.").max(30, "Nama kategori maksimal 30 karakter.");

async function nameTaken(userId: number, kind: string, name: string, exceptId?: number) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.kind, kind as "income"), sql`lower(${categories.name}) = ${name.toLowerCase()}`));
  return !!row && row.id !== exceptId;
}

const createSchema = z.object({
  name: nameSchema,
  kind: z.enum(["income", "expense"], { error: "Pilih jenis kategori." }),
  icon: z.enum(CATEGORY_ICONS),
  color: z.enum(CATEGORY_TONES),
});

export async function createCategory(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse({
    name: formData.get("name") ?? "",
    kind: formData.get("kind"),
    icon: formData.get("icon") ?? "other",
    color: formData.get("color") ?? "l",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await nameTaken(user.id, parsed.data.kind, parsed.data.name)) return { error: `Kategori "${parsed.data.name}" sudah ada.` };

  await db.insert(categories).values({ ...parsed.data, userId: user.id });
  refresh();
  return { ok: `Kategori ${parsed.data.name} ditambahkan.`, savedAt: Date.now() };
}

/** Tambah satu kategori dari daftar saran dengan sekali tekan. */
export async function addSuggestedCategory(input: { name: string; kind: "income" | "expense"; icon: string; color: string }) {
  const user = await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success || (await nameTaken(user.id, parsed.data.kind, parsed.data.name))) return;
  await db.insert(categories).values({ ...parsed.data, userId: user.id });
  refresh();
}

export async function renameCategory(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const name = nameSchema.safeParse(formData.get("name") ?? "");
  if (!name.success) return { error: name.error.issues[0].message };
  const [cat] = await db.select({ kind: categories.kind }).from(categories).where(and(eq(categories.id, id), eq(categories.userId, user.id)));
  if (!cat) return { error: "Kategori tidak ditemukan." };
  if (await nameTaken(user.id, cat.kind, name.data, id)) return { error: `Kategori "${name.data}" sudah ada.` };

  await db.update(categories).set({ name: name.data }).where(and(eq(categories.id, id), eq(categories.userId, user.id)));
  refresh();
  return { ok: "Nama disimpan.", savedAt: Date.now() };
}

export async function toggleArchiveCategory(id: number) {
  const user = await requireUser();
  await db.update(categories)
    .set({ archived: not(categories.archived) })
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)));
  refresh();
}
