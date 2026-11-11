"use client";

import { useActionState, useState } from "react";
import { errorBox, primaryButton } from "@/components/ui";

// HP: kolom gelap di atas hijau tua. Desktop (app:): kembali ke gaya terang di dalam kartu putih.
const label = "mb-1.5 block text-xs font-semibold text-soft app:text-muted";
const input =
  "h-[50px] w-full min-w-0 rounded-[14px] border border-white/25 bg-white/[0.07] px-4 text-base text-white outline-none transition-colors hover:border-white/45 focus:border-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime " +
  "app:h-[46px] app:rounded-xl app:border-line app:bg-white app:px-3.5 app:text-ink app:hover:border-[#c9d3ce] app:focus:border-g700 app:focus-visible:outline-g700";
import { login, type LoginState } from "@/lib/actions/auth";

/** `initial` dipakai saat kembali dari Google untuk akun ber-2FA: langsung ke tahap kode. */
export function LoginForm({ initial = {} }: { initial?: LoginState }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, initial);
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
        <p className="mt-0 mb-4 text-[13px] text-soft app:text-muted">
          Akun ini memakai verifikasi dua langkah. Buka aplikasi authenticator, lalu masukkan kode 6 digit untuk Rifan Finance.
        </p>
        {alert}
        <label htmlFor="code" className={label}>
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
          className={`${input} mb-5 text-center text-[22px] font-extrabold tracking-[0.3em]`}
        />
        <button type="submit" name="stage" value="code" disabled={pending} className={`${primaryButton} focus-visible:outline-lime app:focus-visible:outline-g700`}>
          {pending ? "Memeriksa..." : "Verifikasi"}
        </button>
        <button
          type="submit"
          name="stage"
          value="cancel"
          formNoValidate
          disabled={pending}
          className="mt-2 h-11 w-full rounded-[14px] text-[13px] font-bold text-lime hover:bg-white/10 app:text-g700 app:hover:bg-bg"
        >
          Kembali ke username dan password
        </button>
      </form>
    );
  }

  return (
    <form action={action} noValidate>
      {alert}

      <label htmlFor="username" className={label}>
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
        className={`${input} mb-3`}
      />

      <label htmlFor="password" className={label}>
        Password
      </label>
      <div className="relative mb-5">
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          className={`${input} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={showPassword}
          className="absolute top-0 right-0 grid h-[50px] w-12 place-items-center rounded-r-[14px] text-lime hover:text-white active:scale-95 app:h-[46px] app:w-11 app:rounded-r-xl app:text-g700 app:hover:text-g900"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {showPassword && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>

      <button type="submit" name="stage" value="password" disabled={pending} className={`${primaryButton} focus-visible:outline-lime app:focus-visible:outline-g700`}>
        {pending ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
