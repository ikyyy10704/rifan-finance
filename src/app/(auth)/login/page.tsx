import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandText, LogoMark } from "@/components/brand";
import { readSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

async function RedirectIfSignedIn() {
  if (await readSession()) redirect("/dashboard");
  return null;
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh min-[820px]:flex">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      {/* HP: kepala hijau melengkung seperti .head di mockup mobile.
          Desktop: panel kiri hijau tua seperti sidebar mockup web. */}
      <header className="on-dark rounded-b-[32px] bg-g800 px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-8 text-white min-[820px]:flex min-[820px]:w-[44%] min-[820px]:max-w-[560px] min-[820px]:flex-col min-[820px]:rounded-none min-[820px]:bg-g900 min-[820px]:px-10 min-[820px]:py-10">
        <div className="flex items-center gap-3">
          <LogoMark size={44} priority />
          <BrandText className="text-lg" />
        </div>
        <p className="mt-6 mb-0 max-w-[22ch] text-[22px] leading-snug font-bold min-[820px]:mt-auto min-[820px]:text-[34px] min-[820px]:leading-tight min-[820px]:tracking-[-0.6px]">
          Setiap rupiah tercatat, setiap tujuan tercapai.
        </p>
        <p className="mt-2 mb-0 text-soft min-[820px]:mt-4 min-[820px]:text-[15px]">
          Catatan keuangan pribadi Rizki dan Irfan.
        </p>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-6 min-[820px]:items-center min-[820px]:px-8">
        <div className="w-full max-w-[400px]">
          <div className="rounded-[22px] border border-line bg-white p-5 min-[820px]:p-7">
            <h1 className="m-0 text-[20px] font-bold tracking-[-0.3px]">Masuk</h1>
            <p className="mt-1 mb-5 text-muted">Pakai username dan password dari admin.</p>
            <LoginForm />
          </div>
          <p className="mt-4 px-1 text-center text-[13px] text-balance text-muted">
            Belum punya akun atau lupa password? Hubungi admin.
          </p>
        </div>
      </main>
    </div>
  );
}
