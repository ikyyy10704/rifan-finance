import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, pushSubscriptions, users } from "@/db/schema";
import { generateAlerts, parseNotifyPrefs, unreadCount } from "@/lib/alerts";
import { requireUser } from "@/lib/dal";
import { pushReady } from "@/lib/push";

/**
 * Pastikan peringatan hari ini sudah dibuat (bila server mati saat 07.00, tetap muncul saat aplikasi dibuka),
 * lalu kembalikan jumlah yang belum dibaca.
 */
export async function ensureTodayAlerts() {
  const user = await requireUser();
  generateAlerts(db, user.id);
  return unreadCount(db, user.id);
}

export async function getNotificationPage() {
  const user = await requireUser();
  generateAlerts(db, user.id);
  const list = db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.day), desc(notifications.id))
    .limit(90)
    .all();
  const prefs = parseNotifyPrefs(db.select({ p: users.notifyPrefs }).from(users).where(eq(users.id, user.id)).get()?.p);
  const devices = db.select({ endpoint: pushSubscriptions.endpoint }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)).all().length;
  return {
    list,
    prefs,
    devices,
    vapidPublicKey: pushReady() ? (process.env.VAPID_PUBLIC_KEY ?? null) : null,
  };
}
