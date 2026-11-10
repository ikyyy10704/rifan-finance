import Papa from "papaparse";

// Parser e-Statement BRImo (CSV dan PDF). Keduanya dipetakan ke bentuk yang sama.

export type StatementRow = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  description: string; // uraian asli dari bank
  debit: number; // rupiah, bilangan bulat
  credit: number;
  balance: number; // saldo setelah transaksi
};

export type Statement = {
  accountNumber: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  /** Ringkasan dari bank (PDF halaman terakhir) untuk dicocokkan dengan hasil baca. */
  bankTotals: { debit: number; credit: number } | null;
  rows: StatementRow[];
};

export class StatementError extends Error {}

const toRupiah = (s: string) => {
  const n = Number(s.replace(/,/g, "").trim() || "0");
  if (!Number.isFinite(n)) throw new StatementError(`Angka tidak terbaca: "${s}"`);
  return Math.round(n);
};

// ---------- CSV ----------
const CSV_COLUMNS = ["NOREK", "TGL_TRAN", "DESK_TRAN", "MUTASI_DEBET", "MUTASI_KREDIT", "SALDO_AKHIR_MUTASI"];

export function parseBriCsv(text: string): Statement {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: true });
  const fields = parsed.meta.fields ?? [];
  const missing = CSV_COLUMNS.filter((c) => !fields.includes(c));
  if (missing.length) {
    throw new StatementError(`Ini bukan CSV e-Statement BRImo: kolom ${missing.join(", ")} tidak ada.`);
  }

  const rows: StatementRow[] = parsed.data.map((r, i) => {
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(r.TGL_TRAN ?? "");
    if (!m) throw new StatementError(`Baris ${i + 1}: tanggal "${r.TGL_TRAN}" tidak terbaca.`);
    // REMARK_CUSTOM berisi uraian yang mudah dibaca (sama dengan di PDF); bila kosong pakai DESK_TRAN.
    const description = (r.REMARK_CUSTOM?.trim() || r.TRREMK?.trim() || r.DESK_TRAN?.trim() || "").replace(/\s+/g, " ");
    return {
      date: m[1],
      time: m[2],
      description,
      debit: toRupiah(r.MUTASI_DEBET ?? "0"),
      credit: toRupiah(r.MUTASI_KREDIT ?? "0"),
      balance: toRupiah(r.SALDO_AKHIR_MUTASI ?? "0"),
    };
  });
  if (rows.length === 0) throw new StatementError("File CSV tidak berisi transaksi.");

  const first = parsed.data[0];
  return {
    accountNumber: first.NOREK?.trim() || null,
    periodFrom: rows[0].date,
    periodTo: rows[rows.length - 1].date,
    openingBalance: first.SALDO_AWAL_MUTASI ? toRupiah(first.SALDO_AWAL_MUTASI) : null,
    closingBalance: rows[rows.length - 1].balance,
    bankTotals: null,
    rows,
  };
}

// ---------- PDF ----------
const ROW_START = /^(\d{2})\/(\d{2})\/(\d{2}) (\d{2}:\d{2}:\d{2}) ?(.*)$/;
// Akhir baris transaksi: <User ID> <debet> <kredit> <saldo>
const ROW_END = /^(.*?)\s*(\d+) ([\d,]+\.\d{2}) ([\d,]+\.\d{2}) ([\d,]+\.\d{2})$/;
const AMOUNT = /[\d,]+\.\d{2}/g;

const ymd = (dd: string, mm: string, yy: string) => `20${yy}-${mm}-${dd}`;

export async function parseBriPdf(data: Uint8Array, password?: string): Promise<Statement> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  let text: string[];
  try {
    const pdf = await getDocumentProxy(data, password ? { password } : undefined);
    text = (await extractText(pdf, { mergePages: false })).text;
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/password/i.test(msg)) throw new StatementError("PDF ini dilindungi password. Isi kolom password PDF lalu coba lagi.");
    throw new StatementError("File PDF tidak bisa dibaca.");
  }

  const all = text.join("\n");
  if (!/LAPORAN TRANSAKSI FINANSIAL|STATEMENT OF FINANCIAL TRANSACTION/i.test(all)) {
    throw new StatementError("Ini bukan PDF e-Statement BRImo (judul \"Laporan Transaksi Finansial\" tidak ditemukan).");
  }

  const lines = all.split(/\r?\n/).map((l) => l.trim());
  const rows: StatementRow[] = [];
  let pending: { date: string; time: string; text: string } | null = null;

  const finish = (joined: string) => {
    const m = ROW_END.exec(joined);
    if (!m || !pending) return false;
    rows.push({
      date: pending.date,
      time: pending.time,
      description: m[1].replace(/\s+/g, " ").trim(),
      debit: toRupiah(m[3]),
      credit: toRupiah(m[4]),
      balance: toRupiah(m[5]),
    });
    pending = null;
    return true;
  };

  for (const line of lines) {
    const start = ROW_START.exec(line);
    if (start) {
      if (pending) throw new StatementError(`Transaksi ${pending.date} ${pending.time} tidak lengkap di PDF.`);
      pending = { date: ymd(start[1], start[2], start[3]), time: start[4], text: start[5] };
      finish(pending.text);
      continue;
    }
    // Uraian yang turun ke baris berikutnya, sampai ketemu kolom User ID + angka.
    if (pending && line) finish((pending.text = `${pending.text} ${line}`.trim()));
  }
  if (pending) throw new StatementError("Transaksi terakhir di PDF tidak lengkap.");
  if (rows.length === 0) throw new StatementError("Tidak ada transaksi yang terbaca di PDF ini.");

  // Header: nomor rekening dan periode.
  const accountNumber = /No\. Rekening[\s\S]{0,40}?:\s*(\d{8,20})/i.exec(all)?.[1] ?? null;
  const period = /Periode Transaksi[\s\S]{0,60}?:\s*(\d{2})\/(\d{2})\/(\d{2})\s*-\s*(\d{2})\/(\d{2})\/(\d{2})/i.exec(all);

  // Ringkasan halaman terakhir: saldo awal, total debet, total kredit, saldo akhir.
  let summary: number[] | null = null;
  const idx = lines.findIndex((l) => /Closing Balance/i.test(l));
  if (idx >= 0) {
    for (const l of lines.slice(idx + 1, idx + 4)) {
      const nums = l.match(AMOUNT);
      if (nums && nums.length === 4) {
        summary = nums.map(toRupiah);
        break;
      }
    }
  }

  return {
    accountNumber,
    periodFrom: period ? ymd(period[1], period[2], period[3]) : rows[0].date,
    periodTo: period ? ymd(period[4], period[5], period[6]) : rows[rows.length - 1].date,
    openingBalance: summary?.[0] ?? null,
    closingBalance: summary?.[3] ?? rows[rows.length - 1].balance,
    bankTotals: summary ? { debit: summary[1], credit: summary[2] } : null,
    rows,
  };
}

// ---------- Pemeriksaan ----------
/**
 * Saldo tiap baris harus = saldo sebelumnya − debet + kredit, dan total harus cocok dengan ringkasan bank.
 * Kalau tidak cocok, berarti ada baris yang salah terbaca: jangan diimpor.
 */
export function verifyStatement(s: Statement): string[] {
  const problems: string[] = [];
  let prev = s.openingBalance;
  s.rows.forEach((r, i) => {
    if (r.debit > 0 === r.credit > 0) problems.push(`Baris ${i + 1} (${r.date} ${r.time}): harus berisi debet atau kredit saja.`);
    if (prev !== null && prev - r.debit + r.credit !== r.balance) {
      problems.push(`Baris ${i + 1} (${r.date} ${r.time}): saldo tidak nyambung dengan baris sebelumnya.`);
    }
    prev = r.balance;
  });
  if (s.bankTotals) {
    const debit = s.rows.reduce((t, r) => t + r.debit, 0);
    const credit = s.rows.reduce((t, r) => t + r.credit, 0);
    if (debit !== s.bankTotals.debit) problems.push(`Total debet terbaca ${debit}, ringkasan bank ${s.bankTotals.debit}.`);
    if (credit !== s.bankTotals.credit) problems.push(`Total kredit terbaca ${credit}, ringkasan bank ${s.bankTotals.credit}.`);
  }
  return problems;
}
