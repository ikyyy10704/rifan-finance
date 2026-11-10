"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { accounts, categories, importRows, transactions, TX_TYPES } from "@/db/schema";
import { requireUser } from "@/lib/dal";

export type TxFormState = { error?: string; savedAt?: number };

const txSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  type: z.enum(TX_TYPES),
  amount: z
    .string()
    .transform((s) => Number(s.replace(/\D/g, "")))
    .pipe(z.number().int().positive("Isi nominal lebih dari Rp0.").max(1_000_000_000_000, "Nominal terlalu besar.")),
  accountId: z.coerce.number({ error: "Pilih akun." }).int().positive("Pilih akun."),
  toAccountId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
  note: z.string().trim().max(200, "Catatan maksimal 200 karakter.").optional(),
});

const blankToUndefined = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : v);

export async function saveTransaction(_prev: TxFormState, formData: FormData): Promise<TxFormState> {
  const user = await requireUser();
  const parsed = txSchema.safeParse({
    id: blankToUndefined(formData.get("id")),
    type: formData.get("type"),
    amount: String(formData.get("amount") ?? ""),
    accountId: blankToUndefined(formData.get("accountId")),
    toAccountId: blankToUndefined(formData.get("toAccountId")),
    categoryId: blankToUndefined(formData.get("categoryId")),
    date: formData.get("date"),
    note: blankToUndefined(formData.get("note")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // Semua id dari form dicek kepemilikannya terhadap user dari sesi.
  const ownAccount = async (id: number) =>
    (await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))).length > 0;
  if (!(await ownAccount(d.accountId))) return { error: "Akun tidak ditemukan." };

  let toAccountId: number | null = null;
  let categoryId: number | null = null;
  if (d.type === "transfer") {
    if (!d.toAccountId) return { error: "Pilih akun tujuan transfer." };
    if (d.toAccountId === d.accountId) return { error: "Akun asal dan tujuan harus berbeda." };
    if (!(await ownAccount(d.toAccountId))) return { error: "Akun tujuan tidak ditemukan." };
    toAccountId = d.toAccountId;
  } else {
    if (!d.categoryId) return { error: "Pilih kategori." };
    const [cat] = await db
      .select({ kind: categories.kind })
      .from(categories)
      .where(and(eq(categories.id, d.categoryId), eq(categories.userId, user.id)));
    if (!cat || cat.kind !== d.type) return { error: "Kategori tidak cocok dengan jenis transaksi." };
    categoryId = d.categoryId;
  }

  const values = { type: d.type, accountId: d.accountId, toAccountId, categoryId, amount: d.amount, date: d.date, note: d.note ?? null };
  if (d.id) {
    const res = await db
      .update(transactions)
      .set({ ...values, updatedAt: sql`to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')` })
      .where(and(eq(transactions.id, d.id), eq(transactions.userId, user.id)))
      .returning({ id: transactions.id });
    if (res.length === 0) return { error: "Transaksi tidak ditemukan." };
  } else {
    await db.insert(transactions).values({ ...values, userId: user.id });
  }

  refresh();
  return { savedAt: Date.now() };
}

export async function deleteTransaction(id: number): Promise<TxFormState> {
  const user = await requireUser();
  // Transaksi hasil impor yang dihapus kembali menjadi draft di daftar impornya.
  const res = await db.transaction(async (tx) => {
    await tx
      .update(importRows)
      .set({ status: "draft", transactionId: null })
      .where(and(eq(importRows.transactionId, id), eq(importRows.userId, user.id)));
    return tx
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .returning({ id: transactions.id });
  });
  if (res.length === 0) return { error: "Transaksi tidak ditemukan." };
  refresh();
  return { savedAt: Date.now() };
}
