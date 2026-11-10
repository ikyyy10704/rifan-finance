import type { StatementRow } from "./bri";

// Tebakan awal kategori dari uraian mutasi. Semua bisa diubah di layar preview.

type Cat = { id: number; name: string; kind: "income" | "expense"; archived: boolean };
type Acc = { id: number; provider: string | null; accountNumber: string | null; archived: boolean };

export type Guess = {
  kind: "income" | "expense" | "transfer";
  categoryId: number | null;
  toAccountId: number | null;
  note: string;
};

// Kata kunci (huruf besar) -> nama kategori bawaan.
const EXPENSE_RULES: [RegExp, string][] = [
  [/KOPI|COFFEE|KAFE|CAFE|KEDAI|STARBUCKS|JANJI JIWA|KOPKEN/, "Ngopi"],
  [/RUMAH MAKAN|RM |WARUNG|WARTEG|BAKSO|BATAGOR|SATE|SOTO|MIE |MIEAYAM|AYAM|NASI|RESTO|PADANG|BAKERY|ROTI|MCD|KFC|PIZZA|SEAFOOD|GEPREK|KULINER/, "Makan"],
  [/MIROTA|INDOMARET|ALFAMART|ALFAMIDI|SUPERMARKET|HYPERMART|SUPERINDO|TOSERBA|MINIMARKET|\bMART\b/, "Kebutuhan"],
  [/PLN|PDAM|TELKOM|INDIHOME|BPJS|PULSA|TAGIHAN|LISTRIK|WIFI|BIZNET|FIRST MEDIA/, "Tagihan"],
  [/PERTAMINA|SPBU|SHELL|BENSIN|PARKIR|GRAB|GOJEK|MAXIM|TOL\b|KAI\b|TRAVELOKA/, "Transportasi"],
  [/APOTEK|KLINIK|RUMAH SAKIT|DOKTER/, "Kesehatan"],
];
const INCOME_RULES: [RegExp, string][] = [
  [/GAJI|PAYROLL|SALARY/, "Gaji"],
  [/DIVIDEN|BUNGA|INTEREST/, "Hasil investasi"],
];

// Top up e-wallet lewat BRImo -> transfer ke akun e-wallet milik sendiri.
const TOPUP: [RegExp, string][] = [
  [/TOP ?UP DANA/, "dana"],
  [/TOP ?UP SHOPEE/, "shopeepay"],
  [/TOP ?UP GO-?PAY|GOPAY/, "gopay"],
];

const titleCase = (s: string) => s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/** Keterangan yang enak dibaca dari uraian bank. Kode QRIS mentah jadi "Pembayaran QRIS". */
export function cleanNote(desc: string): string {
  const d = desc.replace(/[\\/]{2,}/g, " ").replace(/\s+/g, " ").trim();
  if (/^(QRIS|QRISRNS)?\d*#?\d*#\d+/.test(d) || /^QRIS(RNS)?\d+#/.test(d)) return "Pembayaran QRIS";
  const merchant = /^Pembayaran QRIS (.+)$/i.exec(d);
  if (merchant) return titleCase(merchant[1]).slice(0, 120);
  return d.slice(0, 120);
}

export function guessRow(
  row: StatementRow,
  prev: StatementRow | undefined,
  categories: Cat[],
  accounts: Acc[],
  sourceAccountId: number,
): Guess {
  const up = row.description.toUpperCase();
  const byName = (kind: "income" | "expense", name: string) =>
    categories.find((c) => c.kind === kind && !c.archived && c.name.toLowerCase() === name.toLowerCase())?.id ?? null;
  const fallback = (kind: "income" | "expense") => byName(kind, kind === "income" ? "Pemasukan lain" : "Lainnya");

  if (row.credit > 0) {
    const rule = INCOME_RULES.find(([re]) => re.test(up));
    return { kind: "income", categoryId: (rule && byName("income", rule[1])) ?? fallback("income"), toAccountId: null, note: cleanNote(row.description) };
  }

  // Biaya admin: baris kecil tepat setelah transaksi dengan waktu dan uraian yang sama (mis. top up + Rp250).
  if (prev && prev.date === row.date && prev.time === row.time && prev.description === row.description && prev.debit > 0 && row.debit <= 10000 && row.debit < prev.debit) {
    return {
      kind: "expense",
      categoryId: byName("expense", "Biaya admin & bank") ?? fallback("expense"),
      toAccountId: null,
      note: `Biaya admin: ${cleanNote(row.description)}`.slice(0, 120),
    };
  }

  // Top up ke e-wallet sendiri. Nomor di mutasi disamarkan (0812xxxx094): cocokkan 3 digit terakhir bila akun punya nomor.
  for (const [re, provider] of TOPUP) {
    if (!re.test(up)) continue;
    const tail = /(\d{3})\b/.exec(/\d{4}x+\d{3}/i.exec(row.description)?.[0] ?? "")?.[1];
    const own = accounts.find(
      (a) => a.provider === provider && !a.archived && a.id !== sourceAccountId && (!a.accountNumber || !tail || a.accountNumber.endsWith(tail)),
    );
    if (own) return { kind: "transfer", categoryId: null, toAccountId: own.id, note: cleanNote(row.description) };
  }

  const rule = EXPENSE_RULES.find(([re]) => re.test(up));
  return { kind: "expense", categoryId: (rule && byName("expense", rule[1])) ?? fallback("expense"), toAccountId: null, note: cleanNote(row.description) };
}

/** Sidik unik satu baris mutasi; sama untuk CSV dan PDF dari rekening yang sama. */
export function rowHash(accountNumber: string | null, accountId: number, r: StatementRow) {
  const dir = r.debit > 0 ? "D" : "C";
  return `BRI|${accountNumber ?? "acc" + accountId}|${r.date}T${r.time}|${dir}|${r.debit || r.credit}|${r.balance}`;
}
