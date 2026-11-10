"use client";

import type { TxRow } from "@/lib/data/finance";
import { shortDate, txAmount } from "@/lib/format";
import { categoryIcon, Icon, TONE } from "./icons";
import { useTxSheet } from "./tx-sheet";

// Baris transaksi meniru .tx li di mockup. Seluruh baris adalah tombol untuk mengubah transaksi.
export function TxList({ rows, showDate = true }: { rows: TxRow[]; showDate?: boolean }) {
  const openSheet = useTxSheet();
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((t, i) => {
        const transfer = t.type === "transfer";
        const title = t.note || (transfer ? "Transfer" : (t.categoryName ?? "Transaksi"));
        const meta = transfer
          ? `Transfer · ${t.accountName} → ${t.toAccountName ?? "?"}`
          : `${t.categoryName ?? "Tanpa kategori"} · ${t.accountName}`;
        return (
          <li key={t.id} className={i ? "border-t border-line" : ""}>
            <button
              type="button"
              onClick={() => openSheet({ tx: t })}
              aria-label={`Ubah transaksi ${title}, ${txAmount(t.type, t.amount)}`}
              className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-bg app:gap-3.5 app:py-3.5"
            >
              <span
                className={`grid h-[42px] w-[42px] flex-none place-items-center rounded-full app:h-11 app:w-11 ${
                  transfer ? TONE.b : (TONE[t.categoryColor ?? "l"] ?? TONE.l)
                }`}
              >
                <Icon name={transfer ? "transfer" : categoryIcon(t.categoryIcon)} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px] app:text-sm">{title}</b>
                <small className="block truncate text-xs text-muted app:text-[13px]">{meta}</small>
              </span>
              <span className="text-right whitespace-nowrap">
                <b className={`block text-[13.5px] app:text-sm ${t.type === "income" ? "text-plus" : "text-ink"}`}>
                  {txAmount(t.type, t.amount)}
                </b>
                {showDate && <small className="text-[11.5px] text-muted app:text-[13px]">{shortDate(t.date)}</small>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
