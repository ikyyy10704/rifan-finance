import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandText, LogoMark } from "@/components/brand";
import { db } from "@/db";
import { accounts, categories } from "@/db/schema";
import { logout } from "@/lib/actions/auth";
import { requireSignedIn } from "@/lib/dal";
import { AccountStep, CategoryStep, ProfileStep } from "./forms";

export const metadata: Metadata = { title: "Mulai" };

const STEPS = [
  { n: 1, label: "Profil" },
  { n: 2, label: "Dompet" },
  { n: 3, label: "Kategori" },
] as const;

export default function MulaiPage({ searchParams }: PageProps<"/mulai">) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="on-dark bg-g900 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 app:px-8">
        <div className="mx-auto flex min-h-11 max-w-[560px] items-center gap-2.5">
          <LogoMark size={30} priority />
          <BrandText />
          <form action={logout} className="ml-auto">
            <button type="submit" className="inline-flex h-11 items-center rounded-xl px-3 text-[13px] font-bold text-soft hover:bg-white/10 hover:text-white">
              Keluar
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[560px] px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+32px)] app:pt-10">
        <Suspense fallback={<p className="text-muted" role="status">Memuat...</p>}>
          <Setup searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Setup({ searchParams }: { searchParams: PageProps<"/mulai">["searchParams"] }) {
  const user = await requireSignedIn();
  if (user.setupStep === null) redirect("/dashboard");
  const sp = await searchParams;
  const asked = Number(Array.isArray(sp.langkah) ? sp.langkah[0] : sp.langkah) || user.setupStep;
  // Boleh kembali ke langkah yang sudah dibuka, tidak boleh melompat ke depan.
  const step = Math.min(Math.max(1, asked), user.setupStep);

  return (
    <>
      <nav aria-label="Langkah perkenalan" className="mb-5">
        <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0">
          {STEPS.map((s) => {
            const state = s.n === step ? "now" : s.n <= user.setupStep! ? "open" : "later";
            const bar = state === "now" ? "bg-g800" : state === "open" ? "bg-lime" : "bg-line";
            const inner = (
              <>
                <span className={`block h-1.5 rounded-full ${bar}`} aria-hidden="true" />
                <span className={`mt-2 block text-xs ${state === "now" ? "font-bold text-ink" : "text-muted"}`}>
                  {s.n}. {s.label}
                </span>
              </>
            );
            return (
              <li key={s.n}>
                {state === "open" ? (
                  <Link href={`/mulai?langkah=${s.n}`} className="block min-h-11 rounded-md hover:[&>span:last-child]:text-ink">
                    {inner}
                    <span className="sr-only"> (kembali ke langkah ini)</span>
                  </Link>
                ) : (
                  <div className="min-h-11" aria-current={state === "now" ? "step" : undefined}>
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="rounded-[22px] bg-white p-5 app:border app:border-line app:p-7">
        {step === 1 && (
          <>
            <StepTitle title={`Halo, ${user.name.split(" ")[0]}`} text="Cek dulu nama dan username kamu. Nama muncul di beranda, username dipakai bila nanti masuk tanpa Google." />
            <ProfileStep name={user.name} username={user.username} />
          </>
        )}
        {step === 2 && <AccountStepLoader userId={user.id} />}
        {step === 3 && <CategoryStepLoader userId={user.id} />}
      </section>
    </>
  );
}

function StepTitle({ title, text }: { title: string; text: string }) {
  return (
    <>
      <h1 className="m-0 text-[22px] leading-tight font-bold tracking-[-0.4px]">{title}</h1>
      <p className="mt-1.5 mb-5 text-[14px] text-muted">{text}</p>
    </>
  );
}

async function AccountStepLoader({ userId }: { userId: number }) {
  const mine = await db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.id));
  return (
    <>
      <StepTitle
        title="Dompet pertama"
        text="Di mana uangmu sekarang? Rekening bank, e-wallet, atau uang tunai. Dompet lain bisa ditambah nanti di Akun & Dompet."
      />
      <AccountStep existing={mine.map((a) => a.name)} />
    </>
  );
}

async function CategoryStepLoader({ userId }: { userId: number }) {
  const rows = await db
    .select({ id: categories.id, name: categories.name, kind: categories.kind, icon: categories.icon, color: categories.color, archived: categories.archived })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.id));
  return (
    <>
      <StepTitle
        title="Kategori yang kamu pakai"
        text="Hilangkan centang pada yang tidak relevan supaya pilihan saat mencatat lebih pendek. Semuanya bisa diubah lagi di halaman Kategori."
      />
      <CategoryStep rows={rows} />
    </>
  );
}
