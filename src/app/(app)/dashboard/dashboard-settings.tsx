"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { darkButton, secondaryButton } from "@/components/ui";
import { saveDashboardPrefs } from "@/lib/actions/preferences";
import { DEFAULT_PREFS, WIDGETS, type DashboardPrefs } from "@/lib/dashboard-widgets";

/** Tombol "Atur tampilan" + dialog berisi sakelar untuk setiap widget beranda. */
export function DashboardSettings({ prefs, className = "" }: { prefs: DashboardPrefs; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState<DashboardPrefs>(prefs);
  const [saving, startSave] = useTransition();

  const open = () => {
    setDraft(prefs);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" onClick={open} className={`${secondaryButton} gap-2 ${className}`}>
        <Icon name="settings" />
        Atur tampilan
      </button>
      <dialog
        ref={ref}
        className="rf-sheet"
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
      >
        <div className="px-5 pt-2.5 pb-[calc(24px+env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-3.5 h-[5px] w-11 rounded-full bg-line app:hidden" aria-hidden="true" />
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 id={titleId} className="m-0 text-lg">
              Atur tampilan beranda
            </h2>
            <button type="button" onClick={close} aria-label="Tutup" className="grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink">
              <Icon name="close" />
            </button>
          </div>
          <p className="mt-0 mb-3 text-[13px] text-muted">Pilih data yang ingin ditampilkan. Ringkasan saldo selalu tampil. Pengaturan ini berlaku di HP dan komputer.</p>

          <ul className="m-0 mb-4 list-none p-0">
            {WIDGETS.map((w, i) => {
              const id = `${titleId}-${w.id}`;
              const on = draft[w.id];
              return (
                <li key={w.id} className={i ? "border-t border-line" : ""}>
                  <label htmlFor={id} className="flex min-h-14 cursor-pointer items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <b className="block text-sm">{w.label}</b>
                      <small className="text-xs text-muted">{w.hint}</small>
                    </span>
                    {/* Checkbox asli dengan role switch: bisa Tab + Spasi, dibaca pembaca layar sebagai sakelar. */}
                    <input
                      id={id}
                      type="checkbox"
                      role="switch"
                      checked={on}
                      onChange={(e) => setDraft((d) => ({ ...d, [w.id]: e.target.checked }))}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`relative h-7 w-12 flex-none rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-g700 ${on ? "bg-g800" : "bg-line"}`}
                    >
                      <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${on ? "translate-x-5" : ""}`} />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                startSave(async () => {
                  await saveDashboardPrefs(draft);
                  close();
                })
              }
              className={`${darkButton} flex-1`}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" onClick={() => setDraft(DEFAULT_PREFS)} className={secondaryButton}>
              Kembalikan bawaan
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
