import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { TxList } from "@/components/tx-list";
import { darkButton, fieldInput, fieldLabel } from "@/components/ui";
import { getAccounts, getTransactions, type TxRow } from "@/lib/data/finance";
import { requireUser } from "@/lib/dal";
import { isMonth, longDate, monthLabel, rupiah, shiftMonth, thisMonth, todayJakarta } from "@/lib/format";
import { DailyChart } from "./daily-chart";
import { RecordButton } from "./record-button";

export const metadata: Metadata = { title: "Transaksi" };

export default function TransaksiPage({ searchParams }: PageProps<"/transaksi">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat transaksi...</p>}>
      <Transaksi searchParams={searchParams} />
    </Suspense>
  );
}

async function Transaksi({ searchParams }: { searchParams: PageProps<"/transaksi">["searchParams"] }) {
  await requireUser(); // sesi dulu: menunggu request asli sebelum menghitung "bulan ini"
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const current = thisMonth();
  const month = isMonth(one(sp.bulan)) ? one(sp.bulan)! : current;
  const q = (one(sp.cari) ?? "").trim().slice(0, 60);
  const accountId = Number(one(sp.akun)) || undefined;

  const [rows, accounts] = await Promise.all([getTransactions({ month, accountId, q: q || undefined }), getAccounts()]);
  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const net = income - expense;

  // Pengeluaran per tanggal untuk grafik harian (mengikuti filter yang sedang aktif).
  const [yy, mm] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const daily = Array.from({ length: daysInMonth }, () => 0);
  for (const r of rows) if (r.type === "expense") daily[Number(r.date.slice(8, 10)) - 1] += r.amount;
  const today = month === current ? Number(todayJakarta().slice(8, 10)) : null;

  const byDate = new Map<string, TxRow[]>();
  for (const r of rows) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);

  const href = (o: { bulan?: string; akun?: number | null; cari?: string }) => {
    const p = new URLSearchParams();
    const b = o.bulan ?? month;
    const a = o.akun === undefined ? accountId : o.akun;
    const c = o.cari ?? q;
    if (b !== current) p.set("bulan", b);
    if (c) p.set("cari", c);
    if (a) p.set("akun", String(a));
    const s = p.toString();
    return s ? `/transaksi?${s}` : "/transaksi";
  };
  const filtered = !!(q || accountId);
  const canNext = month < current;
  const activeAccounts = accounts.filter((a) => !a.archived || a.id === accountId);

  // Desktop: pemilih bulan ringkas di samping tombol Catat Transaksi.
  const monthNav = (
    <nav aria-label="Pilih bulan" className="flex h-11 items-center rounded-xl border border-line bg-white">
      <Link href={href({ bulan: shiftMonth(month, -1) })} aria-label="Bulan sebelumnya" className="grid h-full w-11 place-items-center rounded-l-xl text-g800 hover:bg-bg">
        <Icon name="chevronLeft" />
      </Link>
      <b className="min-w-[132px] px-1 text-center text-[14px]">{monthLabel(month)}</b>
      {canNext ? (
        <Link href={href({ bulan: shiftMonth(month, 1) })} aria-label="Bulan berikutnya" className="grid h-full w-11 place-items-center rounded-r-xl text-g800 hover:bg-bg">
          <Icon name="chevronRight" />
        </Link>
      ) : (
        <span aria-hidden="true" className="grid h-full w-11 place-items-center text-line">
          <Icon name="chevronRight" />
        </span>
      )}
    </nav>
  );

  return (
    <>
      {/* ===== HP: bilah judul ringkas dengan bulan di kanan ===== */}
      <header className="sticky top-0 z-10 bg-bg/90 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 backdrop-blur-md app:hidden">
        <div className="flex min-h-11 items-center gap-2">
          <Link href="/dashboard" aria-label="Beranda Rifan Finance" className="flex-none">
            <Image src="/icons/icon-192.png" alt="" width={34} height={34} className="rounded-[10px]" />
          </Link>
          <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.5px]">Transaksi</h1>
          <nav aria-label="Pilih bulan" className="ml-auto flex items-center">
            <Link href={href({ bulan: shiftMonth(month, -1) })} aria-label="Bulan sebelumnya" className="grid h-11 w-10 place-items-center rounded-xl text-g800 active:bg-white">
              <Icon name="chevronLeft" />
            </Link>
            <b className="min-w-[72px] text-center text-[14px]">{monthShortLabel(month)}</b>
            {canNext ? (
              <Link href={href({ bulan: shiftMonth(month, 1) })} aria-label="Bulan berikutnya" className="grid h-11 w-10 place-items-center rounded-xl text-g800 active:bg-white">
                <Icon name="chevronRight" />
              </Link>
            ) : (
              <span className="h-11 w-10" aria-hidden="true" />
            )}
          </nav>
        </div>
      </header>

      <div className="px-4 pt-1 app:hidden">
        {/* Ringkasan: baris angka, tanpa kotak */}
        <dl className="m-0 grid grid-cols-3 gap-3">
          <PlainStat label="Masuk" value={rupiah(income)} tone="text-plus" />
          <PlainStat label="Keluar" value={rupiah(expense)} />
          <PlainStat label="Selisih" value={rupiah(net)} />
        </dl>
        {/* Grafik harian di satu kotak putih */}
        <div className="mt-4 rounded-[18px] bg-white px-4 pt-3.5 pb-3">
          <DailyChart month={month} values={daily} today={today} />
        </div>

        {/* Cari + chip akun */}
        <div className="mt-4">
        {/* Cari + jalan masuk Import mutasi BRI (dipindah dari halaman Akun: hasil impor masuk ke daftar ini). */}
        <div className="flex gap-2">
        <form action="/transaksi" role="search" className="relative min-w-0 flex-1">
          {month !== current && <input type="hidden" name="bulan" value={month} />}
          {accountId && <input type="hidden" name="akun" value={accountId} />}
          <label htmlFor="cari-hp" className="sr-only">
            Cari catatan atau kategori
          </label>
          <span className="pointer-events-none absolute top-0 left-3.5 grid h-12 place-items-center text-muted">
            <Icon name="search" />
          </span>
          <input
            id="cari-hp"
            name="cari"
            type="search"
            enterKeyHint="search"
            defaultValue={q}
            placeholder="Cari catatan atau kategori"
            className="h-12 w-full rounded-2xl border border-line bg-white pr-4 pl-11 text-base text-ink outline-none placeholder:text-muted focus:border-g700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-g700"
          />
          <button type="submit" className="sr-only">
            Cari
          </button>
        </form>
        <Link
          href="/import"
          aria-label="Import mutasi BRI"
          className="inline-flex h-12 flex-none items-center gap-1.5 rounded-2xl border border-line bg-white px-3.5 text-[13px] font-bold text-g800 active:translate-y-px"
        >
          <Icon name="income" className="h-[18px] w-[18px]" />
          Import
        </Link>
        </div>
        {activeAccounts.length > 0 && (
          <nav aria-label="Filter akun" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <Chip href={href({ akun: null })} on={!accountId}>
              Semua akun
            </Chip>
            {activeAccounts.map((a) => (
              <Chip key={a.id} href={href({ akun: a.id })} on={accountId === a.id}>
                {a.name}
              </Chip>
            ))}
          </nav>
        )}
        {q && (
          <p className="mt-3 mb-0 flex items-center justify-between gap-3 text-[13px] text-muted">
            <span>
              Hasil untuk <b className="text-ink">&ldquo;{q}&rdquo;</b>
            </span>
            <Link href={href({ cari: "" })} className="inline-flex min-h-11 items-center font-bold text-g700">
              Hapus
            </Link>
          </p>
        )}
        </div>
      </div>

      {/* ===== Desktop: judul + bulan + tombol catat dalam satu baris ===== */}
      <header className="hidden items-center gap-4 px-8 pt-6 app:flex">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-bold tracking-[-0.4px]">Transaksi</h1>
          <p className="mt-0.5 mb-0 text-muted">Pemasukan, pengeluaran, dan transfer per bulan</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {monthNav}
          <RecordButton />
        </div>
      </header>

      <div className="hidden flex-col gap-4 px-8 pt-6 app:flex">
        {/* Tiga angka di kiri (bertumpuk di layar lebar), grafik harian di kanan dengan tinggi yang sama. */}
        <section aria-label={`Ringkasan ${monthLabel(month)}`} className="grid gap-4 wide:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <dl className="m-0 grid grid-cols-3 gap-3 wide:grid-cols-1">
            <Stat label="Pemasukan" value={rupiah(income)} tone="text-plus" />
            <Stat label="Pengeluaran" value={rupiah(expense)} />
            <Stat label="Selisih" value={rupiah(net)} tone={net < 0 ? "text-danger" : "text-ink"} />
          </dl>
          <div className="rounded-[20px] border border-line bg-white p-5">
            <DailyChart month={month} values={daily} today={today} tall />
          </div>
        </section>

        {/* Filter tepat di atas daftar yang disaringnya. */}
        <form action="/transaksi" role="search" className="flex flex-wrap items-end gap-3 rounded-[20px] border border-line bg-white px-5 py-4">
          {month !== current && <input type="hidden" name="bulan" value={month} />}
          <div className="min-w-[220px] flex-[2]">
            <label htmlFor="cari" className={fieldLabel}>
              Cari catatan atau kategori
            </label>
            <input id="cari" name="cari" type="search" defaultValue={q} placeholder="Contoh: makan siang" className={fieldInput} />
          </div>
          <div className="min-w-[180px] flex-1">
            <label htmlFor="akun" className={fieldLabel}>
              Akun
            </label>
            <select id="akun" name="akun" defaultValue={accountId ?? ""} className={fieldInput}>
              <option value="">Semua akun</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.archived ? " (arsip)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={`${darkButton} h-[46px] px-5`}>
            Terapkan
          </button>
          {filtered && (
            <Link href={href({ akun: null, cari: "" })} className="inline-flex h-[46px] items-center rounded-xl px-3 text-[13px] font-bold text-g700 hover:bg-bg">
              Hapus filter
            </Link>
          )}
        </form>
      </div>

      {/* ===== Daftar per tanggal: judul di luar, isi di kotak putih (daftar bergrup gaya aplikasi) ===== */}
      <div className="flex flex-col gap-4 px-4 pt-4 pb-4 app:gap-5 app:px-8 app:pt-6 app:pb-12">
        {rows.length === 0 ? (
          <div className="rounded-[18px] bg-white px-4 py-6 text-center app:border app:border-line">
            <p className="m-0 font-semibold">{filtered ? "Tidak ada yang cocok" : `Belum ada transaksi di ${monthLabel(month)}`}</p>
            <p className="mt-1 mb-0 text-[13px] text-muted">
              {filtered ? (
                "Coba kata lain atau pilih Semua akun."
              ) : (
                <>
                  <span className="app:hidden">Tekan tombol + di bawah untuk mencatat transaksi pertama.</span>
                  <span className="hidden app:inline">Tekan Catat Transaksi di kanan atas untuk mencatat transaksi pertama.</span>
                </>
              )}
            </p>
          </div>
        ) : (
          [...byDate].map(([date, list]) => {
            const out = list.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
            return (
              <section key={date} aria-labelledby={`d-${date}`}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
                  <h2 id={`d-${date}`} className="m-0 text-[13px] text-muted">
                    {longDate(date).replace(/ \d{4}$/, "")}
                  </h2>
                  {out > 0 && <span className="text-xs text-muted tabular-nums">keluar {rupiah(out)}</span>}
                </div>
                <div className="rounded-[18px] bg-white px-4 py-1 app:border app:border-line app:px-5">
                  <TxList rows={list} showDate={false} />
                </div>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}

function PlainStat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`m-0 truncate text-[15px] font-extrabold tracking-[-0.2px] tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

const monthShortLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("id-ID", { month: "short", year: "numeric", timeZone: "UTC" });
};

function Stat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-line bg-white px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`m-0 mt-0.5 truncate text-[20px] font-extrabold tracking-[-0.3px] tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      className={`inline-flex h-11 flex-none items-center rounded-[10px] border px-4 text-[13px] font-semibold whitespace-nowrap active:scale-95 ${
        on ? "border-g800 bg-g800 text-white" : "border-line bg-white text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
