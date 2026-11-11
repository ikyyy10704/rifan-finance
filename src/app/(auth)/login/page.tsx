import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandText, LogoMark } from "@/components/brand";
import { errorBox } from "@/components/ui";
import { readSession } from "@/lib/session";
import { GoogleButton } from "./google-button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

async function RedirectIfSignedIn() {
  if (await readSession()) redirect("/dashboard");
  return null;
}

/**
 * HP: satu layar hijau tua penuh, menyambung dari splash. Tanpa kartu dan tanpa blok kepala.
 * Desktop: panel kiri hijau tua + kartu putih di kanan (tidak berubah).
 */
// Pesan setelah kembali dari Google (lihat src/app/api/auth/google/callback/route.ts).
const GOOGLE_MESSAGES: Record<string, string> = {
  batal: "Login Google dibatalkan. Pilih akun Google lagi bila ingin masuk.",
  kedaluwarsa: "Waktu login Google habis. Tekan Masuk dengan Google sekali lagi.",
  gagal: "Google tidak mengonfirmasi akun itu. Coba lagi, dan pastikan email akun Google sudah terverifikasi.",
  nonaktif: "Akun ini sudah dinonaktifkan admin.",
  "tidak-diizinkan": "Email ini belum masuk daftar penguji Rifan Finance. Minta admin menambahkannya.",
  "belum-diatur": "Login Google belum diatur di server ini (GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET kosong).",
};

async function LoginBody({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const message = GOOGLE_MESSAGES[one(sp.google) ?? ""];
  const codeStep = one(sp.langkah) === "kode";
  return <LoginChoices message={message} codeStep={codeStep} />;
}

function LoginChoices({ message, codeStep = false }: { message?: string; codeStep?: boolean }) {
  // Tahap kode 2FA setelah Google: tombol Google disembunyikan supaya fokus ke kode.
  if (codeStep) return <LoginForm initial={{ step: "code" }} />;
  return (
    <>
      {message && (
        <p role="alert" className={`${errorBox} mt-0 mb-4`}>
          {message}
        </p>
      )}
      <GoogleButton />
      <div className="my-5 flex items-center gap-3 text-xs text-soft app:text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-white/20 app:bg-line" />
        atau pakai username
        <span className="h-px flex-1 bg-white/20 app:bg-line" />
      </div>
      <LoginForm />
    </>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="login-dark flex min-h-dvh flex-col bg-g900 text-white app:flex-row app:bg-bg app:text-ink">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      {/* Desktop saja: panel merek seperti sidebar mockup web. */}
      <aside className="on-dark hidden w-[44%] max-w-[560px] flex-col bg-g900 px-10 py-10 text-white app:flex">
        <div className="flex items-center gap-3">
          <LogoMark size={44} priority />
          <BrandText className="text-lg" />
        </div>
        <p className="mt-auto mb-0 max-w-[22ch] text-[34px] leading-tight font-bold tracking-[-0.6px]">
          Setiap rupiah tercatat, setiap tujuan tercapai.
        </p>
        <p className="mt-4 mb-0 text-[15px] text-soft">Catat pemasukan, pengeluaran, dan saldo tiap dompet di satu tempat.</p>
      </aside>

      <main className="flex flex-1 flex-col px-6 pt-[calc(env(safe-area-inset-top)+56px)] pb-[calc(env(safe-area-inset-bottom)+24px)] app:items-center app:justify-center app:px-8 app:py-6">
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col app:flex-none">
          {/* HP saja: logo di tengah, menggantikan blok kepala hijau. */}
          <div className="mb-9 flex flex-col items-center gap-3 app:hidden">
            <LogoMark size={64} priority />
            <BrandText className="text-[20px]" />
          </div>

          <div className="app:rounded-[22px] app:border app:border-line app:bg-white app:p-7">
            <h1 className="m-0 text-center text-[26px] leading-tight font-bold tracking-[-0.4px] app:text-left app:text-[20px] app:tracking-[-0.3px]">
              Masuk
            </h1>
            <p className="mt-1.5 mb-7 text-center text-soft app:mt-1 app:mb-5 app:text-left app:text-muted">
              Pakai akun Google, atau username dan password.
            </p>
            <Suspense fallback={<LoginChoices />}>
              <LoginBody searchParams={searchParams} />
            </Suspense>
          </div>

          <p className="mt-auto px-1 pt-8 text-center text-[13px] text-balance text-soft app:mt-4 app:pt-0 app:text-muted">
            Belum punya akun? Masuk dengan Google, akunnya langsung dibuat.
          </p>
        </div>
      </main>
    </div>
  );
}
