"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { AmountInput } from "@/components/amount-input";
import { categoryIcon, Icon, TONE } from "@/components/icons";
import { typeIcon } from "@/components/provider-logo";
import { errorBox, fieldInput, fieldLabel, primaryButton, secondaryButton } from "@/components/ui";
import { saveSetupAccount, saveSetupCategories, saveSetupProfile, type SetupState } from "@/lib/actions/setup";
import { PROVIDERS, type ProviderId } from "@/lib/providers";

function Alert({ state }: { state: SetupState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className={`${errorBox} mt-0 mb-4`}>
      {state.error}
    </p>
  );
}

// ---- Langkah 1 ----
export function ProfileStep({ name, username }: { name: string; username: string }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(saveSetupProfile, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Alert state={state} />
      <div>
        <label htmlFor="su-name" className={fieldLabel}>
          Nama panggilan
        </label>
        <input id="su-name" name="name" required maxLength={60} defaultValue={name} autoComplete="nickname" aria-invalid={state.field === "name" || undefined} className={fieldInput} />
      </div>
      <div>
        <label htmlFor="su-username" className={fieldLabel}>
          Username
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-0 left-3.5 grid h-[46px] place-items-center text-muted" aria-hidden="true">
            @
          </span>
          <input
            id="su-username"
            name="username"
            required
            minLength={3}
            maxLength={32}
            defaultValue={username}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby="su-username-hint"
            aria-invalid={state.field === "username" || undefined}
            className={`${fieldInput} pl-8`}
          />
        </div>
        <small id="su-username-hint" className="mt-1.5 block text-xs text-muted">
          3 sampai 32 karakter: huruf kecil, angka, titik, atau garis bawah.
        </small>
      </div>
      <button type="submit" disabled={pending} className={`${primaryButton} mt-1`}>
        {pending ? "Menyimpan..." : "Simpan dan lanjut"}
      </button>
    </form>
  );
}

// ---- Langkah 2 ----
const DEFAULT_NAME: Partial<Record<ProviderId, string>> = { bri: "BRI", dana: "DANA", gopay: "GoPay", shopeepay: "ShopeePay", cash: "Tunai" };

export function AccountStep({ existing }: { existing: string[] }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(saveSetupAccount, {});
  const [provider, setProvider] = useState<ProviderId>("cash");
  const [name, setName] = useState(DEFAULT_NAME.cash!);

  const pick = (pid: ProviderId) => {
    if (!name.trim() || name === DEFAULT_NAME[provider]) setName(DEFAULT_NAME[pid] ?? "");
    setProvider(pid);
  };

  return (
    <>
      {existing.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-bg px-4 py-3">
          <p className="m-0 text-[13px] text-muted">
            Sudah dibuat: <b className="text-ink">{existing.join(", ")}</b>
          </p>
          <form action={action}>
            <input type="hidden" name="skip" value="1" />
            <button type="submit" disabled={pending} className={secondaryButton}>
              Lanjut tanpa menambah
            </button>
          </form>
        </div>
      )}
      <form action={action} className="flex flex-col gap-4">
        <Alert state={state} />
        <fieldset className="m-0 border-0 p-0">
          <legend className={fieldLabel}>Jenis dompet</legend>
          <div className="grid grid-cols-3 gap-2 min-[480px]:grid-cols-4">
            {PROVIDERS.map((opt) => {
              const on = provider === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`flex min-h-[60px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center text-xs font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-g700 ${
                    on ? "border-g800 bg-[#F1F8D6] text-g900 ring-1 ring-g800" : "border-line bg-white text-muted hover:border-[#c9d3ce] hover:text-ink"
                  }`}
                >
                  <input type="radio" name="provider" value={opt.id} checked={on} onChange={() => pick(opt.id)} className="sr-only" />
                  {"logo" in opt ? (
                    <Image src={opt.logo} alt="" width={72} height={Math.round(72 / opt.ratio)} unoptimized className="h-6 w-auto max-w-[80%] object-contain" />
                  ) : (
                    <Icon name={typeIcon(opt.type)} className="h-6 w-6" />
                  )}
                  <span className={"logo" in opt ? "sr-only" : ""}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div>
          <label htmlFor="su-acc-name" className={fieldLabel}>
            Nama dompet
          </label>
          <input id="su-acc-name" name="name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: BCA Tabungan" className={fieldInput} />
        </div>
        <div>
          <label htmlFor="su-acc-balance" className={fieldLabel}>
            Saldo hari ini
          </label>
          <AmountInput id="su-acc-balance" name="initialBalance" className={fieldInput} />
          <small className="mt-1.5 block text-xs text-muted">Boleh dikosongkan. Pemasukan dan pengeluaran berikutnya dihitung dari angka ini.</small>
        </div>
        <button type="submit" disabled={pending} className={`${primaryButton} mt-1`}>
          {pending ? "Menyimpan..." : "Simpan dompet dan lanjut"}
        </button>
      </form>
    </>
  );
}

// ---- Langkah 3 ----
type Cat = { id: number; name: string; kind: "income" | "expense"; icon: string | null; color: string | null; archived: boolean };

export function CategoryStep({ rows }: { rows: Cat[] }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(saveSetupCategories, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <Alert state={state} />
      <CategoryGroup title="Pengeluaran" rows={rows.filter((r) => r.kind === "expense")} />
      <CategoryGroup title="Pemasukan" rows={rows.filter((r) => r.kind === "income")} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Menyiapkan..." : "Selesai, buka beranda"}
      </button>
    </form>
  );
}

function CategoryGroup({ title, rows }: { title: string; rows: Cat[] }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 text-[13px] font-semibold text-muted">{title}</legend>
      <div className="grid gap-2 min-[480px]:grid-cols-2">
        {rows.map((c) => (
          <label
            key={c.id}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-[14px] font-semibold transition-colors hover:border-[#c9d3ce] has-checked:border-g800 has-checked:bg-[#F1F8D6] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-g700"
          >
            <input type="checkbox" name="keep" value={c.id} defaultChecked={!c.archived} className="h-[18px] w-[18px] flex-none accent-g800" />
            <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${TONE[c.color ?? "l"] ?? TONE.l}`}>
              <Icon name={categoryIcon(c.icon)} className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 truncate">{c.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
