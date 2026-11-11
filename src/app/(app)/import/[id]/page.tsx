import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { getAccounts, getCategories } from "@/lib/data/finance";
import { getImportBatch } from "@/lib/data/imports";
import { rupiah, shortDate } from "@/lib/format";
import { CancelImport } from "./cancel-import";
import { ImportPreview } from "./preview";

export const metadata: Metadata = { title: "Preview impor" };

export default function PreviewPage({ params }: PageProps<"/import/[id]">) {
  return (
    <>
      <PageHeader
        title="Preview impor"
        subtitle="Cek setiap baris, ubah keterangan atau kategori, lalu masukkan yang sudah benar"
        mobileTitle="Preview"
        back={{ href: "/import", label: "Import BRI" }}
      />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat preview...</p>}>
        <Preview params={params} />
      </Suspense>
    </>
  );
}

async function Preview({ params }: { params: PageProps<"/import/[id]">["params"] }) {
  const { id } = await params;
  const batch = await getImportBatch(Number(id));
  if (!batch) notFound();
  const [categories, accounts] = await Promise.all([getCategories(), getAccounts()]);
  const account = accounts.find((a) => a.id === batch.accountId);

  const drafts = batch.rows.filter((r) => r.status === "draft");
  const counts = {
    draft: drafts.length,
    imported: batch.rows.filter((r) => r.status === "imported").length,
    duplicate: batch.rows.filter((r) => r.status === "duplicate").length,
  };
  // Pencocokan saldo dilakukan pada tanggal akhir periode file, bukan hari ini, supaya transaksi
  // sesudah periode itu tidak membuat selisih palsu.
  const endLabel = batch.periodTo ? shortDate(batch.periodTo) : "akhir file";
  const atEnd = batch.balanceAtEnd ?? account?.balance ?? 0;
  const pendingNet = drafts.reduce((s, r) => s + (r.direction === "credit" ? r.amount : -r.amount), 0);
  const projected = atEnd + pendingNet;
  const diff = batch.closingBalance !== null ? projected - batch.closingBalance : null;
  const importedRows = batch.rows.filter((r) => r.status === "imported");

  return (
    <PageBody>
      <section aria-label="Ringkasan file" className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="w-full min-w-0 app:w-auto app:flex-1">
            {/* Nama file e-Statement panjang tanpa spasi: dipotong supaya tidak keluar dari kartu. */}
            <p className="m-0 truncate text-xs text-muted" title={batch.fileName}>
              {batch.fileType.toUpperCase()} · {batch.fileName}
            </p>
            <p className="m-0 text-[15px] font-bold">
              {batch.accountName}
              {batch.statementAccount && <span className="font-medium text-muted"> · rek …{batch.statementAccount.slice(-4)}</span>}
            </p>
            {batch.periodFrom && batch.periodTo && (
              <p className="m-0 text-[13px] text-muted">
                Periode {shortDate(batch.periodFrom)} sampai {shortDate(batch.periodTo)}
              </p>
            )}
          </div>
          <p className="m-0 text-[13px] text-muted">
            <b className="text-ink">{counts.draft}</b> draft · <b className="text-plus">{counts.imported}</b> masuk
            {counts.duplicate > 0 && (
              <>
                {" "}
                · <b className="text-[#8A5E08]">{counts.duplicate}</b> sudah ada
              </>
            )}
          </p>
        </div>

        <dl className="mt-3 mb-0 grid grid-cols-2 gap-2.5 text-[13px] app:grid-cols-4">
          <div className="rounded-[14px] bg-bg p-3">
            <dt className="text-xs text-muted">Saldo awal (bank)</dt>
            <dd className="m-0 font-bold tabular-nums">{batch.openingBalance !== null ? rupiah(batch.openingBalance) : "-"}</dd>
          </div>
          <div className="rounded-[14px] bg-bg p-3">
            <dt className="text-xs text-muted">Saldo akhir (bank)</dt>
            <dd className="m-0 font-bold tabular-nums">{batch.closingBalance !== null ? rupiah(batch.closingBalance) : "-"}</dd>
          </div>
          <div className="rounded-[14px] bg-bg p-3">
            <dt className="text-xs text-muted">Saldo aplikasi per {endLabel}</dt>
            <dd className="m-0 font-bold tabular-nums">{rupiah(atEnd)}</dd>
          </div>
          <div className="rounded-[14px] bg-bg p-3">
            <dt className="text-xs text-muted">Bila semua draft dimasukkan</dt>
            <dd className="m-0 font-bold tabular-nums">{rupiah(projected)}</dd>
          </div>
        </dl>
        {batch.canceledAt && (
          <p className="mt-2.5 mb-0 rounded-xl bg-bg px-3 py-2 text-[13px] text-muted">
            <b className="text-ink">Impor ini dibatalkan.</b> Transaksinya sudah dihapus dan barisnya kembali menjadi draft. Masukkan lagi bila memang benar, atau hapus draftnya.
          </p>
        )}
        {diff !== null && (
          <p className={`mt-2.5 mb-0 rounded-xl px-3 py-2 text-[13px] ${diff === 0 ? "bg-[#E3F4EC] text-plus" : "bg-[#FBF0DA] text-[#8A5E08]"}`}>
            {diff === 0
              ? counts.draft > 0
                ? `Cocok: bila semua draft dimasukkan, saldo aplikasi per ${endLabel} sama dengan saldo akhir di bank.`
                : `Cocok: saldo aplikasi per ${endLabel} sama dengan saldo akhir di bank.`
              : counts.draft > 0
                ? `Bila semua draft dimasukkan, saldo aplikasi per ${endLabel} ${diff > 0 ? "lebih" : "kurang"} ${rupiah(Math.abs(diff))} dari saldo akhir bank. Biasanya karena saldo awal akun belum sesuai, atau ada transaksi yang sudah dicatat manual.`
                : `Saldo aplikasi per ${endLabel} ${diff > 0 ? "lebih" : "kurang"} ${rupiah(Math.abs(diff))} dari saldo akhir bank. ${diff > 0 ? "Kemungkinan ada pemasukan tercatat dua kali, atau pengeluaran yang terlewat." : "Kemungkinan ada pengeluaran tercatat dua kali (manual dan impor), atau pemasukan yang terlewat."} Cek di halaman Transaksi.`}
          </p>
        )}
        {importedRows.length > 0 && (
          <div className="mt-3 flex justify-end border-t border-line pt-2">
            <CancelImport
              batchId={batch.id}
              count={importedRows.length}
              incoming={importedRows.filter((r) => r.direction === "credit").reduce((s, r) => s + r.amount, 0)}
              outgoing={importedRows.filter((r) => r.direction === "debit").reduce((s, r) => s + r.amount, 0)}
            />
          </div>
        )}
      </section>

      <ImportPreview
        batchId={batch.id}
        sourceAccountId={batch.accountId}
        accountName={batch.accountName}
        rows={batch.rows}
        categories={categories}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, archived: a.archived }))}
      />
    </PageBody>
  );
}
