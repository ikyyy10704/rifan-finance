import Image from "next/image";
import { initials } from "@/lib/format";

/** Foto profil bila ada, selain itu inisial di lingkaran lime (.av di mockup). */
export function Avatar({
  userId,
  name,
  avatar,
  size,
  className = "",
  muted = false,
}: {
  userId: number;
  name: string;
  avatar: string | null;
  size: number;
  className?: string;
  muted?: boolean;
}) {
  const box = `grid flex-none place-items-center overflow-hidden rounded-full font-extrabold ${muted ? "bg-line text-muted" : "bg-lime text-g900"} ${className}`;
  if (avatar) {
    return (
      <span className={box} style={{ width: size, height: size }}>
        <Image src={`/avatar/${userId}?v=${avatar}`} alt="" width={size} height={size} unoptimized className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span className={box} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
