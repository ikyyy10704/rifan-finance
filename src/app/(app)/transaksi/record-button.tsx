"use client";

import { Icon } from "@/components/icons";
import { useTxSheet } from "@/components/tx-sheet";

// Di HP tombol + sudah ada di menu bawah, jadi tombol ini hanya tampil di desktop.
export function RecordButton() {
  const openSheet = useTxSheet();
  return (
    <button
      type="button"
      onClick={() => openSheet()}
      className="hidden h-11 items-center gap-2 rounded-xl bg-lime px-5 font-bold text-g900 hover:bg-lime2 active:translate-y-px app:inline-flex"
    >
      <Icon name="plus" />
      Catat Transaksi
    </button>
  );
}
