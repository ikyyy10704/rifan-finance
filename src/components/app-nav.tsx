"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./avatar";
import { BrandText, LogoMark } from "./brand";
import { Icon, type IconName } from "./icons";
import { useTxSheet } from "./tx-sheet";

type Item = { href: string; label: string; icon: IconName };

// Hanya halaman yang sudah ada. Kalender, Rencana, Laporan, Anggaran, dan Import BRI
// masuk menu begitu halamannya selesai dibangun.
const MAIN: Item[] = [
  { href: "/dashboard", label: "Beranda", icon: "home" },
  { href: "/transaksi", label: "Transaksi", icon: "list" },
  { href: "/akun", label: "Akun & Dompet", icon: "wallet" },
  { href: "/kategori", label: "Kategori", icon: "tag" },
];
const DATA: Item[] = [{ href: "/import", label: "Import Mutasi BRI", icon: "income" }];
const ADMIN: Item[] = [{ href: "/admin/pengguna", label: "Kelola Pengguna", icon: "users" }];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

type NavUser = { id: number; name: string; role: "admin" | "user"; avatar: string | null };

/** Sidebar desktop, gaya .sidebar di rifan-finance-web.html. */
export function Sidebar({ user }: { user: NavUser }) {
  const path = usePathname();
  const link = (it: Item) => {
    const on = isActive(path, it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-[11px] ${
          on ? "bg-lime font-bold text-g900" : "font-medium hover:bg-white/6 hover:text-white"
        }`}
      >
        <Icon name={it.icon} />
        {it.label}
      </Link>
    );
  };

  return (
    <aside
      aria-label="Navigasi utama"
      className="on-dark sticky top-0 hidden h-dvh w-[248px] flex-none flex-col gap-7 bg-g900 px-4 py-6 text-soft app:flex"
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 text-lg">
        <LogoMark size={36} />
        <BrandText />
      </Link>
      <nav className="flex flex-col gap-1">
        {MAIN.map(link)}
        <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-[1px] text-[#8FB0A4] uppercase">Data</div>
        {DATA.map(link)}
        {user.role === "admin" && (
          <>
            <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-[1px] text-[#8FB0A4] uppercase">Admin</div>
            {ADMIN.map(link)}
          </>
        )}
      </nav>
      <Link
        href="/profil"
        aria-current={isActive(path, "/profil") ? "page" : undefined}
        className="mt-auto flex items-center gap-2.5 rounded-2xl bg-white/6 p-3.5 hover:bg-white/10"
      >
        <Avatar userId={user.id} name={user.name} avatar={user.avatar} size={38} />
        <span className="min-w-0">
          <b className="block truncate text-[13px] text-white">{user.name}</b>
          <small className="text-xs">Profil dan keluar</small>
        </span>
      </Link>
    </aside>
  );
}

/** Menu bawah HP, gaya .bnav di rifan-finance-mobile.html (tombol + di tengah). */
export function BottomNav() {
  const path = usePathname();
  const openSheet = useTxSheet();
  const items: Item[] = [
    MAIN[0],
    MAIN[1],
    { href: "/akun", label: "Akun", icon: "wallet" },
    { href: "/profil", label: "Profil", icon: "user" },
  ];
  const link = (it: Item) => {
    const on = isActive(path, it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={`flex min-h-12 min-w-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${on ? "text-lime" : "text-nav"}`}
      >
        <Icon name={it.icon} className="h-[22px] w-[22px]" />
        {it.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigasi bawah"
      className="on-dark fixed inset-x-3 bottom-[calc(14px+env(safe-area-inset-bottom))] z-20 flex h-[72px] items-center justify-around rounded-[26px] bg-g900 px-1.5 app:hidden"
    >
      {link(items[0])}
      {link(items[1])}
      <button
        type="button"
        onClick={() => openSheet()}
        aria-label="Catat transaksi"
        className="-mt-[34px] grid h-[62px] w-[62px] place-items-center rounded-full border-[6px] border-bg bg-lime text-g900 active:scale-95"
      >
        <Icon name="plus" className="h-7 w-7" />
      </button>
      {link(items[2])}
      {link(items[3])}
    </nav>
  );
}
