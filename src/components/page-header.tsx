import type { ReactNode } from "react";

/**
 * HP: bilah judul ringkas yang menempel di atas (gaya aplikasi), tanpa blok hijau.
 * Desktop: judul polos + subjudul di atas konten (.top di mockup web).
 */
export function PageHeader({
  title,
  subtitle,
  action,
  mobileAction,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode; // desktop
  mobileAction?: ReactNode; // HP, di kanan judul
}) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-bg/90 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 backdrop-blur-md app:hidden">
        <div className="flex min-h-11 items-center gap-3">
          <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.5px]">{title}</h1>
          {mobileAction && <div className="ml-auto flex items-center gap-2">{mobileAction}</div>}
        </div>
      </header>
      <header className="hidden px-8 pt-6 app:block">
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
