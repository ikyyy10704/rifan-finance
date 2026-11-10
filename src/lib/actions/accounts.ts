"use server";

import { and, eq, not } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { findProvider, PROVIDER_IDS } from "@/lib/providers";

export type AccountFormState = { error?: string; savedAt?: number };

const accountSchema = z.object({
  provider: z.enum(PROVIDER_IDS, { error: "Pilih jenis akun." }),
  name: z.string().trim().min(1, "Isi nama akun.").max(40, "Nama akun maksimal 40 karakter."),
  accountNumber: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{0,30}$/, "Nomor hanya boleh berisi angka (boleh diawali +)."))
    .optional(),
  initialBalance: z
    .string()
    .transform((s) => Number(s.replace(/\D/g, "") || "0"))
    .pipe(z.number().int().min(0).max(1_000_000_000_000, "Saldo awal terlalu besar.")),
});

export async function createAccount(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = accountSchema.safeParse({
    provider: formData.get("provider"),
    name: formData.get("name") ?? "",
    accountNumber: String(formData.get("accountNumber") ?? ""),
    initialBalance: String(formData.get("initialBalance") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const type = findProvider(d.provider)!.type; // jenis akun mengikuti penyedia, bukan input form
  await db.insert(accounts)
    .values({
      userId: user.id,
      provider: d.provider,
      type,
      name: d.name,
      accountNumber: type === "cash" || !d.accountNumber ? null : d.accountNumber,
      initialBalance: d.initialBalance,
    });
  refresh();
  return { savedAt: Date.now() };
}

export async function toggleArchiveAccount(id: number) {
  const user = await requireUser();
  await db.update(accounts)
    .set({ archived: not(accounts.archived) })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
  refresh();
}
