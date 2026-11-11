import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { getNotificationSettings } from "@/lib/data/notifications";
import { AlertPrefs, PushToggle } from "../settings";

export const metadata: Metadata = { title: "Pengaturan notifikasi" };

export default function PengaturanNotifikasiPage() {
  return (
    <>
      <PageHeader
        title="Pengaturan notifikasi"
        mobileTitle="Pengaturan"
        subtitle="Peringatan apa yang dikirim, dan ke perangkat mana"
        back={{ href: "/notifikasi", label: "Notifikasi" }}
      />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat pengaturan...</p>}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const { prefs, devices, vapidPublicKey } = await getNotificationSettings();
  return (
    <PageBody>
      {/* Dua kartu berdampingan dan sama tinggi di layar lebar, tanpa ruang kosong di kanan atau bawah. */}
      <div className="grid gap-3.5 app:gap-6 wide:grid-cols-2">
        <section aria-labelledby="pref-title" className={card}>
          <h2 id="pref-title" className="m-0 mb-1 text-[15px] app:text-base">
            Peringatan harian
          </h2>
          <p className="mt-0 mb-3 text-[13px] text-muted">Diperiksa setiap pagi pukul 07.00 WIB dari data transaksi terbaru.</p>
          <AlertPrefs prefs={prefs} />
        </section>
        <section aria-labelledby="push-title" className={card}>
          <h2 id="push-title" className="m-0 mb-3 text-[15px] app:text-base">
            Kirim ke HP
          </h2>
          <PushToggle vapidPublicKey={vapidPublicKey} devices={devices} />
        </section>
      </div>
    </PageBody>
  );
}
