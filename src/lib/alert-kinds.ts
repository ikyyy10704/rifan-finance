// Jenis peringatan dan pengaturannya. Tanpa dependensi database, aman dipakai di client component.
export const ALERT_KINDS = [
  { id: "defisit", label: "Pengeluaran bulan ini melebihi pemasukan" },
  { id: "proyeksi", label: "Perkiraan defisit di akhir bulan" },
  { id: "lonjakan", label: "Pengeluaran kemarin jauh di atas rata-rata" },
  { id: "saldo_rendah", label: "Saldo akun di bawah batas" },
  { id: "draft_impor", label: "Mutasi BRI yang belum dimasukkan" },
  { id: "belum_catat", label: "Belum mencatat transaksi 3 hari" },
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number]["id"];

export type NotifyPrefs = { lowBalance: number; kinds: Record<AlertKind, boolean> };
export const DEFAULT_NOTIFY: NotifyPrefs = {
  lowBalance: 100_000,
  kinds: Object.fromEntries(ALERT_KINDS.map((k) => [k.id, true])) as Record<AlertKind, boolean>,
};

export function parseNotifyPrefs(json: string | null | undefined): NotifyPrefs {
  const p: NotifyPrefs = { lowBalance: DEFAULT_NOTIFY.lowBalance, kinds: { ...DEFAULT_NOTIFY.kinds } };
  if (!json) return p;
  try {
    const s = JSON.parse(json) as Partial<NotifyPrefs>;
    if (typeof s.lowBalance === "number" && s.lowBalance >= 0) p.lowBalance = Math.round(s.lowBalance);
    for (const k of ALERT_KINDS) if (typeof s.kinds?.[k.id] === "boolean") p.kinds[k.id] = s.kinds[k.id];
  } catch {}
  return p;
}
