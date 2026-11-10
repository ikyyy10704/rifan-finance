import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/page-header";
import { card, secondaryButton } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { resetUserTotp, setUserActive } from "@/lib/actions/users";
import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/data/users";
import { CreateUserForm, ResetPasswordForm } from "./forms";

export const metadata: Metadata = { title: "Kelola Pengguna" };

export default function PenggunaPage() {
  return (
    <>
      <PageHeader title="Kelola Pengguna" subtitle="Hanya admin yang bisa membuat dan mengatur akun" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat daftar pengguna...</p>}>
        <Users />
      </Suspense>
    </>
  );
}

async function Users() {
  const admin = await requireAdmin();
  const users = await listUsers();

  return (
    <PageBody>
      <div className="grid gap-3.5 app:gap-6 wide:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] wide:items-start">
        <section aria-labelledby="users-title" className={card}>
          <h2 id="users-title" className="m-0 mb-1 text-[15px] app:text-base">
            Akun terdaftar
          </h2>
          <p className="mt-0 mb-3 text-[13px] text-muted">Akun nonaktif tidak bisa login dan langsung dikeluarkan dari semua perangkat.</p>
          <ul className="m-0 list-none p-0">
            {users.map((u, i) => {
              const self = u.id === admin.id;
              return (
                <li key={u.id} className={`py-3.5 ${i ? "border-t border-line" : ""}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar userId={u.id} name={u.name} avatar={u.avatar} size={42} muted={!u.active} />
                    <div className="min-w-0 flex-1">
                      <b className="block truncate">
                        {u.name}
                        {self && <span className="font-medium text-muted"> (Anda)</span>}
                      </b>
                      <small className="text-xs text-muted">
                        @{u.username} · {u.role === "admin" ? "Admin" : "Pengguna"} · {u.active ? "Aktif" : "Nonaktif"}
                        {u.totpEnabled && " · 2FA aktif"}
                      </small>
                    </div>
                    {!self && (
                      <form action={setUserActive.bind(null, u.id, !u.active)}>
                        <button type="submit" className={secondaryButton}>
                          {u.active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="flex flex-wrap items-start gap-x-4">
                    <ResetPasswordForm userId={u.id} username={u.username} self={self} />
                    {u.totpEnabled && !self && (
                      <form action={resetUserTotp.bind(null, u.id)} className="mt-2.5">
                        <button type="submit" className="inline-flex min-h-11 items-center text-[13px] font-bold text-danger hover:underline">
                          Matikan 2FA {u.username}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <CreateUserForm />
      </div>
    </PageBody>
  );
}
