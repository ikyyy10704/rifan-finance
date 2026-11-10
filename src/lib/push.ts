// Kirim Web Push. Tanpa "server-only": dipakai juga oleh penjadwal di instrumentation.
import { eq } from "drizzle-orm";
import { sendNotification, setVapidDetails } from "web-push";
import type { Db } from "@/db/client";
import { pushSubscriptions } from "@/db/schema";

let configured: boolean | undefined;

/** Push hanya aktif bila kunci VAPID sudah dibuat (npm run push:keys). */
export function pushReady() {
  if (configured !== undefined) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  return (configured = true);
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Kirim ke semua perangkat milik user. Langganan yang sudah kedaluwarsa (404/410) dihapus. */
export async function pushToUser(db: Db, userId: number, payload: PushPayload) {
  if (!pushReady()) return { sent: 0, failed: 0 };
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    try {
      await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
      sent++;
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
    }
  }
  return { sent, failed };
}
