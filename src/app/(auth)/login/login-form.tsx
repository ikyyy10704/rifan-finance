"use client";

import { useActionState, useState } from "react";
import { errorBox, fieldInput, fieldLabel, primaryButton } from "@/components/ui";
import { login, type LoginState } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [showPassword, setShowPassword] = useState(false);

  const alert = state.error && (
    <p role="alert" className={`${errorBox} mt-0 mb-4`}>
      {state.error}
    </p>
  );

  // Tahap kedua: hanya muncul bila password benar dan akun memakai 2FA.
  if (state.step === "code") {
    return (
      <form action={action} noValidate>
        <p className="mt-0 mb-4 text-[13px] text-muted">
          Akun ini memakai verifikasi dua langkah. Buka aplikasi authenticator, lalu masukkan kode 6 digit untuk Rifan Finance.
        </p>
        {alert}
        <label htmlFor="code" className={fieldLabel}>
          Kode 6 digit
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          autoFocus
          required
          className={`${fieldInput} mb-5 text-center text-[22px] font-extrabold tracking-[0.3em]`}
        />
        <button type="submit" name="stage" value="code" disabled={pending} className={primaryButton}>
          {pending ? "Memeriksa..." : "Verifikasi"}
        </button>
        <button
          type="submit"
          name="stage"
          value="cancel"
          formNoValidate
          disabled={pending}
          className="mt-2 h-11 w-full rounded-[14px] text-[13px] font-bold text-g700 hover:bg-bg"
        >
          Kembali ke username dan password
        </button>
      </form>
    );
  }

  return (
    <form action={action} noValidate>
      {alert}

      <label htmlFor="username" className={fieldLabel}>
        Username
      </label>
      <input
        id="username"
        name="username"
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        defaultValue={state.username}
        key={state.username ?? ""}
        className={`${fieldInput} mb-3`}
      />

      <label htmlFor="password" className={fieldLabel}>
        Password
      </label>
      <div className="relative mb-5">
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          className={`${fieldInput} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={showPassword}
          className="absolute top-0 right-0 grid h-[46px] w-11 place-items-center rounded-r-xl text-g700 hover:text-g900 active:scale-95"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {showPassword && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>

      <button type="submit" name="stage" value="password" disabled={pending} className={primaryButton}>
        {pending ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
