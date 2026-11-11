"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { AmountInput } from "@/components/amount-input";
import { Icon } from "@/components/icons";
import { typeIcon } from "@/components/provider-logo";
import { barButton, Sheet, useCloseSheet } from "@/components/sheet";
import { darkButton, errorBox, fieldInput, fieldLabel, okBox, primaryButton } from "@/components/ui";
import { keepFormSubmit } from "@/components/use-keep-form";
import { createAccount, type AccountFormState } from "@/lib/actions/accounts";
import { findProvider, numberLabel, PROVIDERS, type ProviderId } from "@/lib/providers";

// Nama awal yang diisikan saat penyedia dipilih; tetap bisa diubah (misalnya "BRI Tabungan").
const DEFAULT_NAME: Partial<Record<ProviderId, string>> = { bri: "BRI", dana: "DANA", gopay: "GoPay", shopeepay: "ShopeePay", cash: "Tunai" };

/**
 * Tombol yang membuka form Tambah akun: sheet dari bawah di HP, dialog di tengah di desktop.
 * Form tidak lagi tampil terus di samping daftar supaya halaman Akun tetap lega.
 */
export function AddAccountSheet({ desktop = false }: { desktop?: boolean }) {
  return (
    <Sheet
      title="Tambah akun"
      buttonClassName={desktop ? `${darkButton} gap-2` : barButton}
      button={
        <>
          <Icon name="plus" className="h-[18px] w-[18px]" />
          {desktop ? "Tambah akun" : "Tambah"}
        </>
      }
    >
      <FormBody prefix={desktop ? "d" : "m"} closeOnSave />
    </Sheet>
  );
}

function FormBody({ prefix, closeOnSave = false }: { prefix: string; closeOnSave?: boolean }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(createAccount, {});
  const [formKey, setFormKey] = useState(0);
  const lastSaved = useRef<number | undefined>(undefined);
  const closeSheet = useCloseSheet();

  useEffect(() => {
    if (state.savedAt && state.savedAt !== lastSaved.current) {
      lastSaved.current = state.savedAt;
      setFormKey((k) => k + 1);
      if (closeOnSave) closeSheet();
    }
  }, [state.savedAt, closeOnSave, closeSheet]);

  return (
    <>
      {state.error && (
        <p role="alert" className={`${errorBox} mt-0 mb-3`}>
          {state.error}
        </p>
      )}
      {state.savedAt && !state.error && !closeOnSave && (
        <p role="status" className={`${okBox} mt-0 mb-3`}>
          Akun ditambahkan.
        </p>
      )}
      <Fields key={formKey} prefix={prefix} onSubmit={keepFormSubmit(action)} pending={pending} />
    </>
  );
}

function Fields({ prefix, onSubmit, pending }: { prefix: string; onSubmit: React.FormEventHandler<HTMLFormElement>; pending: boolean }) {
  const [provider, setProvider] = useState<ProviderId>("bri");
  const [name, setName] = useState(DEFAULT_NAME.bri!);
  const p = findProvider(provider)!;
  const id = (s: string) => `${prefix}-acc-${s}`;

  const pick = (pid: ProviderId) => {
    // Ganti nama otomatis hanya bila nama masih nama bawaan penyedia sebelumnya.
    if (!name.trim() || name === DEFAULT_NAME[provider]) setName(DEFAULT_NAME[pid] ?? "");
    setProvider(pid);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <fieldset className="m-0 border-0 p-0">
        <legend className={fieldLabel}>Pilih akun</legend>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((opt) => {
            const on = provider === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center text-xs font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-g700 ${
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
        <label htmlFor={id("name")} className={fieldLabel}>
          Nama akun
        </label>
        <input
          id={id("name")}
          name="name"
          required
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={p.type === "bank" ? "Contoh: BCA Tabungan" : "Contoh: OVO"}
          className={fieldInput}
        />
      </div>

      {p.type !== "cash" && (
        <div>
          <label htmlFor={id("number")} className={fieldLabel}>
            {numberLabel(p.type)} <span className="font-normal">(opsional)</span>
          </label>
          <input
            id={id("number")}
            name="accountNumber"
            inputMode={p.type === "bank" ? "numeric" : "tel"}
            autoComplete="off"
            maxLength={34}
            placeholder={p.type === "bank" ? "Contoh: 0123 0100 1234 567" : "Contoh: 0812 3456 7890"}
            className={fieldInput}
          />
        </div>
      )}

      <div>
        <label htmlFor={id("initial")} className={fieldLabel}>
          Saldo awal
        </label>
        <AmountInput id={id("initial")} name="initialBalance" className={fieldInput} />
      </div>
      <p className="m-0 text-xs text-muted">Isi dengan saldo akun hari ini. Transaksi berikutnya menambah atau mengurangi angka ini.</p>
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Menyimpan..." : "Simpan akun"}
      </button>
    </form>
  );
}
