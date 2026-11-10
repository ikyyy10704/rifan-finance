import Image from "next/image";
import type { AccountType } from "@/db/schema";
import { findProvider } from "@/lib/providers";
import { Icon, TONE, type IconName } from "./icons";

export const typeIcon = (type: AccountType): IconName => (type === "cash" ? "cash" : type === "bank" ? "bank" : "phone");

/** Logo penyedia di kotak putih berbingkai; tanpa logo (bank/e-wallet lain, tunai) pakai ikon. */
export function ProviderLogo({ provider, type, size = 44 }: { provider: string | null; type: AccountType; size?: number }) {
  const p = findProvider(provider);
  if (p?.logo && p.ratio) {
    const w = Math.round(size * 0.78);
    return (
      <span className="grid flex-none place-items-center rounded-xl border border-line bg-white" style={{ width: size, height: size }}>
        <Image src={p.logo} alt="" width={w} height={Math.round(w / p.ratio)} unoptimized className="h-auto max-h-[70%] w-[78%] object-contain" />
      </span>
    );
  }
  const tone = type === "cash" ? TONE.g : type === "bank" ? TONE.b : TONE.a;
  return (
    <span className={`grid flex-none place-items-center rounded-xl ${tone}`} style={{ width: size, height: size }}>
      <Icon name={typeIcon(type)} />
    </span>
  );
}
