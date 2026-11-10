"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { card, darkButton, errorBox, fieldInput, fieldLabel, okBox, primaryButton } from "@/components/ui";
import { keepFormSubmit } from "@/components/use-keep-form";
import { createUser, resetPassword, type UserFormState } from "@/lib/actions/users";

// Form dibuat ulang (dikosongkan) setiap kali penyimpanan berhasil.
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

function Messages({ state }: { state: UserFormState }) {
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

export function CreateUserForm() {
  const [state, action, pending] = useActionState<UserFormState, FormData>(createUser, {});
  const key = useResetOnSave(state.savedAt);

  return (
    <section aria-labelledby="new-user-title" className={card}>
      <h2 id="new-user-title" className="m-0 mb-3 text-[15px] app:text-base">
        Buat akun baru
      </h2>
      <form key={key} onSubmit={keepFormSubmit(action)} className="flex flex-col gap-3">
        <Messages state={state} />
        <div>
          <label htmlFor="nu-name" className={fieldLabel}>
            Nama
          </label>
          <input id="nu-name" name="name" required maxLength={60} placeholder="Nama lengkap" className={fieldInput} />
        </div>
        <div>
          <label htmlFor="nu-username" className={fieldLabel}>
            Username
          </label>
          <input
            id="nu-username"
            name="username"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            pattern="[a-zA-Z0-9._]{3,32}"
            aria-describedby="nu-username-hint"
            className={fieldInput}
          />
          <small id="nu-username-hint" className="mt-1 block text-xs text-muted">
            3 sampai 32 karakter: huruf, angka, titik, atau garis bawah. Disimpan dalam huruf kecil.
          </small>
        </div>
        <div>
          <label htmlFor="nu-password" className={fieldLabel}>
            Password awal
          </label>
          <input id="nu-password" name="password" type="password" required minLength={8} autoComplete="new-password" className={fieldInput} />
          <small className="mt-1 block text-xs text-muted">Minimal 8 karakter. Berikan langsung ke pemilik akun.</small>
        </div>
        <div>
          <label htmlFor="nu-role" className={fieldLabel}>
            Peran
          </label>
          <select id="nu-role" name="role" defaultValue="user" className={fieldInput}>
            <option value="user">Pengguna</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Membuat akun..." : "Buat akun"}
        </button>
      </form>
    </section>
  );
}

export function ResetPasswordForm({ userId, username, self }: { userId: number; username: string; self: boolean }) {
  const [state, action, pending] = useActionState<UserFormState, FormData>(resetPassword, {});
  const key = useResetOnSave(state.savedAt);
  const id = `pw-${userId}`;

  return (
    <details className="group mt-2.5">
      <summary className="inline-flex min-h-11 items-center rounded-lg text-[13px] font-bold text-g700 hover:underline">
        {self ? "Ganti password saya" : `Ganti password ${username}`}
      </summary>
      <form key={key} onSubmit={keepFormSubmit(action)} className="mt-2 flex flex-col gap-2.5 rounded-2xl bg-bg p-3.5">
        <Messages state={state} />
        <input type="hidden" name="userId" value={userId} />
        <div>
          <label htmlFor={id} className={fieldLabel}>
            Password baru
          </label>
          <div className="flex gap-2">
            <input id={id} name="password" type="password" required minLength={8} autoComplete="new-password" className={fieldInput} />
            <button type="submit" disabled={pending} className={`${darkButton} h-[46px] flex-none`}>
              {pending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
        <small className="text-xs text-muted">
          {self ? "Perangkat lain yang memakai akun Anda akan dikeluarkan." : "Semua perangkat yang memakai akun ini akan dikeluarkan."}
        </small>
      </form>
    </details>
  );
}
