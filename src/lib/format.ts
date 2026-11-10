// Format Rupiah dan tanggal sesuai PRD: Rp1.234.567, zona Asia/Jakarta.
const nf = new Intl.NumberFormat("id-ID");
const TZ = "Asia/Jakarta";
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const rupiah = (n: number) => (n < 0 ? "−Rp" : "Rp") + nf.format(Math.abs(n));

/** Nominal transaksi seperti di mockup: +Rp pemasukan, −Rp pengeluaran, Rp transfer. */
export function txAmount(type: "income" | "expense" | "transfer", amount: number) {
  if (type === "income") return "+" + rupiah(amount);
  if (type === "expense") return "−" + rupiah(amount);
  return rupiah(amount);
}

export const todayJakarta = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
export const thisMonth = () => todayJakarta().slice(0, 7);

const parts = (date: string) => date.split("-").map(Number) as [number, number, number];

export function shortDate(date: string) {
  const [, m, d] = parts(date);
  return `${d} ${BULAN_PENDEK[m - 1]}`;
}

export function longDate(date: string) {
  const [y, m, d] = parts(date);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${HARI[wd]}, ${d} ${BULAN[m - 1]} ${y}`;
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${BULAN[m - 1]} ${y}`;
}

export const monthShort = (month: string) => BULAN_PENDEK[Number(month.slice(5, 7)) - 1];

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const isMonth = (s: unknown): s is string => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export const ACCOUNT_TYPE_LABEL = { cash: "Tunai", bank: "Bank", ewallet: "E-wallet" } as const;
