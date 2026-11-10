import { Suspense } from "react";
import { BrandText, LogoMark } from "@/components/brand";
import { BottomNav, Sidebar } from "@/components/app-nav";
import { TxSheetProvider } from "@/components/tx-sheet";
import { getAccounts, getCategories } from "@/lib/data/finance";
import { requireUser } from "@/lib/dal";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellLoading />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  return (
    <TxSheetProvider accounts={accounts} categories={categories}>
      <div className="min-h-dvh app:flex">
        <Sidebar user={{ id: user.id, name: user.name, role: user.role, avatar: user.avatar }} />
        {/* Ruang bawah untuk menu bawah HP supaya isi terakhir tidak tertutup. */}
        <main className="min-w-0 flex-1 pb-[calc(110px+env(safe-area-inset-bottom))] app:pb-0">{children}</main>
      </div>
      <BottomNav />
    </TxSheetProvider>
  );
}

function ShellLoading() {
  return (
    <div className="on-dark grid min-h-dvh place-items-center bg-g800" role="status" aria-label="Memuat">
      <div className="flex items-center gap-3 text-lg">
        <LogoMark size={40} />
        <BrandText />
      </div>
    </div>
  );
}
