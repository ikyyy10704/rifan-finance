// Widget beranda yang bisa ditampilkan atau disembunyikan dari "Atur tampilan".
// Ringkasan saldo (kartu hijau) selalu tampil karena itu inti beranda.
export const WIDGETS = [
  { id: "quick", label: "Aksi cepat", hint: "Tombol Pemasukan, Pengeluaran, Transfer, Akun", full: true, default: true },
  { id: "month", label: "Pemasukan & pengeluaran bulan ini", hint: "Dua angka total bulan berjalan", full: true, default: true },
  { id: "cashflow", label: "Arus kas 6 bulan", hint: "Grafik batang pemasukan dan pengeluaran per bulan", full: false, default: true },
  { id: "categories", label: "Komposisi pengeluaran", hint: "Donat 5 kategori terbesar bulan ini", full: false, default: true },
  { id: "pace", label: "Laju pengeluaran", hint: "Garis pengeluaran bulan ini dibanding bulan lalu", full: false, default: true },
  { id: "recent", label: "Transaksi terakhir", hint: "5 transaksi terbaru", full: false, default: true },
  { id: "balances", label: "Saldo per akun", hint: "Saldo setiap akun dengan logonya", full: false, default: false },
] as const;

export type WidgetId = (typeof WIDGETS)[number]["id"];
export type DashboardPrefs = Record<WidgetId, boolean>;

export const DEFAULT_PREFS = Object.fromEntries(WIDGETS.map((w) => [w.id, w.default])) as DashboardPrefs;

/** Baca JSON dari database; widget baru yang belum pernah diatur memakai nilai bawaannya. */
export function parsePrefs(json: string | null | undefined): DashboardPrefs {
  const prefs = { ...DEFAULT_PREFS };
  if (!json) return prefs;
  try {
    const saved = JSON.parse(json) as Record<string, unknown>;
    for (const w of WIDGETS) if (typeof saved[w.id] === "boolean") prefs[w.id] = saved[w.id] as boolean;
  } catch {}
  return prefs;
}
