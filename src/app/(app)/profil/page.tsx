import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { card, secondaryButton } from "@/components/ui";
import { logout } from "@/lib/actions/auth";
import { requireUser } from "@/lib/dal";
import { PasswordForm, ProfileForm, TwoFactor } from "./forms";
import { ProfileMobile } from "./mobile";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilPage() {
  return (
    <>
      <PageHeader title="Profil" subtitle="Nama, foto, password, dan keamanan login" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat profil...</p>}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  const user = await requireUser();
  const me = { id: user.id, name: user.name, username: user.username, avatar: user.avatar, role: user.role, totpEnabled: user.totpEnabled, hasPassword: user.hasPassword };
  return (
    <>
      <ProfileMobile me={me} />

      {/* Desktop: kartu berdampingan (tidak berubah) */}
      <div className="hidden px-8 pt-6 pb-12 app:block">
        <div className="grid gap-6 wide:grid-cols-2 wide:items-start">
          <div className="flex flex-col gap-6">
            <ProfileForm me={me} />
            <section className={card}>
              <p className="m-0 text-[13px] text-muted">
                Username <b className="text-ink">@{user.username}</b> · {user.role === "admin" ? "Admin" : "Pengguna"}. Username tidak bisa diganti.
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5 border-t border-line pt-3">
                <Link href="/kategori" className={`${secondaryButton} gap-2`}>
                  <Icon name="tag" />
                  Kategori transaksi
                </Link>
                {user.role === "admin" && (
                  <Link href="/admin/pengguna" className={`${secondaryButton} gap-2`}>
                    <Icon name="users" />
                    Kelola pengguna
                  </Link>
                )}
                <form action={logout}>
                  <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl px-3 font-bold text-danger hover:bg-danger-bg">
                    <Icon name="logout" />
                    Keluar
                  </button>
                </form>
              </div>
            </section>
          </div>
          <div className="flex flex-col gap-6">
            <TwoFactor enabled={user.totpEnabled} hasPassword={user.hasPassword} />
            <PasswordForm hasPassword={user.hasPassword} />
          </div>
        </div>
      </div>
    </>
  );
}
