"use client";

import { useState, useTransition } from "react";
import { Sheet, useCloseSheet } from "@/components/sheet";
import { errorBox, secondaryButton } from "@/components/ui";
import { undoImport } from "@/lib/actions/import";
import { rupiah } from "@/lib/format";

/** "Batalkan impor ini": menghapus semua transaksi dari file ini sekaligus, setelah konfirmasi. */
export function CancelImport({ batchId, count, incoming, outgoing }: { batchId: number; count: number; incoming: number; outgoing: number }) {
  return (
    <Sheet
      title="Batalkan impor ini?"
      buttonClassName="inline-flex min-h-11 items-center rounded-xl px-3 text-[13px] font-bold text-danger hover:bg-danger-bg"
      button="Batalkan impor ini"
    >
      <Confirm batchId={batchId} count={count} incoming={incoming} outgoing={outgoing} />
    </Sheet>
  );
}

function Confirm({ batchId, count, incoming, outgoing }: { batchId: number; count: number; incoming: number; outgoing: number }) {
  const close = useCloseSheet();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[14px]">
        <b>{count} transaksi</b> dari file ini akan dihapus dari Transaksi dan saldo akun.
      </p>
      <dl className="m-0 grid grid-cols-2 gap-2.5 text-[13px]">
        <div className="rounded-[14px] bg-bg p-3">
          <dt className="text-xs text-muted">Pemasukan dihapus</dt>
          <dd className="m-0 font-bold text-plus tabular-nums">{rupiah(incoming)}</dd>
        </div>
        <div className="rounded-[14px] bg-bg p-3">
          <dt className="text-xs text-muted">Pengeluaran dihapus</dt>
          <dd className="m-0 font-bold tabular-nums">{rupiah(outgoing)}</dd>
        </div>
      </dl>
      <p className="m-0 text-[13px] text-muted">
        Baris-barisnya kembali menjadi draft dan riwayat file tetap ada dengan tanda Dibatalkan, jadi bisa dimasukkan lagi bila ternyata benar. Transaksi yang Anda catat manual tidak ikut terhapus.
      </p>
      {error && (
        <p role="alert" className={`${errorBox} m-0`}>
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2.5 min-[480px]:flex-row min-[480px]:justify-end">
        <button type="button" onClick={close} className={secondaryButton}>
          Jangan batalkan
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError("");
              const res = await undoImport(batchId);
              if (res.error) setError(res.error);
              else close();
            })
          }
          className="inline-flex h-11 items-center justify-center rounded-xl bg-danger px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#8f2a25] active:translate-y-px disabled:bg-line disabled:text-muted"
        >
          {pending ? "Menghapus..." : `Hapus ${count} transaksi`}
        </button>
      </div>
    </div>
  );
}
