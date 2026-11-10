"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { useTxSheet } from "@/components/tx-sheet";

// Cincin aksi cepat (.qa + .ring di mockup). Import BRI dan Rencana menyusul saat fiturnya ada.
const RING: Record<string, string> = {
  green: "border-green text-green",
  red: "border-red text-red",
  blue: "border-blue text-blue",
  amber: "border-amber text-amber",
};

export function QuickActions() {
  const openSheet = useTxSheet();
  const item = (icon: IconName, tone: string, label: string) => (
    <>
      <span className={`grid h-[52px] w-[52px] place-items-center rounded-full border-[1.5px] app:h-[58px] app:w-[58px] ${RING[tone]}`}>
        <Icon name={icon} className="h-[22px] w-[22px] app:h-6 app:w-6" />
      </span>
      {label}
    </>
  );
  const cls =
    "flex flex-col items-center gap-2 rounded-2xl px-1 py-1 text-xs font-semibold text-ink hover:bg-bg active:translate-y-px app:gap-2.5 app:py-2 app:text-sm";

  return (
    <section aria-label="Aksi cepat" className="rounded-[22px] bg-white p-[18px] app:rounded-[20px] app:border app:border-line app:p-[22px]">
      <div className="grid grid-cols-4 gap-1 text-center app:gap-3">
        <button type="button" className={cls} onClick={() => openSheet({ type: "income" })}>
          {item("income", "green", "Pemasukan")}
        </button>
        <button type="button" className={cls} onClick={() => openSheet({ type: "expense" })}>
          {item("expense", "red", "Pengeluaran")}
        </button>
        <button type="button" className={cls} onClick={() => openSheet({ type: "transfer" })}>
          {item("transfer", "blue", "Transfer")}
        </button>
        {/* Sesuai mockup: aksi cepat ke Import BRI (Akun sudah ada di menu bawah). */}
        <Link href="/import" className={cls}>
          {item("income", "amber", "Import BRI")}
        </Link>
      </div>
    </section>
  );
}
