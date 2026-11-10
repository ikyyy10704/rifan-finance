import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { getAccounts } from "@/lib/data/finance";
import { listImportBatches } from "@/lib/data/imports";
import { shortDate } from "@/lib/format";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Import Mutasi BRI" };

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Import BRI" subtitle="Baca e-Statement BRImo (CSV atau PDF), cek dulu, lalu masukkan" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat...</p>}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const [accounts, batches] = await Promise.all([getAccounts(), listImportBatches()]);
  const bri = accounts.filter((a) => a.provider === "bri" && !a.archived);

  return (
    <PageBody>
      <div className="grid gap-3.5 app:gap-6 wide:grid-cols-2 wide:items-start">
        <section aria-labelledby="up-title" className={card}>
          <h2 id="up-title" className="m-0 mb-3 text-[15px] app:text-base">
            Unggah file mutasi
          </h2>
          {bri.length === 0 ? (
            <p className="m-0 text-muted">
              Belum ada akun BRI. Tambahkan dulu di{" "}
              <Link href="/akun" className="font-bold text-g700 underline">
                Akun & Dompet
              </Link>{" "}
              dengan memilih logo BRI, sebaiknya beserta nomor rekeningnya.
            </p>
          ) : (
            <UploadForm accounts={bri.map((a) => ({ id: a.id, name: a.name, accountNumber: a.accountNumber }))} />
          )}
        </section>

        <section aria-labelledby="hist-title" className={card}>
          <h2 id="hist-title" className="m-0 mb-1 text-[15px] app:text-base">
            Draft dan riwayat impor
          </h2>
          <p className="mt-0 mb-2 text-[13px] text-muted">Baris yang belum dimasukkan tetap tersimpan sebagai draft. Buka untuk melanjutkan.</p>
          {batches.length === 0 ? (
            <p className="m-0 text-muted">Belum ada file yang diimpor.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {batches.map((b, i) => (
                <li key={b.id} className={i ? "border-t border-line" : ""}>
                  <Link href={`/import/${b.id}`} className="-mx-2 flex min-h-14 items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-bg">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#E4EEFB] text-[11px] font-extrabold text-blue uppercase">{b.fileType}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13.5px]">
                        {b.accountName} · {b.periodFrom && b.periodTo ? `${shortDate(b.periodFrom)} sampai ${shortDate(b.periodTo)}` : b.fileName}
                      </b>
                      <small className="block text-xs text-muted">
                        {b.imported} masuk{b.duplicates ? ` · ${b.duplicates} sudah ada` : ""}
                      </small>
                    </span>
                    {b.drafts > 0 ? (
                      <span className="rounded-md bg-[#FBF0DA] px-2 py-1 text-xs font-bold whitespace-nowrap text-[#8A5E08]">{b.drafts} draft</span>
                    ) : (
                      <span className="rounded-md bg-[#E3F4EC] px-2 py-1 text-xs font-bold whitespace-nowrap text-plus">Selesai</span>
                    )}
                    <Icon name="chevronRight" className="h-[18px] w-[18px] text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageBody>
  );
}
