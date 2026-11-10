import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { runDailyAlerts } from "@/lib/scheduler";

// Dipanggil Vercel Cron setiap hari 00.00 UTC (07.00 WIB), lihat vercel.json.
// Vercel mengirim header "Authorization: Bearer <CRON_SECRET>"; tanpa itu permintaan ditolak.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new Response("Unauthorized", { status: 401 });

  const r = await runDailyAlerts(db);
  console.log(`[peringatan harian] ${r.created} peringatan baru, push ke ${r.pushed} user`);
  return Response.json(r);
}
