import { and, eq } from "drizzle-orm";
import type { Db } from "./client";
import { categories } from "./schema";

type Def = { name: string; kind: "income" | "expense"; icon: string; color: string };

// Kategori bawaan. icon/color dipetakan di src/components/icons.tsx.
export const DEFAULT_CATEGORIES: Def[] = [
  // Pengeluaran
  { name: "Makan", kind: "expense", icon: "food", color: "r" },
  { name: "Ngopi", kind: "expense", icon: "coffee", color: "a" },
  { name: "Transportasi", kind: "expense", icon: "transport", color: "a" },
  { name: "Tagihan", kind: "expense", icon: "bill", color: "a" },
  { name: "Kebutuhan", kind: "expense", icon: "box", color: "l" },
  { name: "Kebutuhan rumah", kind: "expense", icon: "cart", color: "l" },
  { name: "Gaya hidup", kind: "expense", icon: "heart", color: "r" },
  { name: "Fashion", kind: "expense", icon: "shirt", color: "b" },
  { name: "Hiburan", kind: "expense", icon: "fun", color: "b" },
  { name: "Olahraga", kind: "expense", icon: "run", color: "g" },
  { name: "Naik gunung", kind: "expense", icon: "mountain", color: "g" },
  { name: "Investasi & trading", kind: "expense", icon: "chart", color: "b" },
  { name: "Modal usaha", kind: "expense", icon: "briefcase", color: "a" },
  { name: "Biaya admin & bank", kind: "expense", icon: "bill", color: "l" },
  { name: "Lainnya", kind: "expense", icon: "other", color: "l" },
  // Pemasukan
  { name: "Gaji", kind: "income", icon: "salary", color: "g" },
  { name: "Hasil investasi", kind: "income", icon: "chart", color: "g" },
  { name: "Hasil usaha", kind: "income", icon: "briefcase", color: "g" },
  { name: "Pemasukan lain", kind: "income", icon: "income", color: "g" },
];

/**
 * Tambahkan kategori bawaan yang belum dimiliki user (dicocokkan dari nama + jenis).
 * Aman dijalankan berulang; kategori yang sudah ada, diganti nama, atau disembunyikan tidak disentuh.
 */
export async function seedDefaultCategories(db: Db, userId: number) {
  const have = new Set(
    (
      await db
      .select({ name: categories.name, kind: categories.kind })
      .from(categories)
        .where(and(eq(categories.userId, userId)))
    ).map((c) => `${c.kind}:${c.name.toLowerCase()}`),
  );
  const missing = DEFAULT_CATEGORIES.filter((c) => !have.has(`${c.kind}:${c.name.toLowerCase()}`));
  if (missing.length) await db.insert(categories).values(missing.map((c) => ({ ...c, userId })));
  return missing.length;
}
