"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { card, darkButton, errorBox, fieldInput, fieldLabel, okBox, primaryButton, secondaryButton } from "@/components/ui";
import { keepFormSubmit } from "@/components/use-keep-form";
import {
  changePassword,
  confirmTotpSetup,
  disableTotp,
  removeAvatar,
  startTotpSetup,
  updateProfile,
  type ProfileState,
  type TotpSetup,
} from "@/lib/actions/profile";

function Messages({ state }: { state: ProfileState }) {
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

type Me = { id: number; name: string; username: string; avatar: string | null };

/**
 * Kartu bertajuk di desktop; di dalam sheet HP (bare) tanpa kartu dan judul, karena sheet sudah punya judul.
 * `p` = awalan id, supaya form yang sama bisa tampil di desktop dan di sheet HP tanpa id ganda.
 */
type Variant = { p?: string; bare?: boolean };

function Frame({ bare, titleId, title, children }: { bare?: boolean; titleId: string; title: string; children: React.ReactNode }) {
  if (bare) return <div>{children}</div>;
  return (
    <section aria-labelledby={titleId} className={card}>
      <h2 id={titleId} className="m-0 mb-3 text-[15px] app:text-base">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ProfileForm({ me, p = "", bare }: { me: Me } & Variant) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  const key = useResetOnSave(state.savedAt);
  // Preview milik form tertentu; setelah tersimpan (key berganti) foto dari server yang tampil.
  const [picked, setPicked] = useState<{ key: number; url: string } | null>(null);
  const preview = picked?.key === key ? picked.url : null;
  const [removing, startRemove] = useTransition();

  useEffect(() => () => void (picked && URL.revokeObjectURL(picked.url)), [picked]);

  return (
    <Frame bare={bare} titleId={`${p}pf-title`} title="Nama dan foto">
      <form key={key} onSubmit={keepFormSubmit(action)} className="flex flex-col gap-3">
        <Messages state={state} />
        <div className="flex flex-wrap items-center gap-4">
          {preview ? (
            <span className="grid h-[72px] w-[72px] flex-none overflow-hidden rounded-full">
              <Image src={preview} alt="" width={72} height={72} unoptimized className="h-full w-full object-cover" />
            </span>
          ) : (
            <Avatar userId={me.id} name={me.name} avatar={me.avatar} size={72} />
          )}
          <div className="flex flex-wrap gap-2">
            <label htmlFor={`${p}pf-photo`} className={`${secondaryButton} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-g700`}>
              {me.avatar || preview ? "Ganti foto" : "Pilih foto"}
              <input
                id={`${p}pf-photo`}
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPicked(f ? { key, url: URL.createObjectURL(f) } : null);
                }}
              />
            </label>
            {me.avatar && !preview && (
              <button
                type="button"
                disabled={removing}
                onClick={() => startRemove(() => removeAvatar())}
                className="inline-flex h-11 items-center rounded-xl px-3 text-[13px] font-bold text-danger hover:bg-danger-bg"
              >
                {removing ? "Menghapus..." : "Hapus foto"}
              </button>
            )}
          </div>
        </div>
        <small className="-mt-1 text-xs text-muted">JPG, PNG, atau WebP, maksimal 2 MB. Foto dipotong persegi dan data lokasinya dihapus.</small>
        <div>
          <label htmlFor={`${p}pf-name`} className={fieldLabel}>
            Nama
          </label>
          <input id={`${p}pf-name`} name="name" required maxLength={60} defaultValue={me.name} className={fieldInput} />
        </div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </Frame>
  );
}

export function PasswordForm({ p = "", bare, hasPassword = true }: Variant & { hasPassword?: boolean }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(changePassword, {});
  const key = useResetOnSave(state.savedAt);
  return (
    <Frame bare={bare} titleId={`${p}pw-title`} title={hasPassword ? "Ganti password" : "Buat password"}>
      <form key={key} onSubmit={keepFormSubmit(action)} className="flex flex-col gap-3">
        <Messages state={state} />
        {hasPassword ? (
          <div>
            <label htmlFor={`${p}pw-current`} className={fieldLabel}>
              Password saat ini
            </label>
            <input id={`${p}pw-current`} name="current" type="password" required autoComplete="current-password" className={fieldInput} />
          </div>
        ) : (
          <p className="m-0 text-[13px] text-muted">Akun ini masuk lewat Google. Buat password bila ingin bisa masuk juga dengan username dan password.</p>
        )}
        <div>
          <label htmlFor={`${p}pw-next`} className={fieldLabel}>
            Password baru
          </label>
          <input id={`${p}pw-next`} name="next" type="password" required minLength={8} autoComplete="new-password" className={fieldInput} />
        </div>
        <div>
          <label htmlFor={`${p}pw-confirm`} className={fieldLabel}>
            Ulangi password baru
          </label>
          <input id={`${p}pw-confirm`} name="confirm" type="password" required minLength={8} autoComplete="new-password" className={fieldInput} />
        </div>
        <small className="text-xs text-muted">Minimal 8 karakter. Perangkat lain yang memakai akun ini akan dikeluarkan.</small>
        <button type="submit" disabled={pending} className={darkButton}>
          {pending ? "Menyimpan..." : hasPassword ? "Ganti password" : "Buat password"}
        </button>
      </form>
    </Frame>
  );
}

export function TwoFactor({ enabled, p = "", bare, hasPassword = true }: { enabled: boolean; hasPassword?: boolean } & Variant) {
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [starting, startSetup] = useTransition();
  const [confirmState, confirmAction, confirming] = useActionState<ProfileState, FormData>(confirmTotpSetup, {});
  const [offState, offAction, turningOff] = useActionState<ProfileState, FormData>(disableTotp, {});
  const offKey = useResetOnSave(offState.savedAt);

  // Setelah aktivasi berhasil, server me-refresh halaman dan `enabled` jadi true.
  const showSetup = !enabled && setup?.qr;

  return (
    <section aria-labelledby={bare ? undefined : `${p}tf-title`} className={bare ? "" : card}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        {!bare && (
          <h2 id={`${p}tf-title`} className="m-0 text-[15px] app:text-base">
            Verifikasi dua langkah (2FA)
          </h2>
        )}
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${enabled ? "bg-[#E3F4EC] text-plus" : "bg-bg text-muted"}`}>
          {enabled ? "Aktif" : "Belum aktif"}
        </span>
      </div>
      <p className="mt-0 mb-3 text-[13px] text-muted">
        Saat login, selain password diminta kode 6 digit dari aplikasi authenticator di HP (Google Authenticator, Microsoft Authenticator, atau Authy).
      </p>

      {enabled ? (
        <>
          {confirmState.ok && (
            <div className="mb-3">
              <Messages state={confirmState} />
            </div>
          )}
          <details>
            <summary className="inline-flex min-h-11 items-center text-[13px] font-bold text-danger hover:underline">Matikan verifikasi dua langkah</summary>
            <form key={offKey} onSubmit={keepFormSubmit(offAction)} className="mt-2 flex flex-col gap-3 rounded-2xl bg-bg p-3.5">
              <Messages state={offState} />
              {hasPassword && (
                <div>
                  <label htmlFor={`${p}tf-off-pw`} className={fieldLabel}>
                    Password
                  </label>
                  <input id={`${p}tf-off-pw`} name="password" type="password" required autoComplete="current-password" className={fieldInput} />
                </div>
              )}
              <div>
                <label htmlFor={`${p}tf-off-code`} className={fieldLabel}>
                  Kode dari aplikasi authenticator
                </label>
                <input id={`${p}tf-off-code`} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required className={fieldInput} />
              </div>
              <button type="submit" disabled={turningOff} className={darkButton}>
                {turningOff ? "Memeriksa..." : "Matikan 2FA"}
              </button>
            </form>
          </details>
        </>
      ) : showSetup ? (
        <div className="flex flex-col gap-3">
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-[13px]">
            <li>Buka aplikasi authenticator, pilih tambah akun, lalu pindai QR ini.</li>
            <li>Masukkan kode 6 digit yang muncul untuk Rifan Finance.</li>
          </ol>
          <Image src={setup.qr!} alt="QR code untuk aplikasi authenticator" width={184} height={184} unoptimized className="rounded-xl border border-line" />
          <div className="text-[13px]">
            <span className="text-muted">Tidak bisa memindai? Ketik kunci ini:</span>
            <code className="mt-1 block rounded-lg bg-bg px-3 py-2 font-mono text-[13px] break-all select-all">{setup.secret!.replace(/(.{4})/g, "$1 ").trim()}</code>
          </div>
          <form onSubmit={keepFormSubmit(confirmAction)} className="flex flex-col gap-3">
            <Messages state={confirmState} />
            <div>
              <label htmlFor={`${p}tf-code`} className={fieldLabel}>
                Kode 6 digit
              </label>
              <input id={`${p}tf-code`} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required className={fieldInput} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={confirming} className={darkButton}>
                {confirming ? "Memeriksa..." : "Aktifkan 2FA"}
              </button>
              <button type="button" onClick={() => setSetup(null)} className={secondaryButton}>
                Batal
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {setup?.error && (
            <p role="alert" className={`${errorBox} mt-0 mb-3`}>
              {setup.error}
            </p>
          )}
          <button type="button" disabled={starting} onClick={() => startSetup(async () => setSetup(await startTotpSetup()))} className={darkButton}>
            {starting ? "Menyiapkan..." : "Aktifkan"}
          </button>
        </>
      )}
    </section>
  );
}
