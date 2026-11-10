import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { getNotificationPage } from "@/lib/data/notifications";
import { longDate, todayJakarta } from "@/lib/format";
import { AlertPrefs, MarkRead, PushToggle } from "./settings";

export const metadata: Metadata = { title: "Notifikasi" };

const LEVEL = {
  danger: { tone: "bg-danger-bg text-danger", label: "Penting" },
  warning: { tone: "bg-[#FBF0DA] text-[#8A5E08]", label: "Peringatan" },
  info: { tone: "bg-[#E4EEFB] text-blue", label: "Info" },
} as const;

export default function NotifikasiPage() {
  return (
    <>
      <PageHeader title="Notifikasi" subtitle="Peringatan keuangan harian, dikirim pukul 07.00 WIB" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat notifikasi...</p>}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const { list, prefs, devices, vapidPublicKey } = await getNotificationPage();
  const unread = list.filter((n) => !n.readAt).length;
  const today = todayJakarta();
  const byDay = new Map<string, typeof list>();
  for (const n of list) byDay.set(n.day, [...(byDay.get(n.day) ?? []), n]);

  const dayLabel = (d: string) => {
    if (d === today) return "Hari ini";
    const y = new Date(`${today}T00:00:00Z`);
    y.setUTCDate(y.getUTCDate() - 1);
    if (d === y.toISOString().slice(0, 10)) return "Kemarin";
    return longDate(d).replace(/ \d{4}$/, "");
  };

  return (
    <PageBody>
      <MarkRead unread={unread} />
      <div className="grid gap-3.5 app:gap-6 wide:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] wide:items-start">
        <div className="flex flex-col gap-4">
          {list.length === 0 ? (
            <div className="rounded-[18px] bg-white px-4 py-6 text-center app:border app:border-line">
              <p className="m-0 font-semibold">Tidak ada peringatan</p>
              <p className="mt-1 mb-0 text-[13px] text-muted">Keuangan Anda tidak memicu peringatan apa pun hari ini.</p>
            </div>
          ) : (
            [...byDay].map(([day, items]) => (
              <section key={day} aria-labelledby={`n-${day}`}>
                <h2 id={`n-${day}`} className="mb-1.5 px-1 text-[13px] text-muted">
                  {dayLabel(day)}
                </h2>
                <ul className="m-0 list-none rounded-[18px] bg-white px-4 py-1 app:border app:border-line">
                  {items.map((n, i) => {
                    const lv = LEVEL[n.level];
                    const isNew = !n.readAt;
                    return (
                      <li key={n.id} className={i ? "border-t border-line" : ""}>
                        <Link href={n.href ?? "/dashboard"} className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-3 hover:bg-bg">
                          <span className={`mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full ${lv.tone}`}>
                            <Icon name={n.level === "info" ? "bell" : "alert"} className="h-[18px] w-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <b className="block text-[14px] leading-snug">
                              {n.title}
                              {isNew && <span className="ml-2 rounded-md bg-lime px-1.5 py-0.5 align-middle text-[10.5px] font-extrabold text-g900">Baru</span>}
                            </b>
                            <span className="mt-0.5 block text-[13px] text-muted">{n.body}</span>
                            <span className="sr-only">{lv.label}</span>
                          </span>
                          <Icon name="chevronRight" className="mt-2 h-[18px] w-[18px] text-muted" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3.5 app:gap-6">
          <section aria-labelledby="push-title" className={card}>
            <h2 id="push-title" className="m-0 mb-3 text-[15px] app:text-base">
              Kirim ke HP
            </h2>
            <PushToggle vapidPublicKey={vapidPublicKey} devices={devices} />
          </section>
          <section aria-labelledby="pref-title" className={card}>
            <h2 id="pref-title" className="m-0 mb-3 text-[15px] app:text-base">
              Pengaturan peringatan
            </h2>
            <AlertPrefs prefs={prefs} />
          </section>
        </div>
      </div>
    </PageBody>
  );
}
