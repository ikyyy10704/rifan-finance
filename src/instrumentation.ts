// Dipanggil sekali saat server Next.js mulai. Menyalakan penjadwal peringatan harian 07.00 WIB.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DISABLE_DAILY_ALERTS !== "1") {
    const { startDailyAlerts } = await import("./lib/scheduler");
    startDailyAlerts();
  }
}
