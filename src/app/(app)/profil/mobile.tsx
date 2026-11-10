"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { Icon, type IconName } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { logout } from "@/lib/actions/auth";
import { PasswordForm, ProfileForm, TwoFactor } from "./forms";

type Me = { id: number; name: string; username: string; avatar: string | null; role: "admin" | "user"; totpEnabled: boolean };

const rowClass = "flex min-h-14 w-full items-center gap-3 py-2 text-left active:opacity-70";

function RowInner({ icon, label, value, danger = false }: { icon: IconName; label: string; value?: ReactNode; danger?: boolean }) {
  return (
    <>
      <span className={`grid h-9 w-9 flex-none place-items-center rounded-full ${danger ? "bg-danger-bg text-danger" : "bg-[#E3F4EC] text-g800"}`}>
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <span className={`min-w-0 flex-1 text-[15px] font-semibold ${danger ? "text-danger" : "text-ink"}`}>{label}</span>
      {value}
      {!danger && <Icon name="chevronRight" className="h-[18px] w-[18px] text-muted" />}
    </>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <ul className="m-0 list-none divide-y divide-line rounded-[18px] bg-white px-4">{children}</ul>;
}

/** Layar Profil di HP: identitas di atas, lalu daftar pengaturan. Tiap baris membuka sheet berisi form-nya. */
export function ProfileMobile({ me }: { me: Me }) {
  return (
    <div className="flex flex-col gap-5 px-4 pt-1 pb-4 app:hidden">
      <div className="flex items-center gap-4">
        <Avatar userId={me.id} name={me.name} avatar={me.avatar} size={64} />
        <div className="min-w-0">
          <p className="m-0 truncate text-lg font-bold">{me.name}</p>
          <p className="m-0 text-[13px] text-muted">
            @{me.username} · {me.role === "admin" ? "Admin" : "Pengguna"}
          </p>
        </div>
      </div>

      <section aria-label="Akun saya">
        <h2 className="mb-1.5 px-1 text-[13px] font-semibold text-muted">Akun saya</h2>
        <Group>
          <li>
            <Sheet title="Nama dan foto" buttonClassName={rowClass} button={<RowInner icon="user" label="Nama dan foto" />}>
              <ProfileForm me={me} p="m-" bare />
            </Sheet>
          </li>
          <li>
            <Sheet title="Ganti password" buttonClassName={rowClass} button={<RowInner icon="lock" label="Ganti password" />}>
              <PasswordForm p="m-" bare />
            </Sheet>
          </li>
          <li>
            <Sheet
              title="Verifikasi dua langkah"
              buttonClassName={rowClass}
              button={
                <RowInner
                  icon="shield"
                  label="Verifikasi dua langkah"
                  value={<span className={`text-[13px] font-semibold ${me.totpEnabled ? "text-plus" : "text-muted"}`}>{me.totpEnabled ? "Aktif" : "Mati"}</span>}
                />
              }
            >
              <TwoFactor enabled={me.totpEnabled} p="m-" bare />
            </Sheet>
          </li>
        </Group>
      </section>

      <section aria-label="Pengaturan aplikasi">
        <h2 className="mb-1.5 px-1 text-[13px] font-semibold text-muted">Aplikasi</h2>
        <Group>
          <li>
            <Link href="/notifikasi" className={rowClass}>
              <RowInner icon="bell" label="Notifikasi harian" />
            </Link>
          </li>
          <li>
            <Link href="/import" className={rowClass}>
              <RowInner icon="income" label="Import mutasi BRI" />
            </Link>
          </li>
          <li>
            <Link href="/kategori" className={rowClass}>
              <RowInner icon="tag" label="Kategori transaksi" />
            </Link>
          </li>
          {me.role === "admin" && (
            <li>
              <Link href="/admin/pengguna" className={rowClass}>
                <RowInner icon="users" label="Kelola pengguna" />
              </Link>
            </li>
          )}
        </Group>
      </section>

      <Group>
        <li>
          <form action={logout}>
            <button type="submit" className={rowClass}>
              <RowInner icon="logout" label="Keluar" danger />
            </button>
          </form>
        </li>
      </Group>
    </div>
  );
}
