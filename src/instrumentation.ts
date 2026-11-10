// Dipanggil sekali saat server Next.js mulai. Di server biasa (npm start / dev) menyalakan penjadwal
// peringatan harian 07.00 WIB. Di Vercel server tidak menyala terus, jadi yang memicu adalah Vercel Cron
// (vercel.json -> /api/cron/peringatan-harian).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL && process.env.DISABLE_DAILY_ALERTS !== "1") {
    const { startDailyAlerts } = await import("./lib/scheduler");
    startDailyAlerts();
  }
}
