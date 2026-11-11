import { rupiah } from "@/lib/format";

// Bulan ini: hijau merek, garis penuh. Bulan lalu: oranye, garis putus-putus.
// Validator dataviz: CVD ΔE 6,2 (masuk rentang 6-8), jadi wajib ada pembeda kedua:
// pola garis berbeda + label langsung di ujung garis.
const NOW = "#13805A";
const PREV = "#eb6834";

function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}jt`.replace(".", ",");
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(Math.round(n));
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((s) => s * p >= v) ?? 10) * p;
}

const cumulative = (values: number[]) => values.reduce<number[]>((acc, v) => [...acc, (acc.at(-1) ?? 0) + v], []);

function Lines({
  now,
  prev,
  today,
  width,
  label,
  nowName,
  prevName,
}: {
  now: number[];
  prev: number[];
  today: number;
  width: number;
  label: string;
  nowName: string;
  prevName: string;
}) {
  const days = Math.max(now.length, prev.length);
  const shownNow = now.slice(0, today);
  const max = niceMax(Math.max(...shownNow, ...prev, 1));
  const top = 14;
  const base = 170;
  const left = 44;
  const right = width - 12;
  const x = (day: number) => left + ((day - 1) / (days - 1)) * (right - left);
  const y = (v: number) => base - (v / max) * (base - top);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const ticks = [0, max / 2, max];
  const slot = (right - left) / (days - 1);

  return (
    <svg viewBox={`0 0 ${width} 196`} className="block h-auto w-full" role="img" aria-label={label}>
      <g stroke="#E3E9E5">
        {ticks.map((t) => (
          <line key={t} x1={left} x2={right} y1={y(t)} y2={y(t)} />
        ))}
      </g>
      <g fill="#5B6B66" fontSize="11">
        {ticks.map((t) => (
          <text key={t} x={left - 8} y={y(t) + 4} textAnchor="end">
            {compact(t)}
          </text>
        ))}
        {[1, 15, days].map((d) => (
          <text key={d} x={x(d)} y="190" textAnchor="middle">
            {d}
          </text>
        ))}
      </g>
      <path d={path(prev)} fill="none" stroke={PREV} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path(shownNow)} fill="none" stroke={NOW} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Titik hari ini, dengan cincin putih 2px supaya terpisah dari garis bulan lalu. */}
      <circle cx={x(today)} cy={y(shownNow[today - 1] ?? 0)} r={4.5} fill={NOW} stroke="#fff" strokeWidth={2} />

      {/* Area sentuh per tanggal, lebih lebar dari garisnya; tooltip berisi kedua angka. */}
      {Array.from({ length: days }, (_, i) => (
        <rect key={i} x={x(i + 1) - slot / 2} y={top} width={slot} height={base - top} fill="transparent">
          <title>
            {`Tanggal ${i + 1}\n${nowName}: ${i < today ? rupiah(shownNow[i]) : "belum lewat"}\n${prevName}: ${prev[i] !== undefined ? rupiah(prev[i]) : "-"}`}
          </title>
        </rect>
      ))}
    </svg>
  );
}

/**
 * Pengeluaran kumulatif bulan ini dibanding bulan lalu pada tanggal yang sama.
 * Menjawab "apakah saya lebih boros dari bulan lalu?" tanpa menunggu akhir bulan.
 */
export function SpendingPace({
  nowDaily,
  prevDaily,
  today,
  nowName,
  prevName,
}: {
  nowDaily: number[];
  prevDaily: number[];
  today: number;
  nowName: string;
  prevName: string;
}) {
  const now = cumulative(nowDaily);
  const prev = cumulative(prevDaily);
  const spent = now[today - 1] ?? 0;
  const sameDayPrev = prev[Math.min(today, prev.length) - 1] ?? 0;
  const diff = spent - sameDayPrev;
  const hasData = spent > 0 || (prev.at(-1) ?? 0) > 0;
  const label = `Pengeluaran kumulatif ${nowName} sampai tanggal ${today} ${rupiah(spent)}, ${prevName} pada tanggal yang sama ${rupiah(sameDayPrev)}`;

  return (
    <section aria-labelledby="pace-title" className="h-full rounded-[22px] bg-white p-[18px] app:rounded-[20px] app:border app:border-line app:p-[22px]">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 id="pace-title" className="m-0 text-[15px] app:text-base">
          Laju pengeluaran
        </h2>
        <div className="flex gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <svg width="16" height="4" aria-hidden="true">
              <line x1="1" x2="15" y1="2" y2="2" stroke={NOW} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {nowName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="16" height="4" aria-hidden="true">
              <line x1="1" x2="15" y1="2" y2="2" stroke={PREV} strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            {prevName}
          </span>
        </div>
      </div>

      {hasData ? (
        <>
          <p className="mt-0 mb-3 text-[13px] text-muted">
            Sampai tanggal {today}: <b className="text-ink tabular-nums">{rupiah(spent)}</b>
            {sameDayPrev > 0 || spent > 0 ? (
              <>
                {", "}
                {diff === 0 ? (
                  <>sama dengan {prevName}.</>
                ) : (
                  <>
                    <b className={diff > 0 ? "text-danger" : "text-plus"}>
                      {diff > 0 ? "lebih boros" : "lebih hemat"} {rupiah(Math.abs(diff))}
                    </b>{" "}
                    dari {prevName} di tanggal yang sama.
                  </>
                )}
              </>
            ) : null}
          </p>
          <div className="app:hidden">
            <Lines now={now} prev={prev} today={today} width={340} label={label} nowName={nowName} prevName={prevName} />
          </div>
          <div className="hidden app:block">
            <Lines now={now} prev={prev} today={today} width={560} label={label} nowName={nowName} prevName={prevName} />
          </div>
        </>
      ) : (
        <p className="mt-2 mb-0 text-muted">Garis muncul setelah ada pengeluaran bulan ini atau bulan lalu.</p>
      )}
    </section>
  );
}
