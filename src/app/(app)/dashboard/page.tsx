import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BellLink } from "@/components/bell-link";
import { ProviderLogo } from "@/components/provider-logo";
import { ensureTodayAlerts } from "@/lib/data/notifications";
import { TxList } from "@/components/tx-list";
import { card } from "@/components/ui";
import { WIDGETS, type WidgetId } from "@/lib/dashboard-widgets";
import { getAccounts, getCashflow, getCategorySpend, getDashboardPrefs, getMonthTotals, getTransactions } from "@/lib/data/finance";
import { requireUser } from "@/lib/dal";
import { ACCOUNT_TYPE_LABEL, longDate, monthShort, rupiah, thisMonth, todayJakarta } from "@/lib/format";
import { findProvider } from "@/lib/providers";
import { CashflowChart } from "./cashflow-chart";
import { CategorySpend } from "./category-spend";
import { DashboardSettings } from "./dashboard-settings";
import { Hero } from "./hero";
import { QuickActions } from "./quick-actions";

export const metadata: Metadata = { title: "Beranda" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat ringkasan keuangan...</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const month = thisMonth();
  const [allAccounts, totals, recent, cashflow, catSpend, prefs, unread] = await Promise.all([
    getAccounts(),
    getMonthTotals(month),
    getTransactions({ limit: 5 }),
    getCashflow(6),
    getCategorySpend(month),
    getDashboardPrefs(),
    ensureTodayAlerts(),
  ]);
  const accounts = allAccounts.filter((a) => !a.archived);
  const monthName = monthShort(month);
  const firstName = user.name.split(/\s+/)[0];

  // Isi tiap widget; urutan mengikuti daftar WIDGETS.
  const content: Partial<Record<WidgetId, ReactNode>> = {
    quick: <QuickActions />,
    // Di desktop angka bulan ini ada di kartu saldo; kotak terpisah hanya untuk HP (seperti .mini di mockup).
    month: (
      <div className="flex gap-2.5 app:hidden">
        <div className="min-w-0 flex-1 rounded-[18px] bg-white p-3.5">
          <small className="text-xs text-muted">Pemasukan {monthName}</small>
          <b className="mt-0.5 block truncate text-[15px] text-plus">{rupiah(totals.income)}</b>
        </div>
        <div className="min-w-0 flex-1 rounded-[18px] bg-white p-3.5">
          <small className="text-xs text-muted">Pengeluaran {monthName}</small>
          <b className="mt-0.5 block truncate text-[15px]">{rupiah(totals.expense)}</b>
        </div>
      </div>
    ),
    cashflow: <CashflowChart data={cashflow} />,
    categories: <CategorySpend rows={catSpend} monthName={monthName} />,
    recent: (
      <section aria-labelledby="recent-title" className={`${card} h-full`}>
        <div className="mb-3 flex items-center justify-between gap-3 app:mb-4">
          <h2 id="recent-title" className="m-0 text-[15px] app:text-base">
            Transaksi terakhir
          </h2>
          {recent.length > 0 && (
            <Link href="/transaksi" className="text-[13px] font-bold text-g700 hover:underline">
              Lihat semua
            </Link>
          )}
        </div>
        {recent.length ? (
          <TxList rows={recent} />
        ) : (
          <p className="m-0 text-muted">
            Belum ada transaksi. Tekan tombol <b className="text-ink">+</b> atau <b className="text-ink">Catat</b> untuk mencatat yang pertama.
          </p>
        )}
      </section>
    ),
    balances: (
      <section aria-labelledby="acc-title" className={`${card} h-full`}>
        <div className="mb-3 flex items-center justify-between gap-3 app:mb-4">
          <h2 id="acc-title" className="m-0 text-[15px] app:text-base">
            Saldo per akun
          </h2>
          <Link href="/akun" className="text-[13px] font-bold text-g700 hover:underline">
            Atur
          </Link>
        </div>
        {accounts.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl bg-bg px-3 py-2.5 text-[13px]">
                <ProviderLogo provider={a.provider} type={a.type} size={38} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{a.name}</b>
                  <span className="text-muted">{findProvider(a.provider)?.label ?? ACCOUNT_TYPE_LABEL[a.type]}</span>
                </span>
                <b className={`whitespace-nowrap ${a.balance < 0 ? "text-danger" : ""}`}>{rupiah(a.balance)}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-muted">Belum ada akun. Tambahkan dari kartu saldo di atas.</p>
        )}
      </section>
    ),
  };

  // Grid 2 kolom sama lebar. Widget setengah-lebar yang jumlahnya ganjil: yang terakhir melebar penuh,
  // supaya tidak ada kolom kosong di kanan (layout selalu simetris).
  const visible = WIDGETS.filter((w) => prefs[w.id]);
  const halves = visible.filter((w) => !w.full);
  const lastHalfAlone = halves.length % 2 === 1 ? halves[halves.length - 1].id : null;

  return (
    <>
      {/* Desktop: .top di mockup web. */}
      <header className="hidden items-end gap-4 px-8 pt-6 app:flex">
        <div>
          <h1 className="m-0 text-2xl tracking-[-0.4px]">Halo, {firstName}</h1>
          <p className="mt-0.5 mb-0 text-muted">{longDate(todayJakarta())}</p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <BellLink unread={unread} />
          <DashboardSettings prefs={prefs} />
        </div>
      </header>

      <div className="flex flex-col gap-3.5 app:gap-6 app:px-8 app:pt-6 app:pb-12">
        <Hero
          userId={user.id}
          avatar={user.avatar}
          name={user.name}
          accounts={accounts}
          monthIncome={totals.income}
          monthExpense={totals.expense}
          monthName={monthName}
          showMonth={prefs.month}
          unread={unread}
        />

        <div className="grid grid-cols-1 gap-3.5 px-4 app:gap-6 app:px-0 wide:grid-cols-2">
          {visible.map((w) => (
            <div key={w.id} className={`min-w-0 ${w.full || w.id === lastHalfAlone ? "wide:col-span-2" : ""} ${w.id === "month" ? "app:hidden" : ""}`}>
              {content[w.id]}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="m-0 rounded-[22px] bg-white p-[18px] text-muted wide:col-span-2">
              Semua widget disembunyikan. Tekan <b className="text-ink">Atur tampilan</b> untuk menampilkannya lagi.
            </p>
          )}
          {/* Di HP tombol pengaturan ada di bawah widget (kepala halaman HP sudah penuh oleh kartu saldo). */}
          <DashboardSettings prefs={prefs} className="w-full app:hidden" />
        </div>
      </div>
    </>
  );
}
