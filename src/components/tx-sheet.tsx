"use client";

import Link from "next/link";
import { createContext, use, useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import type { TxType } from "@/db/schema";
import { deleteTransaction, saveTransaction, type TxFormState } from "@/lib/actions/transactions";
import type { AccountWithBalance, Category, TxRow } from "@/lib/data/finance";
import { AmountInput } from "./amount-input";
import { Icon } from "./icons";
import { errorBox, fieldInput, fieldLabel, primaryButton } from "./ui";
import { keepFormSubmit } from "./use-keep-form";

type OpenArgs = { type?: TxType; tx?: TxRow };
const SheetContext = createContext<((args?: OpenArgs) => void) | null>(null);

export function useTxSheet() {
  const open = use(SheetContext);
  if (!open) throw new Error("useTxSheet harus di dalam TxSheetProvider");
  return open;
}

const TYPE_LABEL: Record<TxType, string> = { income: "Pemasukan", expense: "Pengeluaran", transfer: "Transfer" };
const todayJakarta = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

export function TxSheetProvider({
  accounts,
  categories,
  children,
}: {
  accounts: AccountWithBalance[];
  categories: Category[];
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // key memaksa form dibuat ulang setiap kali sheet dibuka, jadi isian lama tidak tertinggal.
  const [session, setSession] = useState<{ key: number; type: TxType; tx?: TxRow; date: string } | null>(null);

  const open = (args: OpenArgs = {}) => {
    setSession({ key: Date.now(), type: args.tx?.type ?? args.type ?? "expense", tx: args.tx, date: args.tx?.date ?? todayJakarta() });
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <SheetContext value={open}>
      {children}
      <dialog
        ref={dialogRef}
        className="rf-sheet"
        aria-labelledby="tx-sheet-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) close(); // klik latar gelap menutup sheet
        }}
        onClose={() => setSession(null)}
      >
        {session && (
          <TxForm
            key={session.key}
            type={session.type}
            tx={session.tx}
            date={session.date}
            accounts={accounts}
            categories={categories}
            onDone={close}
          />
        )}
      </dialog>
    </SheetContext>
  );
}

function TxForm({
  type: initialType,
  tx,
  date,
  accounts,
  categories,
  onDone,
}: {
  type: TxType;
  tx?: TxRow;
  date: string;
  accounts: AccountWithBalance[];
  categories: Category[];
  onDone: () => void;
}) {
  const [type, setType] = useState<TxType>(initialType);
  const [state, action, pending] = useActionState<TxFormState, FormData>(saveTransaction, {});
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string>();

  useEffect(() => {
    if (state.savedAt) onDone();
  }, [state.savedAt, onDone]);

  // Akun arsip disembunyikan, kecuali akun yang sudah dipakai transaksi yang sedang diubah.
  const usable = accounts.filter((a) => !a.archived || a.id === tx?.accountId || a.id === tx?.toAccountId);
  // Kategori yang disembunyikan tidak ditawarkan, kecuali yang sedang dipakai transaksi yang diubah.
  const cats = categories.filter((c) => c.kind === type && (!c.archived || c.id === tx?.categoryId));
  const editing = !!tx;
  const error = state.error ?? deleteError;

  const header = (
    <div className="sticky top-0 z-10 bg-white px-5 pt-2.5">
      <div className="mx-auto mb-3.5 h-[5px] w-11 rounded-full bg-line app:hidden" aria-hidden="true" />
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 id="tx-sheet-title" className="m-0 text-lg font-bold">
          {editing ? "Ubah Transaksi" : "Catat Transaksi"}
        </h2>
        <button
          type="button"
          onClick={onDone}
          aria-label="Tutup"
          className="grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink"
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
  );

  if (usable.length === 0) {
    return (
      <div className="pb-6">
        {header}
        <div className="px-5">
          <p className="mt-0 mb-4 text-muted">
            Belum ada akun. Tambahkan akun dulu (misalnya BRI, Tunai, atau GoPay), lalu catat transaksinya.
          </p>
          <Link href="/akun" onClick={onDone} className={`${primaryButton} grid place-items-center`}>
            Tambah akun
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={keepFormSubmit(action)} className="pb-[calc(24px+env(safe-area-inset-bottom))]">
      {header}
      <div className="px-5">
        {tx && <input type="hidden" name="id" value={tx.id} />}
        <input type="hidden" name="type" value={type} />

        <div role="group" aria-label="Jenis transaksi" className="mb-3.5 flex gap-2">
          {(["income", "expense", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={`h-11 min-w-0 flex-1 rounded-xl border text-[13px] font-bold transition-colors ${
                type === t ? "border-g800 bg-g800 text-white" : "border-line bg-white text-muted hover:text-ink"
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className={`${errorBox} mt-0 mb-3`}>
            {error}
          </p>
        )}

        <label htmlFor="tx-amount" className={fieldLabel}>
          Nominal
        </label>
        <AmountInput
          id="tx-amount"
          name="amount"
          required
          defaultValue={tx?.amount}
          className={`${fieldInput} mb-3 h-14 text-[22px] font-extrabold`}
        />

        <div className="flex gap-2.5">
          {type === "transfer" ? (
            <>
              <SelectField id="tx-from" name="accountId" label="Dari akun" defaultValue={tx?.accountId ?? usable[0]?.id} options={usable} />
              <SelectField id="tx-to" name="toAccountId" label="Ke akun" defaultValue={tx?.toAccountId ?? usable[1]?.id} options={usable} />
            </>
          ) : (
            <>
              {/* Default pilihan pertama, seperti mockup: mencatat cukup isi nominal lalu Simpan. */}
              <SelectField
                key={type}
                id="tx-cat"
                name="categoryId"
                label="Kategori"
                defaultValue={(tx?.type === type ? tx.categoryId : null) ?? cats[0]?.id}
                options={cats}
              />
              <SelectField id="tx-acc" name="accountId" label="Akun" defaultValue={tx?.accountId ?? usable[0]?.id} options={usable} />
            </>
          )}
        </div>

        <div className="flex gap-2.5">
          <div className="mb-3 min-w-0 flex-1">
            <label htmlFor="tx-date" className={fieldLabel}>
              Tanggal
            </label>
            <input id="tx-date" name="date" type="date" required defaultValue={date} className={fieldInput} />
          </div>
          <div className="mb-3 min-w-0 flex-1">
            <label htmlFor="tx-note" className={fieldLabel}>
              Catatan
            </label>
            <input id="tx-note" name="note" placeholder="Opsional" maxLength={200} defaultValue={tx?.note ?? ""} className={fieldInput} />
          </div>
        </div>

        <button type="submit" disabled={pending || deleting} className={`${primaryButton} mt-1`}>
          {pending ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan"}
        </button>

        {tx && (
          <button
            type="button"
            disabled={pending || deleting}
            onClick={() => {
              if (!confirm("Hapus transaksi ini? Saldo akun akan dihitung ulang.")) return;
              startDelete(async () => {
                const res = await deleteTransaction(tx.id);
                if (res.error) setDeleteError(res.error);
                else onDone();
              });
            }}
            className="mt-2 h-11 w-full rounded-[14px] text-[14px] font-bold text-danger hover:bg-danger-bg disabled:text-muted"
          >
            {deleting ? "Menghapus..." : "Hapus transaksi"}
          </button>
        )}
      </div>
    </form>
  );
}

function SelectField({
  id,
  name,
  label,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: number;
  options: { id: number; name: string }[];
}) {
  return (
    <div className="mb-3 min-w-0 flex-1">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <select id={id} name={name} required defaultValue={defaultValue ?? ""} className={`${fieldInput} pr-2`}>
        <option value="" disabled>
          Pilih
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
