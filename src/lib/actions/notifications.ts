"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { notifications, pushSubscriptions, users } from "@/db/schema";
import { ALERT_KINDS, type NotifyPrefs } from "@/lib/alert-kinds";
import { requireUser } from "@/lib/dal";
import { pushReady, pushToUser } from "@/lib/push";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscription(sub: unknown): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = subSchema.safeParse(sub);
  if (!parsed.success) return { error: "Data langganan notifikasi tidak valid." };
  const { endpoint, keys } = parsed.data;
  await db.insert(pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth } });
  return {};
}

export async function removePushSubscription(endpoint: string) {
  const user = await requireUser();
  await db.delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)));
}

export async function sendTestPush(): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  if (!pushReady()) return { error: "Push belum disiapkan di server. Jalankan npm run push:keys lalu nyalakan ulang server." };
  const r = await pushToUser(db, user.id, {
    title: "Notifikasi Rifan Finance aktif",
    body: "Peringatan keuangan akan dikirim setiap hari pukul 07.00 WIB bila ada yang perlu diperhatikan.",
    url: "/notifikasi",
    tag: "uji",
  });
  if (r.sent === 0) return { error: "Tidak ada perangkat yang menerima. Aktifkan notifikasi di perangkat ini dulu." };
  return { ok: `Terkirim ke ${r.sent} perangkat.` };
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db.update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  // Sengaja tanpa refresh(): label "Baru" tetap terlihat selama halaman ini dibuka;
  // angka di lonceng sudah 0 saat pindah halaman.
}

const prefsSchema = z.object({
  lowBalance: z.number().int().min(0).max(1_000_000_000),
  kinds: z.record(z.string(), z.boolean()),
});

export async function saveNotifyPrefs(prefs: NotifyPrefs): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = prefsSchema.safeParse(prefs);
  if (!parsed.success) return { error: "Pengaturan tidak valid." };
  const kinds = Object.fromEntries(ALERT_KINDS.map((k) => [k.id, parsed.data.kinds[k.id] !== false]));
  await db.update(users)
    .set({ notifyPrefs: JSON.stringify({ lowBalance: parsed.data.lowBalance, kinds }) })
    .where(eq(users.id, user.id));
  refresh();
  return {};
}
