import "server-only";
import { and, asc, between, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { all } from "@/db/client";
import { accounts, importBatches, importRows, transactions } from "@/db/schema";
import { requireUser } from "@/lib/dal";

/**
 * Status draft mengikuti isi tabel transaksi: baris yang sudah masuk lewat file lain jadi "duplicate",
 * dan baris "duplicate" yang transaksinya sudah dihapus kembali jadi draft.
 */
async function syncImportStatuses(userId: number) {
  const taken = sql`(SELECT import_hash FROM transactions WHERE user_id = ${userId} AND import_hash IS NOT NULL)`;
  await db.execute(sql`UPDATE import_rows SET status = 'duplicate' WHERE user_id = ${userId} AND status = 'draft' AND hash IN ${taken}`);
  await db.execute(sql`UPDATE import_rows SET status = 'draft' WHERE user_id = ${userId} AND status = 'duplicate' AND hash NOT IN ${taken}`);
}

/** Semua unggahan milik user, terbaru dulu, dengan jumlah baris per status. */
export async function listImportBatches() {
  const user = await requireUser();
  await syncImportStatuses(user.id);
  return all<{
    id: number;
    fileName: string;
    fileType: "csv" | "pdf";
    periodFrom: string | null;
    periodTo: string | null;
    createdAt: string;
    canceledAt: string | null;
    accountName: string;
    drafts: number;
    imported: number;
    duplicates: number;
  }>(db, sql`
    SELECT b.id, b.file_name AS "fileName", b.file_type AS "fileType", b.period_from AS "periodFrom", b.period_to AS "periodTo",
           b.created_at AS "createdAt", b.canceled_at AS "canceledAt", a.name AS "accountName",
           COUNT(r.id) FILTER (WHERE r.status = 'draft') AS drafts,
           COUNT(r.id) FILTER (WHERE r.status = 'imported') AS imported,
           COUNT(r.id) FILTER (WHERE r.status = 'duplicate') AS duplicates
    FROM import_batches b
    JOIN accounts a ON a.id = b.account_id
    LEFT JOIN import_rows r ON r.batch_id = b.id
    WHERE b.user_id = ${user.id}
    GROUP BY b.id, a.name
    ORDER BY b.id DESC`);
}

export async function getImportBatch(id: number) {
  const user = await requireUser();
  await syncImportStatuses(user.id);
  const [batch] = await db
    .select({
      id: importBatches.id,
      fileName: importBatches.fileName,
      fileType: importBatches.fileType,
      statementAccount: importBatches.statementAccount,
      periodFrom: importBatches.periodFrom,
      periodTo: importBatches.periodTo,
      openingBalance: importBatches.openingBalance,
      closingBalance: importBatches.closingBalance,
      canceledAt: importBatches.canceledAt,
      accountId: importBatches.accountId,
      accountName: accounts.name,
    })
    .from(importBatches)
    .innerJoin(accounts, eq(accounts.id, importBatches.accountId))
    .where(and(eq(importBatches.id, id), eq(importBatches.userId, user.id)));
  if (!batch) return null;
  const rows = await db
    .select({
      id: importRows.id,
      date: importRows.date,
      time: importRows.time,
      rawDescription: importRows.rawDescription,
      note: importRows.note,
      direction: importRows.direction,
      amount: importRows.amount,
      balanceAfter: importRows.balanceAfter,
      kind: importRows.kind,
      categoryId: importRows.categoryId,
      toAccountId: importRows.toAccountId,
      status: importRows.status,
    })
    .from(importRows)
    .where(eq(importRows.batchId, id))
    .orderBy(asc(importRows.position));

  const from = batch.periodFrom ?? rows[0]?.date;
  const to = batch.periodTo ?? rows.at(-1)?.date;
  const [manual, balanceAtEnd] = await Promise.all([
    from && to ? manualTransactions(user.id, batch.accountId, from, to) : Promise.resolve([]),
    to ? balanceAt(batch.accountId, to) : Promise.resolve(null),
  ]);

  // Draft yang mungkin sudah dicatat manual: akun, tanggal, nominal, dan arahnya sama.
  // Satu catatan manual hanya dipasangkan ke satu baris, supaya dua jajan Rp10.000 tidak sama-sama tertandai.
  const used = new Set<number>();
  const withHints = rows.map((r) => {
    if (r.status !== "draft") return { ...r, maybeManual: null };
    const match = manual.find(
      (t) =>
        !used.has(t.id) &&
        t.date === r.date &&
        t.amount === r.amount &&
        (r.direction === "debit"
          ? t.accountId === batch.accountId && (t.type === "expense" || t.type === "transfer")
          : (t.type === "income" && t.accountId === batch.accountId) || (t.type === "transfer" && t.toAccountId === batch.accountId)),
    );
    if (match) used.add(match.id);
    return { ...r, maybeManual: match ? { id: match.id, note: match.note } : null };
  });

  return { ...batch, rows: withHints, balanceAtEnd };
}

/** Transaksi yang dicatat manual (bukan hasil impor) di akun ini selama periode file. */
function manualTransactions(userId: number, accountId: number, from: string, to: string) {
  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      accountId: transactions.accountId,
      toAccountId: transactions.toAccountId,
      amount: transactions.amount,
      date: transactions.date,
      note: transactions.note,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.importHash),
        between(transactions.date, from, to),
        or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId)),
      ),
    );
}

/** Saldo akun di aplikasi pada akhir tanggal tertentu (saldo awal + semua transaksi sampai tanggal itu). */
async function balanceAt(accountId: number, date: string) {
  const [row] = await all<{ balance: number }>(db, sql`
    SELECT a.initial_balance + COALESCE(SUM(
      CASE
        WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount
        WHEN t.type IN ('expense', 'transfer') AND t.account_id = a.id THEN -t.amount
        WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount
        ELSE 0
      END), 0) AS balance
    FROM accounts a
    LEFT JOIN transactions t ON (t.account_id = a.id OR t.to_account_id = a.id) AND t.date <= ${date}
    WHERE a.id = ${accountId}
    GROUP BY a.id`);
  return row ? Number(row.balance) : null;
}

export type ImportBatch = NonNullable<Awaited<ReturnType<typeof getImportBatch>>>;
export type ImportRow = ImportBatch["rows"][number];
