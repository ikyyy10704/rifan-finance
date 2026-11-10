import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { getAccounts, getCategories } from "@/lib/data/finance";
import { getImportBatch } from "@/lib/data/imports";
import { rupiah, shortDate } from "@/lib/format";
import { ImportPreview } from "./preview";

export const metadata: Metadata = { title: "Preview impor" };

export default function PreviewPage({ params }: PageProps<"/import/[id]">) {
  return (
    <>
      <PageHeader
        title="Preview impor"
        subtitle="Cek setiap baris, ubah keterangan atau kategori, lalu masukkan yang sudah benar"
        mobileAction={
          <Link href="/import" className="inline-flex h-11 items-center gap-1 rounded-xl px-2 text-[13px] font-bold text-g700">
            <Icon name="chevronLeft" className="h-[18px] w-[18px]" />
            Import
          </Link>
        }
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
  // Saldo akun bila semua draft dimasukkan, dibandingkan dengan saldo akhir menurut bank.
  const pendingNet = drafts.reduce((s, r) => s + (r.direction === "credit" ? r.amount : -r.amount), 0);
  const projected = (account?.balance ?? 0) + pendingNet;
  const diff = batch.closingBalance !== null ? projected - batch.closingBalance : null;

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
            <dt className="text-xs text-muted">Saldo di aplikasi sekarang</dt>
            <dd className="m-0 font-bold tabular-nums">{rupiah(account?.balance ?? 0)}</dd>
          </div>
          <div className="rounded-[14px] bg-bg p-3">
            <dt className="text-xs text-muted">Bila semua draft dimasukkan</dt>
            <dd className="m-0 font-bold tabular-nums">{rupiah(projected)}</dd>
          </div>
        </dl>
        {diff !== null && counts.draft > 0 && (
          <p className={`mt-2.5 mb-0 rounded-xl px-3 py-2 text-[13px] ${diff === 0 ? "bg-[#E3F4EC] text-plus" : "bg-[#FBF0DA] text-[#8A5E08]"}`}>
            {diff === 0
              ? "Cocok: bila semua draft dimasukkan, saldo aplikasi sama dengan saldo akhir di bank."
              : `Selisih ${rupiah(Math.abs(diff))} dengan saldo akhir bank. Biasanya karena saldo awal akun belum diisi sesuai saldo sebelum ${batch.periodFrom ? shortDate(batch.periodFrom) : "periode ini"}, atau ada transaksi yang sudah dicatat manual.`}
          </p>
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
