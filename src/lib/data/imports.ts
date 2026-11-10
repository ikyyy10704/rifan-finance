import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { all } from "@/db/client";
import { accounts, importBatches, importRows } from "@/db/schema";
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
    accountName: string;
    drafts: number;
    imported: number;
    duplicates: number;
  }>(db, sql`
    SELECT b.id, b.file_name AS "fileName", b.file_type AS "fileType", b.period_from AS "periodFrom", b.period_to AS "periodTo",
           b.created_at AS "createdAt", a.name AS "accountName",
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
  return { ...batch, rows };
}

export type ImportBatch = NonNullable<Awaited<ReturnType<typeof getImportBatch>>>;
export type ImportRow = ImportBatch["rows"][number];
