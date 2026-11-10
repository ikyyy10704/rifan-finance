"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accounts, categories, importBatches, importRows, transactions } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { parseBriCsv, parseBriPdf, StatementError, verifyStatement, type Statement } from "@/lib/importers/bri";
import { guessRow, rowHash } from "@/lib/importers/categorize";

export type UploadState = { error?: string; problems?: string[] };

const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadStatement(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const user = await requireUser();
  const accountId = Number(formData.get("accountId"));
  const file = formData.get("file");
  const password = String(formData.get("password") ?? "") || undefined;

  const account = db
    .select({ id: accounts.id, provider: accounts.provider, accountNumber: accounts.accountNumber })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id), eq(accounts.archived, false)))
    .get();
  if (!account || account.provider !== "bri") return { error: "Pilih akun BRI tujuan." };
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file mutasi (CSV atau PDF)." };
  if (file.size > MAX_BYTES) return { error: "Ukuran file maksimal 5 MB." };

  const name = file.name.slice(0, 200);
  const ext = name.toLowerCase().split(".").pop();
  let statement: Statement;
  try {
    if (ext === "csv") statement = parseBriCsv(await file.text());
    else if (ext === "pdf") statement = await parseBriPdf(new Uint8Array(await file.arrayBuffer()), password);
    else return { error: "Format file harus .csv atau .pdf dari e-Statement BRImo." };
  } catch (e) {
    if (e instanceof StatementError) return { error: e.message };
    return { error: "File tidak bisa dibaca sebagai e-Statement BRImo." };
  }

  // Jangan simpan apa pun kalau hasil baca tidak cocok dengan saldo/ringkasan bank.
  const problems = verifyStatement(statement);
  if (problems.length) return { error: "Isi file tidak konsisten, impor dibatalkan supaya tidak ada data salah.", problems: problems.slice(0, 5) };

  const fileAcc = statement.accountNumber;
  if (fileAcc && account.accountNumber && account.accountNumber.replace(/\D/g, "") !== fileAcc) {
    return { error: `Nomor rekening di file (${fileAcc}) berbeda dengan nomor akun ini (${account.accountNumber}). Pilih akun BRI yang sesuai.` };
  }

  const cats = db
    .select({ id: categories.id, name: categories.name, kind: categories.kind, archived: categories.archived })
    .from(categories)
    .where(eq(categories.userId, user.id))
    .all();
  const accs = db
    .select({ id: accounts.id, provider: accounts.provider, accountNumber: accounts.accountNumber, archived: accounts.archived })
    .from(accounts)
    .where(eq(accounts.userId, user.id))
    .all();
  const existing = new Set(
    db
      .select({ h: transactions.importHash })
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .all()
      .map((r) => r.h)
      .filter(Boolean),
  );

  const batchId = db.transaction((tx) => {
    const batch = tx
      .insert(importBatches)
      .values({
        userId: user.id,
        accountId: account.id,
        fileType: ext as "csv" | "pdf",
        fileName: name,
        statementAccount: fileAcc,
        periodFrom: statement.periodFrom,
        periodTo: statement.periodTo,
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
      })
      .returning({ id: importBatches.id })
      .get();

    statement.rows.forEach((r, i) => {
      const g = guessRow(r, statement.rows[i - 1], cats, accs, account.id);
      const hash = rowHash(fileAcc, account.id, r);
      tx.insert(importRows)
        .values({
          batchId: batch.id,
          userId: user.id,
          position: i,
          date: r.date,
          time: r.time,
          rawDescription: r.description,
          note: g.note,
          direction: r.debit > 0 ? "debit" : "credit",
          amount: r.debit || r.credit,
          balanceAfter: r.balance,
          hash,
          kind: g.kind,
          categoryId: g.categoryId,
          toAccountId: g.toAccountId,
          status: existing.has(hash) ? "duplicate" : "draft",
        })
        .run();
    });
    return batch.id;
  });

  redirect(`/import/${batchId}`);
}

// ---- Ubah satu baris draft (keterangan / kategori / transfer) ----
const rowSchema = z.object({
  note: z.string().trim().max(200, "Keterangan maksimal 200 karakter.").optional(),
  // "c:<id kategori>" atau "t:<id akun tujuan>"
  target: z.string().regex(/^(c|t):\d+$/).optional(),
});

export async function updateImportRow(rowId: number, input: { note?: string; target?: string }): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = rowSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const row = db
    .select({ id: importRows.id, direction: importRows.direction, status: importRows.status, batchId: importRows.batchId })
    .from(importRows)
    .where(and(eq(importRows.id, rowId), eq(importRows.userId, user.id)))
    .get();
  if (!row) return { error: "Baris tidak ditemukan." };
  if (row.status !== "draft") return { error: "Baris ini sudah dimasukkan, ubah lewat halaman Transaksi." };

  const set: Partial<typeof importRows.$inferInsert> = {};
  if (parsed.data.note !== undefined) set.note = parsed.data.note || null;
  if (parsed.data.target) {
    const [k, idStr] = parsed.data.target.split(":");
    const id = Number(idStr);
    if (k === "c") {
      const cat = db
        .select({ kind: categories.kind })
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
        .get();
      const want = row.direction === "credit" ? "income" : "expense";
      if (!cat || cat.kind !== want) return { error: "Kategori tidak cocok dengan arah transaksi." };
      Object.assign(set, { kind: want, categoryId: id, toAccountId: null });
    } else {
      if (row.direction !== "debit") return { error: "Uang masuk tidak bisa dijadikan transfer keluar." };
      const batch = db.select({ accountId: importBatches.accountId }).from(importBatches).where(eq(importBatches.id, row.batchId)).get();
      const acc = db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
        .get();
      if (!acc || acc.id === batch?.accountId) return { error: "Akun tujuan tidak valid." };
      Object.assign(set, { kind: "transfer", categoryId: null, toAccountId: id });
    }
  }
  db.update(importRows).set(set).where(eq(importRows.id, rowId)).run();
  return {};
}

// ---- Masukkan baris terpilih ke transaksi ----
export type CommitResult = { error?: string; imported?: number; skipped?: number };

export async function commitImportRows(batchId: number, rowIds: number[]): Promise<CommitResult> {
  const user = await requireUser();
  const ids = z.array(z.number().int().positive()).max(2000).safeParse(rowIds);
  if (!ids.success || ids.data.length === 0) return { error: "Pilih minimal satu baris." };

  const batch = db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, user.id)))
    .get();
  if (!batch) return { error: "Draft impor tidak ditemukan." };

  const rows = db
    .select()
    .from(importRows)
    .where(and(eq(importRows.batchId, batchId), eq(importRows.userId, user.id), eq(importRows.status, "draft"), inArray(importRows.id, ids.data)))
    .all();
  const incomplete = rows.filter((r) => (r.kind === "transfer" ? !r.toAccountId : !r.categoryId));
  if (incomplete.length) return { error: `${incomplete.length} baris belum punya kategori. Pilih kategorinya dulu.` };

  let imported = 0;
  let skipped = 0;
  db.transaction((tx) => {
    for (const r of rows) {
      // Sudah ada di transaksi (mis. diimpor dari file lain)? tandai, jangan dobel.
      const dup = tx
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.userId, user.id), eq(transactions.importHash, r.hash)))
        .get();
      if (dup) {
        tx.update(importRows).set({ status: "duplicate" }).where(eq(importRows.id, r.id)).run();
        skipped++;
        continue;
      }
      const t = tx
        .insert(transactions)
        .values({
          userId: user.id,
          type: r.kind,
          accountId: batch.accountId,
          toAccountId: r.kind === "transfer" ? r.toAccountId : null,
          categoryId: r.kind === "transfer" ? null : r.categoryId,
          amount: r.amount,
          date: r.date,
          note: r.note || r.rawDescription.slice(0, 200),
          importHash: r.hash,
        })
        .returning({ id: transactions.id })
        .get();
      tx.update(importRows).set({ status: "imported", transactionId: t.id }).where(eq(importRows.id, r.id)).run();
      imported++;
    }
  });

  refresh();
  return { imported, skipped };
}

/** Hapus baris draft yang tersisa. Baris yang sudah dimasukkan tetap ada di Transaksi. */
export async function discardImportDrafts(batchId: number) {
  const user = await requireUser();
  const batch = db
    .select({ id: importBatches.id })
    .from(importBatches)
    .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, user.id)))
    .get();
  if (!batch) return;
  db.delete(importRows).where(and(eq(importRows.batchId, batchId), inArray(importRows.status, ["draft", "duplicate"]))).run();
  const left = db.select({ id: importRows.id }).from(importRows).where(eq(importRows.batchId, batchId)).get();
  if (!left) db.delete(importBatches).where(eq(importBatches.id, batchId)).run();
  redirect("/import");
}
