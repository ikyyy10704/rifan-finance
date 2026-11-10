"use client";

import { startTransition, type FormEvent } from "react";

/**
 * React 19 mengosongkan form otomatis setelah `<form action>` selesai, termasuk saat validasi gagal,
 * sehingga isian pengguna hilang. Kirim lewat onSubmit supaya isian tetap ada saat ada error;
 * form dikosongkan sendiri lewat `key` setelah berhasil.
 */
export function keepFormSubmit(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
