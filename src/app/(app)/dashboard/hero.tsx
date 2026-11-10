"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { useTxSheet } from "@/components/tx-sheet";
import type { AccountWithBalance } from "@/lib/data/finance";
import { Avatar } from "@/components/avatar";
import { rupiah } from "@/lib/format";

// Pilihan "sembunyikan saldo" diingat per perangkat. localStorage bisa diblokir, jadi selalu try/catch.
const HIDE_KEY = "rf_hide_balance";
const HIDE_EVENT = "rf-hide-balance";
let hiddenFallback = false;
function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return hiddenFallback;
  }
}
function writeHidden(v: boolean) {
  hiddenFallback = v;
  try {
    localStorage.setItem(HIDE_KEY, v ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event(HIDE_EVENT));
}
function subscribeHidden(cb: () => void) {
  window.addEventListener(HIDE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(HIDE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * HP: .head di mockup mobile (sapaan, saldo di tengah, Catat/Transfer, chip akun).
 * Desktop: .hero di mockup web (saldo kiri, panel akun kanan).
 */
export function Hero({
  userId,
  avatar,
  name,
  accounts,
  monthIncome,
  monthExpense,
  monthName,
  showMonth,
}: {
  showMonth: boolean;
  userId: number;
  avatar: string | null;
  name: string;
  accounts: AccountWithBalance[];
  monthIncome: number;
  monthExpense: number;
  monthName: string;
}) {
  const openSheet = useTxSheet();
  const hidden = useSyncExternalStore(subscribeHidden, readHidden, () => false);
  const [selected, setSelected] = useState<number | "all">("all");
  const toggleHidden = () => writeHidden(!hidden);

  const picked = selected === "all" ? undefined : accounts.find((a) => a.id === selected);
  const total = picked ? picked.balance : accounts.reduce((s, a) => s + a.balance, 0);
  const label = picked ? `Saldo ${picked.name}` : "Total Saldo Anda";
  const shown = hidden ? "Rp•••••••" : rupiah(total);

  const eye = (
    <button
      type="button"
      onClick={toggleHidden}
      aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
      aria-pressed={hidden}
      className="grid h-11 w-11 place-items-center rounded-lg text-lime hover:bg-white/10"
    >
      <Icon name={hidden ? "eyeOff" : "eye"} className="h-[22px] w-[22px]" />
    </button>
  );

  const chips = (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] app:flex-wrap app:overflow-visible">
      <Chip on={selected === "all"} onClick={() => setSelected("all")}>
        Semua
      </Chip>
      {accounts.map((a) => (
        <Chip key={a.id} on={selected === a.id} onClick={() => setSelected(a.id)}>
          {a.name}
        </Chip>
      ))}
      <Link
        href="/akun"
        className="inline-flex h-11 flex-none items-center gap-1.5 rounded-[10px] border border-g900 bg-g900 px-3 text-xs font-semibold whitespace-nowrap text-white hover:bg-[#052b22] app:text-[13px]"
      >
        <Icon name="plusCircle" className="h-4 w-4" />
        {accounts.length ? "Tambah" : "Tambah akun"}
      </Link>
    </div>
  );

  return (
    <section
      aria-label="Ringkasan saldo"
      className="on-dark relative overflow-hidden rounded-b-[32px] bg-g800 px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-[22px] text-white app:grid app:grid-cols-1 app:gap-6 app:rounded-[28px] app:p-7 wide:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
    >
      {/* Sapaan hanya di HP; di desktop sapaan ada di atas halaman. */}
      <div className="flex items-center gap-3 app:hidden">
        <Link href="/profil" aria-label="Profil" className="flex-none rounded-full">
          <Avatar userId={userId} name={name} avatar={avatar} size={42} className="border-2 border-white/40" />
        </Link>
        <div className="text-[13px] leading-tight text-soft">
          Halo,
          <h1 className="m-0 text-[15px] font-bold text-white">{name}</h1>
        </div>
      </div>

      <div className="relative z-10">
        <div className="mt-[22px] mb-[18px] text-center app:m-0 app:text-left">
          <small className="text-sm font-medium text-lime app:text-[14px]">{label}</small>
          <div className="mt-1 flex items-center justify-center gap-2 app:mt-1.5 app:mb-5 app:justify-start app:gap-3">
            <strong className="text-[32px] font-extrabold tracking-[-0.8px] app:text-[38px] app:tracking-[-1px]" aria-live="polite">
              {shown}
            </strong>
            {eye}
          </div>
        </div>
        <div className="flex justify-center gap-3 app:justify-start">
          <button
            type="button"
            onClick={() => openSheet({ type: "expense" })}
            className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-lime px-[18px] text-[15px] font-bold text-g900 hover:bg-lime2 active:translate-y-px app:px-5 app:text-sm"
          >
            <Icon name="plus" className="hidden h-5 w-5 app:block" />
            <span className="app:hidden">Catat</span>
            <span className="hidden app:inline">Catat Transaksi</span>
          </button>
          <button
            type="button"
            onClick={() => openSheet({ type: "transfer" })}
            className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-lime px-[18px] text-[15px] font-bold text-g900 hover:bg-lime2 active:translate-y-px app:bg-white/10 app:px-5 app:text-sm app:text-white app:hover:bg-white/16"
          >
            <Icon name="transfer" className="hidden h-5 w-5 app:block" />
            Transfer
          </button>
        </div>
        {showMonth && (
          <div className="mt-3.5 hidden grid-cols-2 gap-2.5 app:grid">
            <Flow label={`Pemasukan ${monthName}`} value={rupiah(monthIncome)} />
            <Flow label={`Pengeluaran ${monthName}`} value={rupiah(monthExpense)} />
          </div>
        )}
      </div>

      <div className="relative z-10 mt-5 rounded-[20px] bg-white/10 p-3.5 app:mt-0 app:bg-white/8 app:p-[18px]">
        <p className="m-0 mb-2.5 font-semibold app:mb-3">Akun Anda</p>
        {chips}
        {accounts.length === 0 && (
          <p className="mt-2.5 mb-0 text-[13px] text-soft">Belum ada akun. Tambahkan BRI, Tunai, atau GoPay untuk mulai mencatat.</p>
        )}
      </div>

      {/* Lingkaran samar di pojok kanan atas, sama dengan .hero::after di mockup web. */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-20 hidden h-[260px] w-[260px] rounded-full bg-lime/8 app:block" />
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`h-11 flex-none rounded-[10px] border px-3 text-xs font-semibold whitespace-nowrap app:px-3.5 app:text-[13px] ${
        on ? "border-lime bg-lime text-g900" : "border-white/40 bg-transparent text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Flow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-black/15 p-3">
      <small className="text-xs text-[#B9D3CA]">{label}</small>
      <b className="mt-0.5 block truncate text-base">{value}</b>
    </div>
  );
}
