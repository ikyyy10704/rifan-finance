// Penjadwal peringatan harian: setiap hari pukul 07.00 WIB, buat peringatan untuk semua user aktif
// lalu kirim push untuk yang belum terkirim. Dijalankan dari src/instrumentation.ts.
import { and, eq, isNull } from "drizzle-orm";
import { createDb, type Db } from "@/db/client";
import { notifications, users } from "@/db/schema";
import { generateAlerts, jakartaToday } from "./alerts";
import { pushToUser } from "./push";

const SEND_HOUR = 7; // WIB

const jakartaHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false }).format(new Date()));

export async function runDailyAlerts(db: Db, day = jakartaToday()) {
  let created = 0;
  let pushed = 0;
  for (const u of db.select({ id: users.id }).from(users).where(eq(users.active, true)).all()) {
    created += generateAlerts(db, u.id, day);
    const pending = db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, u.id), eq(notifications.day, day), isNull(notifications.pushedAt)))
      .all();
    if (pending.length === 0) continue;
    // Satu push ringkas per user per hari, bukan satu per peringatan.
    const first = pending[0];
    const res = await pushToUser(db, u.id, {
      title: pending.length === 1 ? first.title : `${pending.length} peringatan keuangan hari ini`,
      body: pending.length === 1 ? first.body : pending.map((p) => p.title).join(" · "),
      url: pending.length === 1 && first.href ? first.href : "/notifikasi",
      tag: `harian-${day}`,
    });
    if (res.sent > 0) {
      for (const p of pending) db.update(notifications).set({ pushedAt: new Date().toISOString() }).where(eq(notifications.id, p.id)).run();
      pushed++;
    }
  }
  return { created, pushed };
}

const g = globalThis as unknown as { rifanScheduler?: { timer: NodeJS.Timeout; lastDay?: string } };

export function startDailyAlerts() {
  if (g.rifanScheduler) return; // hot reload di dev: jangan buat interval ganda
  const db = createDb();
  const state: { timer: NodeJS.Timeout; lastDay?: string } = { timer: setTimeout(() => {}, 0) };
  const tick = async () => {
    const day = jakartaToday();
    if (state.lastDay === day || jakartaHour() < SEND_HOUR) return;
    state.lastDay = day;
    try {
      const r = await runDailyAlerts(db, day);
      console.log(`[peringatan harian] ${day}: ${r.created} peringatan baru, push ke ${r.pushed} user`);
    } catch (e) {
      state.lastDay = undefined; // coba lagi menit berikutnya
      console.error("[peringatan harian] gagal:", e);
    }
  };
  state.timer = setInterval(tick, 60_000);
  state.timer.unref?.();
  g.rifanScheduler = state;
  void tick();
}
