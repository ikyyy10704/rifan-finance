import { rupiah } from "@/lib/format";

/**
 * Batang pengeluaran per hari dalam satu bulan. Satu seri, satu warna (yang dibandingkan hanya
 * besarnya). Varian "dark" untuk kepala hijau di HP: lime di atas hijau tua, kontras tinggi.
 */
export function DailyChart({
  month,
  values,
  today,
  dark = false,
}: {
  month: string; // YYYY-MM
  values: number[]; // index 0 = tanggal 1
  today: number | null; // tanggal hari ini bila bulan berjalan
  dark?: boolean;
}) {
  const days = values.length;
  const max = Math.max(...values);
  const W = 340;
  const H = 64;
  const slot = W / days;
  const bw = Math.max(2, slot - 2); // 2px celah antar batang
  const peakDay = max > 0 ? values.indexOf(max) + 1 : null;
  const [y, m] = month.split("-");
  const bulan = new Date(Date.UTC(+y, +m - 1, 1)).toLocaleDateString("id-ID", { month: "short", timeZone: "UTC" });

  const fill = dark ? "#D4EE6E" : "#13805A";
  const empty = dark ? "rgba(255,255,255,0.14)" : "#EAF0EC";
  const sub = dark ? "text-[#B9D3CA]" : "text-muted";

  // Tanpa pengeluaran: satu baris teks, bukan area grafik kosong yang tinggi.
  if (max === 0) {
    return (
      <p className={`m-0 flex items-baseline justify-between gap-2 text-xs ${sub}`}>
        <span>Pengeluaran harian</span>
        <span>Belum ada pengeluaran bulan ini</span>
      </p>
    );
  }

  return (
    <figure className="m-0">
      <figcaption className={`mb-2 flex items-baseline justify-between gap-2 text-xs ${sub}`}>
        <span>Pengeluaran harian</span>
        {peakDay && (
          <span>
            tertinggi <b className={dark ? "text-white" : "text-ink"}>{rupiah(max)}</b> ({peakDay} {bulan})
          </span>
        )}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H + 16}`}
        className="block h-auto w-full"
        role="img"
        aria-label={max > 0 ? `Pengeluaran per hari bulan ini, tertinggi ${rupiah(max)} pada tanggal ${peakDay}` : "Belum ada pengeluaran bulan ini"}
      >
        {values.map((v, i) => {
          const h = max > 0 ? Math.max(v > 0 ? 3 : 0, (v / max) * H) : 0;
          const x = i * slot + (slot - bw) / 2;
          const isToday = today === i + 1;
          return (
            <g key={i}>
              {/* jalur tipis untuk hari tanpa pengeluaran, supaya ritme 30 hari tetap terbaca */}
              <rect x={x} y={H - 2} width={bw} height={2} rx={1} fill={empty} />
              {h > 0 && (
                <rect x={x} y={H - h} width={bw} height={h} rx={Math.min(2, bw / 2)} fill={fill} opacity={isToday || today === null ? 1 : 0.85}>
                  <title>{`${i + 1} ${bulan}: ${rupiah(v)}`}</title>
                </rect>
              )}
              {isToday && <circle cx={x + bw / 2} cy={H + 6} r={2} fill={fill} />}
            </g>
          );
        })}
        {[1, 15, days].map((d) => (
          <text key={d} x={(d - 0.5) * slot} y={H + 15} textAnchor="middle" fontSize="10" fill={dark ? "#B9D3CA" : "#5B6B66"}>
            {d}
          </text>
        ))}
      </svg>
    </figure>
  );
}
