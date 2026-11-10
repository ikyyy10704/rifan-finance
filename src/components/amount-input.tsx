"use client";

import { useState } from "react";

// Nominal diketik sebagai angka, ditampilkan sebagai Rp1.234.567 (sama dengan mockup mobile).
const fmt = (digits: string) => (digits ? "Rp" + Number(digits).toLocaleString("id-ID") : "");

export function AmountInput({
  id,
  name,
  defaultValue,
  className,
  required,
}: {
  id: string;
  name: string;
  defaultValue?: number;
  className?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ? fmt(String(defaultValue)) : "");
  return (
    <input
      id={id}
      name={name}
      inputMode="numeric"
      autoComplete="off"
      placeholder="Rp0"
      required={required}
      value={value}
      onChange={(e) => setValue(fmt(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13)))}
      className={className}
    />
  );
}
