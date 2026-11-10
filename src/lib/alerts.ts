// Peringatan keuangan harian. Tanpa "server-only" dan tanpa sesi: dipakai juga oleh penjadwal 07.00 WIB.
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { notifications, users } from "@/db/schema";

import { parseNotifyPrefs, type AlertKind } from "./alert-kinds";

export { parseNotifyPrefs };

const nf = new Intl.NumberFormat("id-ID");
const rp = (n: number) => (n < 0 ? "−Rp" : "Rp") + nf.format(Math.abs(Math.round(n)));
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const jakartaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

type Alert = { kind: AlertKind; level: "info" | "warning" | "danger"; title: string; body: string; href: string };

/** Hitung peringatan untuk satu user pada hari tertentu dari data terbaru. */
export function computeAlerts(db: Db, userId: number, day: string): Alert[] {
  const u = db.select({ prefs: users.notifyPrefs }).from(users).where(eq(users.id, userId)).get();
  const prefs = parseNotifyPrefs(u?.prefs);
  const month = day.slice(0, 7);
  const dayOfMonth = Number(day.slice(8, 10));
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const out: Alert[] = [];

  // Total bulan berjalan sampai hari ini.
  const m = db.get<{ income: number; expense: number }>(sql`
    SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) AS income,
           COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS expense
    FROM transactions WHERE user_id=${userId} AND substr(date,1,7)=${month} AND date <= ${day}`) ?? { income: 0, expense: 0 };

  if (prefs.kinds.defisit && m.expense > 0 && m.expense > m.income) {
    out.push({
      kind: "defisit",
      level: "warning",
      title: "Pengeluaran bulan ini melebihi pemasukan",
      body: `Sampai hari ini keluar ${rp(m.expense)}, masuk ${rp(m.income)}. Selisih ${rp(m.expense - m.income)}.`,
      href: "/transaksi",
    });
  } else if (prefs.kinds.proyeksi && m.income > 0 && dayOfMonth >= 5 && m.expense > 0) {
    const perDay = m.expense / dayOfMonth;
    const projected = perDay * daysInMonth;
    if (projected > m.income) {
      out.push({
        kind: "proyeksi",
        level: "warning",
        title: "Perkiraan defisit di akhir bulan",
        body: `Dengan rata-rata ${rp(perDay)} per hari, pengeluaran ${BULAN[Number(month.slice(5, 7)) - 1]} diperkirakan ${rp(projected)}, di atas pemasukan ${rp(m.income)}.`,
        href: "/transaksi",
      });
    }
  }

  // Lonjakan: pengeluaran kemarin dibanding rata-rata 30 hari sebelumnya.
  if (prefs.kinds.lonjakan) {
    const yesterday = addDays(day, -1);
    const y = db.get<{ s: number }>(sql`SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id=${userId} AND type='expense' AND date=${yesterday}`)?.s ?? 0;
    const w = db.get<{ s: number; days: number }>(sql`
      SELECT COALESCE(SUM(amount),0) AS s, COUNT(DISTINCT date) AS days FROM transactions
      WHERE user_id=${userId} AND type='expense' AND date >= ${addDays(yesterday, -30)} AND date < ${yesterday}`) ?? { s: 0, days: 0 };
    const avg = w.s / 30;
    if (w.days >= 7 && y >= 50_000 && y > avg * 2) {
      out.push({
        kind: "lonjakan",
        level: "warning",
        title: "Pengeluaran kemarin jauh di atas biasanya",
        body: `Kemarin keluar ${rp(y)}, sekitar ${(y / avg).toFixed(1).replace(".", ",")} kali rata-rata harian ${rp(avg)} dalam 30 hari terakhir.`,
        href: `/transaksi?bulan=${yesterday.slice(0, 7)}`,
      });
    }
  }

  // Saldo rendah per akun aktif.
  if (prefs.kinds.saldo_rendah && prefs.lowBalance > 0) {
    const low = db.all<{ name: string; balance: number }>(sql`
      SELECT a.name, a.initial_balance + COALESCE((SELECT SUM(CASE
          WHEN t.type='income' AND t.account_id=a.id THEN t.amount
          WHEN t.type IN ('expense','transfer') AND t.account_id=a.id THEN -t.amount
          WHEN t.type='transfer' AND t.to_account_id=a.id THEN t.amount ELSE 0 END)
        FROM transactions t WHERE t.user_id=a.user_id AND (t.account_id=a.id OR t.to_account_id=a.id)),0) AS balance
      FROM accounts a WHERE a.user_id=${userId} AND a.archived=0`).filter((a) => a.balance < prefs.lowBalance);
    if (low.length) {
      const negative = low.some((a) => a.balance < 0);
      out.push({
        kind: "saldo_rendah",
        level: negative ? "danger" : "warning",
        title: negative ? "Ada saldo akun yang minus" : `Saldo di bawah ${rp(prefs.lowBalance)}`,
        body: low.map((a) => `${a.name} ${rp(a.balance)}`).join(", ") + ".",
        href: "/akun",
      });
    }
  }

  if (prefs.kinds.draft_impor) {
    const n = db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM import_rows WHERE user_id=${userId} AND status='draft'`)?.n ?? 0;
    if (n > 0) {
      out.push({
        kind: "draft_impor",
        level: "info",
        title: `${n} baris mutasi BRI belum dimasukkan`,
        body: "Cek preview impor, pilih yang benar, lalu masukkan ke database supaya saldo sesuai bank.",
        href: "/import",
      });
    }
  }

  if (prefs.kinds.belum_catat) {
    const hasAccount = db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM accounts WHERE user_id=${userId} AND archived=0`)?.n ?? 0;
    const last = db.get<{ d: string | null }>(sql`SELECT MAX(date(created_at, '+7 hours')) AS d FROM transactions WHERE user_id=${userId}`)?.d ?? null;
    if (hasAccount && (!last || last <= addDays(day, -3))) {
      out.push({
        kind: "belum_catat",
        level: "info",
        title: "Sudah 3 hari belum ada catatan",
        body: "Catat pengeluaran kecil juga (parkir, kopi, jajan) supaya laporan bulanannya akurat.",
        href: "/transaksi",
      });
    }
  }

  return out;
}

/** Simpan peringatan hari ini (sekali per jenis per hari). Mengembalikan jumlah yang baru dibuat. */
export function generateAlerts(db: Db, userId: number, day = jakartaToday()) {
  let created = 0;
  for (const a of computeAlerts(db, userId, day)) {
    const res = db
      .insert(notifications)
      .values({ userId, day, ...a })
      .onConflictDoNothing()
      .run();
    created += res.changes;
  }
  return created;
}

export function unreadCount(db: Db, userId: number) {
  return (
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`))
      .get()?.n ?? 0
  );
}
