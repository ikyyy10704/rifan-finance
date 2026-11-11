"use client";

import { useActionState, useState } from "react";
import { errorBox, fieldInput, fieldLabel, primaryButton } from "@/components/ui";
import { uploadStatement, type UploadState } from "@/lib/actions/import";

type BriAccount = { id: number; name: string; accountNumber: string | null };

export function UploadForm({ accounts }: { accounts: BriAccount[] }) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadStatement, {});
  const [fileName, setFileName] = useState<string>("");
  const isPdf = fileName.toLowerCase().endsWith(".pdf");

  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && (
        <div role="alert" className={errorBox}>
          <p className="m-0">{state.error}</p>
          {state.problems && (
            <ul className="mt-1.5 mb-0 pl-4 font-normal">
              {state.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <label htmlFor="imp-account" className={fieldLabel}>
          Akun BRI tujuan
        </label>
        <select id="imp-account" name="accountId" required defaultValue={accounts[0]?.id} className={fieldInput}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.accountNumber ? ` (…${a.accountNumber.slice(-4)})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className={fieldLabel}>File e-Statement BRImo</span>
        <label
          htmlFor="imp-file"
          className="flex min-h-[88px] min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#b9c6c0] bg-bg px-4 py-4 text-center hover:border-g700 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-g700"
        >
          {/* Nama file e-Statement panjang tanpa spasi: boleh dipatah di mana saja supaya tidak melebarkan halaman. */}
          <b className="max-w-full text-sm break-all text-g800">{fileName || "Pilih file CSV atau PDF"}</b>
          <small className="text-xs text-muted">{fileName ? "Tekan untuk mengganti file" : "Unduh dari BRImo: Mutasi Rekening, lalu e-Statement. Maksimal 5 MB."}</small>
          <input
            id="imp-file"
            name="file"
            type="file"
            required
            accept=".csv,.pdf,text/csv,application/pdf"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
      </div>

      {isPdf && (
        <div>
          <label htmlFor="imp-pass" className={fieldLabel}>
            Password PDF <span className="font-normal">(isi hanya bila PDF dikunci)</span>
          </label>
          <input id="imp-pass" name="password" type="password" autoComplete="off" className={fieldInput} />
          <small className="mt-1 block text-xs text-muted">Hanya dipakai untuk membuka file saat ini, tidak disimpan.</small>
        </div>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Membaca file..." : "Baca file dan tampilkan preview"}
      </button>
      <p className="m-0 text-xs text-muted">
        File tidak disimpan. Hasil bacanya masuk sebagai <b className="text-ink">draft</b>; transaksi baru tercatat setelah Anda menekan Masukkan ke database di halaman preview.
      </p>
    </form>
  );
}
