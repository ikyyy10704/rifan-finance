"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { categoryIcon, Icon, TONE } from "@/components/icons";
import { card, darkButton, errorBox, fieldInput, fieldLabel, okBox, primaryButton } from "@/components/ui";
import { keepFormSubmit } from "@/components/use-keep-form";
import { addSuggestedCategory, createCategory, renameCategory, toggleArchiveCategory, type CategoryFormState } from "@/lib/actions/categories";
import { CATEGORY_ICONS, CATEGORY_TONES, ICON_LABEL } from "@/lib/category-options";

function useResetOnSave(savedAt?: number) {
  const [key, setKey] = useState(0);
  const last = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (savedAt && savedAt !== last.current) {
      last.current = savedAt;
      setKey((k) => k + 1);
    }
  }, [savedAt]);
  return key;
}

function Messages({ state }: { state: CategoryFormState }) {
  if (state.error)
    return (
      <p role="alert" className={`${errorBox} m-0`}>
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className={`${okBox} m-0`}>
        {state.ok}
      </p>
    );
  return null;
}

const TONE_NAME: Record<string, string> = { r: "Merah", a: "Kuning", b: "Biru", g: "Hijau", l: "Lime" };

export function CreateCategoryForm() {
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(createCategory, {});
  const key = useResetOnSave(state.savedAt);
  const [icon, setIcon] = useState<string>("other");
  const [tone, setTone] = useState<string>("l");

  return (
    <section aria-labelledby="newcat-title" className={card}>
      <h2 id="newcat-title" className="m-0 mb-3 text-[15px] app:text-base">
        Tambah kategori
      </h2>
      <form key={key} onSubmit={keepFormSubmit(action)} className="flex flex-col gap-3">
        <Messages state={state} />
        <div className="flex gap-2.5">
          <div className="min-w-0 flex-[2]">
            <label htmlFor="nc-name" className={fieldLabel}>
              Nama
            </label>
            <input id="nc-name" name="name" required maxLength={30} placeholder="Contoh: Kesehatan" className={fieldInput} />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="nc-kind" className={fieldLabel}>
              Jenis
            </label>
            <select id="nc-kind" name="kind" defaultValue="expense" className={fieldInput}>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </div>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className={fieldLabel}>Ikon</legend>
          <div className="grid grid-cols-8 gap-1.5">
            {CATEGORY_ICONS.map((ic) => (
              <label
                key={ic}
                className={`grid aspect-square min-h-11 cursor-pointer place-items-center rounded-xl border has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-g700 ${
                  icon === ic ? `border-g800 ring-1 ring-g800 ${TONE[tone]}` : "border-line text-muted hover:text-ink"
                }`}
              >
                <input type="radio" name="icon" value={ic} checked={icon === ic} onChange={() => setIcon(ic)} className="sr-only" aria-label={`Ikon ${ICON_LABEL[ic]}`} />
                <Icon name={categoryIcon(ic)} />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className={fieldLabel}>Warna</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_TONES.map((t) => (
              <label
                key={t}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-g700 ${
                  tone === t ? "border-g800 ring-1 ring-g800" : "border-line text-muted"
                }`}
              >
                <input type="radio" name="color" value={t} checked={tone === t} onChange={() => setTone(t)} className="sr-only" />
                <span className={`grid h-6 w-6 place-items-center rounded-full ${TONE[t]}`}>
                  <Icon name={categoryIcon(icon)} className="h-3.5 w-3.5" />
                </span>
                {TONE_NAME[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Menyimpan..." : "Tambah kategori"}
        </button>
      </form>
    </section>
  );
}

type Cat = { id: number; name: string; icon: string | null; color: string | null; archived: boolean };

/** Satu baris kategori: ikon, nama, lalu "Ganti nama" dan "Sembunyikan" sejajar di kanan. */
export function CategoryRow({ c, first }: { c: Cat; first: boolean }) {
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(renameCategory, {});
  const [editing, setEditing] = useState(false);
  const [toggling, startToggle] = useTransition();
  const inputId = `rn-${c.id}`;
  const action2 = "inline-flex min-h-11 items-center rounded-lg px-2 text-[13px] font-bold text-g700 hover:bg-bg active:translate-y-px";

  return (
    <li className={`py-1.5 ${first ? "" : "border-t border-line"}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 flex-none place-items-center rounded-full ${c.archived ? "bg-bg text-muted" : (TONE[c.color ?? "l"] ?? TONE.l)}`}>
          <Icon name={categoryIcon(c.icon)} className="h-[18px] w-[18px]" />
        </span>
        {/* Nama boleh turun ke baris kedua di HP; dipotong akan menyembunyikan info utamanya. */}
        <b className={`min-w-0 flex-1 text-sm leading-snug break-words ${c.archived ? "text-muted" : ""}`}>{c.name}</b>
        <button type="button" aria-expanded={editing} aria-controls={inputId} onClick={() => setEditing((v) => !v)} className={`${action2} text-muted hover:text-g700`}>
          {editing ? "Batal" : "Ganti nama"}
        </button>
        <button
          type="button"
          disabled={toggling}
          aria-label={`${c.archived ? "Tampilkan" : "Sembunyikan"} kategori ${c.name}`}
          onClick={() => startToggle(() => toggleArchiveCategory(c.id))}
          className={action2}
        >
          {c.archived ? "Tampilkan" : "Sembunyikan"}
        </button>
      </div>
      {editing && (
        <form onSubmit={keepFormSubmit(action)} className="mt-1 mb-2 ml-12 flex flex-col gap-2">
          <Messages state={state} />
          <input type="hidden" name="id" value={c.id} />
          <label htmlFor={inputId} className="sr-only">
            Nama baru untuk {c.name}
          </label>
          <div className="flex gap-2">
            <input id={inputId} name="name" required maxLength={30} defaultValue={c.name} autoFocus className={fieldInput} />
            <button type="submit" disabled={pending} className={`${darkButton} h-[46px] flex-none`}>
              {pending ? "..." : "Simpan"}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

type Suggestion = { name: string; kind: "income" | "expense"; icon: string; color: string };

export function Suggestions({ items }: { items: Suggestion[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="sug-title" className={card}>
      <h2 id="sug-title" className="m-0 mb-1 text-[15px] app:text-base">
        Saran kategori
      </h2>
      <p className="mt-0 mb-3 text-[13px] text-muted">Kategori yang sering dipakai untuk keuangan pribadi. Tekan untuk menambahkan.</p>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <button
            key={`${s.kind}:${s.name}`}
            type="button"
            disabled={pending}
            onClick={() => {
              setBusy(s.name);
              start(() => addSuggestedCategory(s));
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-g700 active:translate-y-px disabled:text-muted"
          >
            <span className={`grid h-6 w-6 place-items-center rounded-full ${TONE[s.color]}`}>
              <Icon name={categoryIcon(s.icon)} className="h-3.5 w-3.5" />
            </span>
            {pending && busy === s.name ? "Menambahkan..." : s.name}
            <span className="text-xs font-normal text-muted">{s.kind === "income" ? "pemasukan" : "pengeluaran"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
