import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";

/**
 * HP: bilah judul ringkas yang menempel di atas (gaya aplikasi), tanpa blok hijau.
 * Desktop: judul polos + subjudul di atas konten (.top di mockup web).
 */
export function PageHeader({
  title,
  mobileTitle,
  subtitle,
  action,
  mobileAction,
  back,
}: {
  title: string;
  mobileTitle?: string; // judul lebih pendek untuk bilah HP yang sempit
  subtitle?: ReactNode;
  action?: ReactNode; // desktop
  mobileAction?: ReactNode; // HP, di kanan judul
  back?: { href: string; label: string }; // halaman turunan: tombol kembali menggantikan logo
}) {
  return (
    <>
      {/* Tiga kolom: kiri (kembali) dan kanan (aksi) sama lebar, jadi judul selalu tepat di tengah. */}
      <header className="sticky top-0 z-10 bg-bg/90 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 backdrop-blur-md app:hidden">
        <div className="grid min-h-11 grid-cols-[minmax(44px,1fr)_minmax(0,auto)_minmax(44px,1fr)] items-center gap-2">
          <div className="flex items-center">
            {back && (
              <Link href={back.href} aria-label={`Kembali ke ${back.label}`} className="-ml-2 grid h-11 w-11 place-items-center rounded-xl text-g800 active:bg-white">
                <Icon name="chevronLeft" />
              </Link>
            )}
          </div>
          <h1 className="m-0 min-w-0 truncate text-center text-[19px] font-extrabold tracking-[-0.4px]">{mobileTitle ?? title}</h1>
          <div className="flex items-center justify-end gap-2">{mobileAction}</div>
        </div>
      </header>
      <header className="hidden px-8 pt-6 app:block">
        {back && (
          <Link href={back.href} className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-bold text-g700 hover:bg-white">
            <Icon name="chevronLeft" className="h-[18px] w-[18px]" />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0">
            <h1 className="m-0 text-2xl font-bold tracking-[-0.4px]">{title}</h1>
            {subtitle && <p className="mt-0.5 mb-0 text-muted">{subtitle}</p>}
          </div>
          {action && <div className="ml-auto">{action}</div>}
        </div>
      </header>
    </>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3.5 px-4 pt-2 pb-4 app:gap-6 app:px-8 app:pt-6 app:pb-12">{children}</div>;
}
