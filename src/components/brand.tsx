import Image from "next/image";

// Teks merek meniru .brand di sidebar mockup web: "Rifan" putih tebal, "Finance" lime.
export function BrandText({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-[-0.3px] text-white ${className}`}>
      Rifan <span className="font-medium text-lime">Finance</span>
    </span>
  );
}

export function LogoMark({ size, priority = false, className = "" }: { size: number; priority?: boolean; className?: string }) {
  // Rasio asli file logo-mark.png: 1281 x 1228.
  return (
    <Image
      src="/brand/logo-mark.png"
      alt=""
      width={size}
      height={Math.round((size * 1228) / 1281)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={className}
    />
  );
}
