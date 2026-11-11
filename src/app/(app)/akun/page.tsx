import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ProviderLogo } from "@/components/provider-logo";
import { card } from "@/components/ui";
import { toggleArchiveAccount } from "@/lib/actions/accounts";
import { getAccounts } from "@/lib/data/finance";
import { ACCOUNT_TYPE_LABEL, rupiah } from "@/lib/format";
import { findProvider, formatAccountNumber } from "@/lib/providers";
import { AddAccountSheet } from "./account-form";

export const metadata: Metadata = { title: "Akun & Dompet" };

type Account = Awaited<ReturnType<typeof getAccounts>>[number];

export default function AkunPage() {
  return (
    <>
      <PageHeader
        title="Akun & Dompet"
        mobileTitle="Akun"
        subtitle="Tunai, rekening bank, dan e-wallet"
        action={<AddAccountSheet desktop />}
        mobileAction={<AddAccountSheet />}
      />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat akun...</p>}>
        <Accounts />
      </Suspense>
    </>
  );
}

async function Accounts() {
  const all = await getAccounts();
  const active = all.filter((a) => !a.archived);
  const archived = all.filter((a) => a.archived);
  const total = active.reduce((s, a) => s + a.balance, 0);

  return (
    <>
      {/* ===== HP: total sebagai angka besar, lalu satu daftar ===== */}
      <div className="px-4 pt-1 pb-4 app:hidden">
        <p className="m-0 text-[13px] text-muted">Total saldo {active.length} akun</p>
        <p className="m-0 mb-5 text-[30px] font-extrabold tracking-[-0.8px] tabular-nums">{rupiah(total)}</p>

        {active.length === 0 ? (
          <div className="rounded-[18px] bg-white px-4 py-6 text-center">
            <p className="m-0 font-semibold">Belum ada akun</p>
            <p className="mt-1 mb-0 text-[13px] text-muted">Tekan Tambah di kanan atas untuk menambahkan BRI, DANA, GoPay, ShopeePay, atau Tunai.</p>
          </div>
        ) : (
          <ul className="m-0 list-none rounded-[18px] bg-white px-4 py-1">
            {active.map((a, i) => (
              <MobileRow key={a.id} a={a} first={i === 0} />
            ))}
          </ul>
        )}

        {archived.length > 0 && (
          <>
            <h2 className="mt-6 mb-1.5 px-1 text-[13px] text-muted">Diarsipkan, tidak dihitung di total</h2>
            <ul className="m-0 list-none rounded-[18px] bg-white px-4 py-1">
              {archived.map((a, i) => (
                <MobileRow key={a.id} a={a} first={i === 0} />
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ===== Desktop: satu kartu daftar. Form tambah dibuka dari tombol di kanan atas. ===== */}
      <div className="hidden px-8 pt-6 pb-12 app:block">
        <section aria-labelledby="list-title" className={card}>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b border-line pb-4">
            <div>
              <h2 id="list-title" className="m-0 text-[13px] font-semibold text-muted">
                Total saldo
              </h2>
              <p className="m-0 text-[30px] leading-tight font-extrabold tracking-[-0.8px] tabular-nums">{rupiah(total)}</p>
            </div>
            <p className="m-0 pb-1 text-[13px] text-muted">
              {active.length} akun aktif{archived.length > 0 && `, ${archived.length} diarsipkan`}
            </p>
          </div>

          {active.length === 0 ? (
            <div className="py-8 text-center">
              <p className="m-0 font-semibold">Belum ada akun</p>
              <p className="mt-1 mb-0 text-[13px] text-muted">Tekan Tambah akun di kanan atas untuk menambahkan BRI, DANA, GoPay, ShopeePay, atau Tunai.</p>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {active.map((a, i) => (
                <DesktopRow key={a.id} account={a} first={i === 0} />
              ))}
            </ul>
          )}

          {archived.length > 0 && (
            <details className="mt-2 border-t border-line pt-2">
              <summary className="inline-flex min-h-11 items-center text-[13px] font-bold text-g700 hover:underline">
                Diarsipkan ({archived.length})
              </summary>
              <p className="mt-0 mb-1 text-[13px] text-muted">Tidak dihitung di total saldo dan tidak muncul saat mencatat transaksi. Riwayatnya tetap tersimpan.</p>
              <ul className="m-0 list-none p-0">
                {archived.map((a, i) => (
                  <DesktopRow key={a.id} account={a} first={i === 0} />
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>
    </>
  );
}

function ArchiveButton({ a }: { a: Account }) {
  return (
    <form action={toggleArchiveAccount.bind(null, a.id)}>
      <button
        type="submit"
        aria-label={`${a.archived ? "Aktifkan lagi" : "Arsipkan"} ${a.name}`}
        className="-mr-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-muted hover:bg-bg hover:text-g700 active:translate-y-px app:text-[13px] app:font-bold app:text-g700"
      >
        {a.archived ? "Aktifkan lagi" : "Arsipkan"}
      </button>
    </form>
  );
}

/** HP: logo, nama, jenis + nomor; saldo di kanan. Arsipkan di bawah saldo, kecil. */
function MobileRow({ a, first }: { a: Account; first: boolean }) {
  const provider = findProvider(a.provider);
  return (
    <li className={`flex items-center gap-3 py-2.5 ${first ? "" : "border-t border-line"}`}>
      <ProviderLogo provider={a.provider} type={a.type} size={42} />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[14px]">{a.name}</b>
        <small className="block truncate text-xs text-muted">
          {a.accountNumber ? <span className="tabular-nums">{formatAccountNumber(a.accountNumber)}</span> : (provider?.label ?? ACCOUNT_TYPE_LABEL[a.type])}
        </small>
      </div>
      <div className="flex flex-none flex-col items-end">
        <b className={`text-[14px] whitespace-nowrap tabular-nums ${a.balance < 0 ? "text-danger" : ""}`}>{rupiah(a.balance)}</b>
        <ArchiveButton a={a} />
      </div>
    </li>
  );
}

function DesktopRow({ account: a, first }: { account: Account; first: boolean }) {
  const provider = findProvider(a.provider);
  return (
    <li className={`flex items-center gap-4 py-3.5 ${first ? "" : "border-t border-line"}`}>
      <ProviderLogo provider={a.provider} type={a.type} />
      <div className="min-w-0 flex-1">
        <b className="block truncate">{a.name}</b>
        <small className="block text-xs text-muted">
          {provider?.label ?? ACCOUNT_TYPE_LABEL[a.type]}
          {a.accountNumber && (
            <>
              {" · "}
              <span className="font-mono tracking-tight text-ink select-all">{formatAccountNumber(a.accountNumber)}</span>
            </>
          )}
        </small>
        <small className="block text-xs text-muted">Saldo awal {rupiah(a.initialBalance)}</small>
      </div>
      <div className="flex flex-none flex-col items-end">
        <b className={`whitespace-nowrap ${a.balance < 0 ? "text-danger" : ""}`}>{rupiah(a.balance)}</b>
        <ArchiveButton a={a} />
      </div>
    </li>
  );
}
