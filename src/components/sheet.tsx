"use client";

import { createContext, use, useId, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

const CloseContext = createContext<() => void>(() => {});
/** Dipakai isi sheet untuk menutup dirinya sendiri (misalnya setelah berhasil menyimpan). */
export const useCloseSheet = () => use(CloseContext);

/**
 * Sheet dari bawah (HP) / dialog di tengah (desktop) beserta tombol pemicunya.
 * Memakai <dialog> bawaan: Escape menutup, fokus terkunci di dalam, latar digelapkan.
 */
export function Sheet({
  title,
  button,
  buttonClassName,
  children,
}: {
  title: string;
  button: ReactNode; // isi tombol pemicu
  buttonClassName: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={buttonClassName}>
        {button}
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
          <div className="mx-auto mb-3 h-[5px] w-11 rounded-full bg-line app:hidden" aria-hidden="true" />
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id={titleId} className="m-0 text-lg">
              {title}
            </h2>
            <button type="button" onClick={close} aria-label="Tutup" className="grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink">
              <Icon name="close" />
            </button>
          </div>
          <CloseContext value={close}>{children}</CloseContext>
        </div>
      </dialog>
    </>
  );
}

/** Kelas tombol kecil di bilah judul HP (mis. "+ Tambah"). */
export const barButton =
  "inline-flex h-11 items-center gap-1.5 rounded-xl bg-g800 px-3.5 text-[13px] font-bold text-white hover:bg-g700 active:translate-y-px";
