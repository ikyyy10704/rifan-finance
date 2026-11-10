import type { AccountType } from "@/db/schema";

// Penyedia akun yang bisa dipilih saat membuat akun. Logo ada di public/brand/providers.
export const PROVIDERS = [
  { id: "bri", label: "BRI", type: "bank", logo: "/brand/providers/bri.svg", ratio: 512 / 260.419 },
  { id: "dana", label: "DANA", type: "ewallet", logo: "/brand/providers/dana.svg", ratio: 382 / 109.22 },
  { id: "gopay", label: "GoPay", type: "ewallet", logo: "/brand/providers/gopay.svg", ratio: 512 / 112.84 },
  { id: "shopeepay", label: "ShopeePay", type: "ewallet", logo: "/brand/providers/shopeepay.svg", ratio: 1215.33 / 232.97 },
  { id: "bank_other", label: "Bank lain", type: "bank" },
  { id: "ewallet_other", label: "E-wallet lain", type: "ewallet" },
  { id: "cash", label: "Tunai", type: "cash" },
] as const satisfies readonly { id: string; label: string; type: AccountType; logo?: string; ratio?: number }[];

export type ProviderId = (typeof PROVIDERS)[number]["id"];
export const PROVIDER_IDS = PROVIDERS.map((p) => p.id) as [ProviderId, ...ProviderId[]];

export type Provider = { id: string; label: string; type: AccountType; logo?: string; ratio?: number };
export const findProvider = (id: string | null | undefined): Provider | undefined => PROVIDERS.find((p) => p.id === id);

/** Label kolom nomor sesuai jenis akun. */
export const numberLabel = (type: AccountType) => (type === "bank" ? "Nomor rekening" : "Nomor HP terdaftar");

/** 1234567890 -> 1234 5678 90, supaya mudah dibaca dan disalin. */
export const formatAccountNumber = (n: string) => n.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
