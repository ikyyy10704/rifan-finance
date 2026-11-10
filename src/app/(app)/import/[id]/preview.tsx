"use client";

import { useMemo, useState, useTransition } from "react";
import { errorBox, okBox } from "@/components/ui";
import { commitImportRows, discardImportDrafts, updateImportRow } from "@/lib/actions/import";
import type { ImportRow } from "@/lib/data/imports";
import { rupiah, shortDate } from "@/lib/format";

type Cat = { id: number; name: string; kind: "income" | "expense"; archived: boolean };
type Acc = { id: number; name: string; archived: boolean };

const targetOf = (r: ImportRow) => (r.kind === "transfer" ? (r.toAccountId ? `t:${r.toAccountId}` : "") : r.categoryId ? `c:${r.categoryId}` : "");

export function ImportPreview({
  batchId,
  sourceAccountId,
  accountName,
  rows: initial,
  categories,
  accounts,
}: {
  batchId: number;
  sourceAccountId: number;
  accountName: string;
  rows: ImportRow[];
  categories: Cat[];
  accounts: Acc[];
}) {
  const [rows, setRows] = useState(initial);
  const drafts = rows.filter((r) => r.status === "draft");
  const [selected, setSelected] = useState<Set<number>>(() => new Set(drafts.map((r) => r.id)));
  const [saveState, setSaveState] = useState<Record<number, "saving" | "saved" | string>>({});
  const [showDone, setShowDone] = useState(false);
  const [committing, startCommit] = useTransition();
  const [result, setResult] = useState<{ ok?: string; error?: string }>({});

  // Data dari server berubah setelah commit: ambil ulang status baris tanpa menimpa pilihan yang masih draft.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setRows(initial);
    setSelected((s) => new Set([...s].filter((id) => initial.some((r) => r.id === id && r.status === "draft"))));
  }

  const expenseCats = categories.filter((c) => c.kind === "expense");
  const incomeCats = categories.filter((c) => c.kind === "income");
  const targets = accounts.filter((a) => a.id !== sourceAccountId);

  const picked = drafts.filter((r) => selected.has(r.id));
  const totals = useMemo(
    () => ({
      in: picked.filter((r) => r.direction === "credit").reduce((s, r) => s + r.amount, 0),
      out: picked.filter((r) => r.direction === "debit").reduce((s, r) => s + r.amount, 0),
    }),
    [picked],
  );
  const allChecked = drafts.length > 0 && picked.length === drafts.length;

  const save = async (id: number, input: { note?: string; target?: string }) => {
    setSaveState((s) => ({ ...s, [id]: "saving" }));
    const res = await updateImportRow(id, input);
    setSaveState((s) => ({ ...s, [id]: res.error ?? "saved" }));
  };

  const patch = (id: number, p: Partial<ImportRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const visible = showDone ? rows : rows.filter((r) => r.status === "draft");
  const doneCount = rows.length - drafts.length;

  return (
    <div className="flex flex-col gap-3">
      {result.ok && (
        <p role="status" className={`${okBox} m-0`}>
          {result.ok}
        </p>
      )}
      {result.error && (
        <p role="alert" className={`${errorBox} m-0`}>
          {result.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[13px] font-semibold">
          <input
            type="checkbox"
            checked={allChecked}
            disabled={drafts.length === 0}
            onChange={(e) => setSelected(e.target.checked ? new Set(drafts.map((r) => r.id)) : new Set())}
            className="h-5 w-5 accent-g800"
          />
          Pilih semua draft ({drafts.length})
        </label>
        {doneCount > 0 && (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[13px] text-muted">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="h-5 w-5 accent-g800" />
            Tampilkan yang sudah masuk ({doneCount})
          </label>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[18px] bg-white px-4 py-6 text-center app:border app:border-line">
          <p className="m-0 font-semibold">Semua baris sudah dimasukkan</p>
          <p className="mt-1 mb-0 text-[13px] text-muted">Transaksinya ada di halaman Transaksi.</p>
        </div>
      ) : (
        <ul className="m-0 list-none rounded-[18px] bg-white px-3 py-1 app:border app:border-line app:px-4">
          {visible.map((r, i) => {
            const isDraft = r.status === "draft";
            const credit = r.direction === "credit";
            const state = saveState[r.id];
            const missing = isDraft && !targetOf(r);
            return (
              <li key={r.id} className={`py-3 ${i ? "border-t border-line" : ""} ${isDraft ? "" : "opacity-60"}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Pilih ${r.note ?? r.rawDescription}, ${rupiah(r.amount)}`}
                    checked={isDraft && selected.has(r.id)}
                    disabled={!isDraft}
                    onChange={(e) =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (e.target.checked) n.add(r.id);
                        else n.delete(r.id);
                        return n;
                      })
                    }
                    className="mt-2.5 h-5 w-5 flex-none accent-g800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <small className="text-xs text-muted tabular-nums">
                        {shortDate(r.date)} · {r.time.slice(0, 5)}
                        {r.status === "imported" && <b className="ml-2 text-plus">Sudah masuk</b>}
                        {r.status === "duplicate" && <b className="ml-2 text-[#8A5E08]">Sudah ada di transaksi</b>}
                      </small>
                      <b className={`text-[14px] whitespace-nowrap tabular-nums ${credit ? "text-plus" : "text-ink"}`}>
                        {credit ? "+" : "−"}
                        {rupiah(r.amount)}
                      </b>
                    </div>

                    {isDraft ? (
                      <div className="mt-2 grid gap-2 app:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                        <div>
                          <label htmlFor={`note-${r.id}`} className="sr-only">
                            Keterangan
                          </label>
                          <input
                            id={`note-${r.id}`}
                            value={r.note ?? ""}
                            maxLength={200}
                            placeholder="Keterangan"
                            onChange={(e) => patch(r.id, { note: e.target.value })}
                            onBlur={(e) => e.target.value !== (initial.find((x) => x.id === r.id)?.note ?? "") && save(r.id, { note: e.target.value })}
                            className="h-11 w-full min-w-0 rounded-xl border border-line bg-white px-3 text-[15px] text-ink outline-none focus:border-g700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-g700"
                          />
                        </div>
                        <div>
                          <label htmlFor={`cat-${r.id}`} className="sr-only">
                            Kategori
                          </label>
                          <select
                            id={`cat-${r.id}`}
                            value={targetOf(r)}
                            onChange={(e) => {
                              const v = e.target.value;
                              const [k, idStr] = v.split(":");
                              patch(r.id, k === "t" ? { kind: "transfer", toAccountId: +idStr, categoryId: null } : { kind: credit ? "income" : "expense", categoryId: +idStr, toAccountId: null });
                              save(r.id, { target: v });
                            }}
                            className={`h-11 w-full min-w-0 rounded-xl border bg-white px-2.5 text-[15px] text-ink outline-none focus:border-g700 ${missing ? "border-danger" : "border-line"}`}
                          >
                            <option value="" disabled>
                              Pilih kategori
                            </option>
                            <optgroup label={credit ? "Kategori pemasukan" : "Kategori pengeluaran"}>
                              {(credit ? incomeCats : expenseCats)
                                .filter((c) => !c.archived || c.id === r.categoryId)
                                .map((c) => (
                                  <option key={c.id} value={`c:${c.id}`}>
                                    {c.name}
                                  </option>
                                ))}
                            </optgroup>
                            {!credit && targets.length > 0 && (
                              <optgroup label="Transfer ke akun sendiri">
                                {targets
                                  .filter((a) => !a.archived || a.id === r.toAccountId)
                                  .map((a) => (
                                    <option key={a.id} value={`t:${a.id}`}>
                                      Transfer ke {a.name}
                                    </option>
                                  ))}
                              </optgroup>
                            )}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 mb-0 truncate text-[14px] font-semibold">{r.note ?? r.rawDescription}</p>
                    )}

                    <div className="mt-1 flex items-start justify-between gap-3">
                      <small className="min-w-0 text-[11.5px] break-all text-muted">Bank: {r.rawDescription}</small>
                      {state && (
                        <small aria-live="polite" className={`flex-none text-[11.5px] ${state === "saving" || state === "saved" ? "text-muted" : "font-semibold text-danger"}`}>
                          {state === "saving" ? "Menyimpan..." : state === "saved" ? "Tersimpan" : state}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Bilah aksi menempel di bawah (di HP di atas menu bawah). */}
      <div className="sticky bottom-[calc(96px+env(safe-area-inset-bottom))] z-10 app:bottom-4">
        <div className="flex flex-wrap items-center gap-3 rounded-[18px] bg-g900 px-4 py-3 text-white shadow-[0_8px_24px_rgba(7,59,46,0.25)]">
          <div className="min-w-0 flex-1 text-[13px] leading-snug">
            <b className="block">{picked.length} baris dipilih</b>
            <span className="text-soft tabular-nums">
              masuk {rupiah(totals.in)} · keluar {rupiah(totals.out)}
            </span>
          </div>
          <button
            type="button"
            disabled={committing || picked.length === 0}
            onClick={() =>
              startCommit(async () => {
                setResult({});
                const res = await commitImportRows(
                  batchId,
                  picked.map((r) => r.id),
                );
                if (res.error) setResult({ error: res.error });
                else
                  setResult({
                    ok: `${res.imported} transaksi dimasukkan ke ${accountName}.${res.skipped ? ` ${res.skipped} dilewati karena sudah ada.` : ""} Sisa baris tetap tersimpan sebagai draft.`,
                  });
              })
            }
            className="h-12 w-full rounded-[14px] bg-lime px-5 text-[15px] font-extrabold text-g900 transition-colors hover:bg-lime2 active:translate-y-px disabled:bg-white/20 disabled:text-soft app:h-11 app:w-auto app:text-sm"
          >
            {committing ? "Memasukkan..." : "Masukkan ke database"}
          </button>
        </div>
      </div>

      {drafts.length > 0 && (
        <button
          type="button"
          onClick={() => {
            if (confirm(`Hapus ${drafts.length} baris draft dari impor ini? Transaksi yang sudah masuk tidak terhapus.`)) discardImportDrafts(batchId);
          }}
          className="self-center inline-flex min-h-11 items-center rounded-xl px-3 text-[13px] font-bold text-danger hover:bg-danger-bg"
        >
          Hapus draft yang tersisa
        </button>
      )}
    </div>
  );
}
