"use server";

import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
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

  const [account] = await db
    .select({ id: accounts.id, provider: accounts.provider, accountNumber: accounts.accountNumber })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id), eq(accounts.archived, false)));
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
  const [cats, accs, hashes] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, kind: categories.kind, archived: categories.archived })
      .from(categories)
      .where(eq(categories.userId, user.id)),
    db
      .select({ id: accounts.id, name: accounts.name, provider: accounts.provider, accountNumber: accounts.accountNumber, archived: accounts.archived })
      .from(accounts)
      .where(eq(accounts.userId, user.id)),
    db.select({ h: transactions.importHash }).from(transactions).where(eq(transactions.userId, user.id)),
  ]);
  const existing = new Set(hashes.map((r) => r.h).filter(Boolean));

  // Cegah salah akun: file e-Statement harus milik rekening akun yang dipilih.
  const wrongAccount = await checkStatementAccount(user.id, account.id, account.accountNumber, fileAcc, accs);
  if (wrongAccount) return { error: wrongAccount };

  const batchId = await db.transaction(async (tx) => {
    const [batch] = await tx
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
      .returning({ id: importBatches.id });

    // Satu INSERT untuk semua baris: jauh lebih cepat daripada satu per baris lewat jaringan.
    const values = statement.rows.map((r, i) => {
      const g = guessRow(r, statement.rows[i - 1], cats, accs, account.id);
      const hash = rowHash(fileAcc, account.id, r);
      return {
        batchId: batch.id,
        userId: user.id,
        position: i,
        date: r.date,
        time: r.time,
        rawDescription: r.description,
        note: g.note,
        direction: r.debit > 0 ? ("debit" as const) : ("credit" as const),
        amount: r.debit || r.credit,
        balanceAfter: r.balance,
        hash,
        kind: g.kind,
        categoryId: g.categoryId,
        toAccountId: g.toAccountId,
        status: existing.has(hash) ? ("duplicate" as const) : ("draft" as const),
      };
    });
    if (values.length) await tx.insert(importRows).values(values);
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

  const [row] = await db
    .select({ id: importRows.id, direction: importRows.direction, status: importRows.status, batchId: importRows.batchId })
    .from(importRows)
    .where(and(eq(importRows.id, rowId), eq(importRows.userId, user.id)));
  if (!row) return { error: "Baris tidak ditemukan." };
  if (row.status !== "draft") return { error: "Baris ini sudah dimasukkan, ubah lewat halaman Transaksi." };

  const set: Partial<typeof importRows.$inferInsert> = {};
  if (parsed.data.note !== undefined) set.note = parsed.data.note || null;
  if (parsed.data.target) {
    const [k, idStr] = parsed.data.target.split(":");
    const id = Number(idStr);
    if (k === "c") {
      const [cat] = await db
        .select({ kind: categories.kind })
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, user.id)));
      const want = row.direction === "credit" ? "income" : "expense";
      if (!cat || cat.kind !== want) return { error: "Kategori tidak cocok dengan arah transaksi." };
      Object.assign(set, { kind: want, categoryId: id, toAccountId: null });
    } else {
      if (row.direction !== "debit") return { error: "Uang masuk tidak bisa dijadikan transfer keluar." };
      const [batch] = await db.select({ accountId: importBatches.accountId }).from(importBatches).where(eq(importBatches.id, row.batchId));
      const [acc] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
      if (!acc || acc.id === batch?.accountId) return { error: "Akun tujuan tidak valid." };
      Object.assign(set, { kind: "transfer", categoryId: null, toAccountId: id });
    }
  }
  if (Object.keys(set).length) await db.update(importRows).set(set).where(eq(importRows.id, rowId));
  return {};
}

// ---- Masukkan baris terpilih ke transaksi ----
const digits = (n: string | null | undefined) => n?.replace(/\D/g, "") || null;
const tail = (n: string) => `…${n.slice(-4)}`;

/**
 * Pesan error bila file bukan milik akun tujuan, atau null bila aman.
 * Akun yang belum punya nomor rekening dicocokkan lewat akun lain dan riwayat impornya,
 * lalu nomornya diisi dari file supaya impor berikutnya langsung tercek.
 */
async function checkStatementAccount(
  userId: number,
  accountId: number,
  accountNumber: string | null,
  fileAcc: string | null,
  accs: { id: number; name: string; accountNumber: string | null }[],
): Promise<string | null> {
  if (!fileAcc) return null;
  const mine = digits(accountNumber);
  if (mine) return mine === fileAcc ? null : `File ini untuk rekening ${tail(fileAcc)}, tapi akun yang dipilih rekening ${tail(mine)}. Pilih akun BRI yang sesuai.`;

  const other = accs.find((a) => a.id !== accountId && digits(a.accountNumber) === fileAcc);
  if (other) return `File ini milik rekening ${tail(fileAcc)} yang tercatat sebagai akun "${other.name}". Pilih akun itu sebagai tujuan.`;

  const [before] = await db
    .select({ acc: importBatches.statementAccount })
    .from(importBatches)
    .where(and(eq(importBatches.userId, userId), eq(importBatches.accountId, accountId), isNotNull(importBatches.statementAccount), ne(importBatches.statementAccount, fileAcc)))
    .limit(1);
  if (before?.acc) return `Akun ini sebelumnya diisi dari rekening ${tail(before.acc)}, sedangkan file ini rekening ${tail(fileAcc)}. Pilih akun BRI yang sesuai.`;

  await db.update(accounts).set({ accountNumber: fileAcc }).where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  return null;
}

export type CommitResult = { error?: string; imported?: number; skipped?: number; rowIds?: number[] };

export async function commitImportRows(batchId: number, rowIds: number[]): Promise<CommitResult> {
  const user = await requireUser();
  const ids = z.array(z.number().int().positive()).max(2000).safeParse(rowIds);
  if (!ids.success || ids.data.length === 0) return { error: "Pilih minimal satu baris." };

  const [batch] = await db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, user.id)));
  if (!batch) return { error: "Draft impor tidak ditemukan." };

  const rows = await db
    .select()
    .from(importRows)
    .where(and(eq(importRows.batchId, batchId), eq(importRows.userId, user.id), eq(importRows.status, "draft"), inArray(importRows.id, ids.data)));
  const incomplete = rows.filter((r) => (r.kind === "transfer" ? !r.toAccountId : !r.categoryId));
  if (incomplete.length) return { error: `${incomplete.length} baris belum punya kategori. Pilih kategorinya dulu.` };

  let imported = 0;
  let skipped = 0;
  let importedIds: number[] = [];
  await db.transaction(async (tx) => {
    // Sudah ada di transaksi (mis. diimpor dari file lain)? tandai, jangan dobel.
    const taken = rows.length
      ? await tx
          .select({ h: transactions.importHash })
          .from(transactions)
          .where(and(eq(transactions.userId, user.id), inArray(transactions.importHash, rows.map((r) => r.hash))))
      : [];
    const takenSet = new Set(taken.map((t) => t.h));
    const dupIds = rows.filter((r) => takenSet.has(r.hash)).map((r) => r.id);
    const fresh = rows.filter((r) => !takenSet.has(r.hash));
    if (dupIds.length) await tx.update(importRows).set({ status: "duplicate" }).where(inArray(importRows.id, dupIds));
    skipped = dupIds.length;
    if (!fresh.length) return;

    const created = await tx
      .insert(transactions)
      .values(
        fresh.map((r) => ({
          userId: user.id,
          type: r.kind,
          accountId: batch.accountId,
          toAccountId: r.kind === "transfer" ? r.toAccountId : null,
          categoryId: r.kind === "transfer" ? null : r.categoryId,
          amount: r.amount,
          date: r.date,
          note: r.note || r.rawDescription.slice(0, 200),
          importHash: r.hash,
        })),
      )
      .returning({ id: transactions.id, hash: transactions.importHash });
    const txByHash = new Map(created.map((c) => [c.hash, c.id]));
    for (const r of fresh) {
      await tx.update(importRows).set({ status: "imported", transactionId: txByHash.get(r.hash) }).where(eq(importRows.id, r.id));
    }
    imported = fresh.length;
    importedIds = fresh.map((r) => r.id);
    // Memasukkan lagi setelah dibatalkan: file ini aktif kembali.
    await tx.update(importBatches).set({ canceledAt: null }).where(eq(importBatches.id, batchId));
  });

  refresh();
  return { imported, skipped, rowIds: importedIds };
}

export type UndoResult = { error?: string; removed?: number; total?: number };

/**
 * Hapus transaksi yang masuk dari satu file impor; barisnya kembali menjadi draft.
 * Tanpa `rowIds`: seluruh file dibatalkan dan ditandai "Dibatalkan" di riwayat.
 * Dengan `rowIds`: hanya baris itu (tombol Batalkan sesaat setelah memasukkan).
 */
export async function undoImport(batchId: number, rowIds?: number[]): Promise<UndoResult> {
  const user = await requireUser();
  const ids = rowIds ? z.array(z.number().int().positive()).max(2000).safeParse(rowIds) : null;
  if (ids && !ids.success) return { error: "Baris tidak valid." };

  const [batch] = await db
    .select({ id: importBatches.id })
    .from(importBatches)
    .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, user.id)));
  if (!batch) return { error: "Impor tidak ditemukan." };

  const where = [eq(importRows.batchId, batchId), eq(importRows.userId, user.id), eq(importRows.status, "imported"), isNotNull(importRows.transactionId)];
  if (ids?.success) where.push(inArray(importRows.id, ids.data));
  const rows = await db.select({ id: importRows.id, txId: importRows.transactionId, amount: importRows.amount }).from(importRows).where(and(...where));

  await db.transaction(async (tx) => {
    if (rows.length) {
      await tx.update(importRows).set({ status: "draft", transactionId: null }).where(inArray(importRows.id, rows.map((r) => r.id)));
      await tx.delete(transactions).where(and(eq(transactions.userId, user.id), inArray(transactions.id, rows.map((r) => r.txId!))));
    }
    if (!rowIds) {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      await tx.update(importBatches).set({ canceledAt: now }).where(eq(importBatches.id, batchId));
    }
  });

  refresh();
  return { removed: rows.length, total: rows.reduce((s, r) => s + r.amount, 0) };
}

/** Hapus baris draft yang tersisa. Baris yang sudah dimasukkan tetap ada di Transaksi. */
export async function discardImportDrafts(batchId: number) {
  const user = await requireUser();
  const [batch] = await db
    .select({ id: importBatches.id })
    .from(importBatches)
    .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, user.id)));
  if (!batch) return;
  await db.delete(importRows).where(and(eq(importRows.batchId, batchId), inArray(importRows.status, ["draft", "duplicate"])));
  const [left] = await db.select({ id: importRows.id }).from(importRows).where(eq(importRows.batchId, batchId)).limit(1);
  if (!left) await db.delete(importBatches).where(eq(importBatches.id, batchId));
  redirect("/import");
}
