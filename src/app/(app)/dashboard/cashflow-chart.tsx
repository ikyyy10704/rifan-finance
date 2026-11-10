import { monthLabel, monthShort, rupiah } from "@/lib/format";

type Point = { month: string; income: number; expense: number };

// Hijau dan lime keluarga merek, lolos validator dataviz (ΔE CVD 21, lightness & chroma dalam batas).
// Lime di bawah 3:1 terhadap putih, jadi angka pastinya tersedia di tabel "Lihat angka".
const INCOME = "#13805A";
const EXPENSE = "#9AB82B";

function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}jt`.replace(".", ",");
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

// Batas atas sumbu yang bulat (1, 2, 2,5, 5 × 10^n) supaya garis bantunya mudah dibaca.
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((s) => s * p >= v) ?? 10) * p;
}

/** SVG dengan lebar viewBox berbeda untuk HP dan desktop, supaya teks tetap ±11px di layar. */
function Bars({ data, width, label }: { data: Point[]; width: number; label: string }) {
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expense))));
  const top = 16;
  const base = 186;
  const left = 44;
  const y = (v: number) => base - (v / max) * (base - top);
  const ticks = [0, max / 3, (2 * max) / 3, max];
  const slot = (width - left - 8) / data.length;
  const bw = Math.min(26, (slot - 10) / 2);

  return (
    <svg viewBox={`0 0 ${width} 214`} className="block h-auto w-full" role="img" aria-label={label}>
      <g stroke="#E3E9E5">
        {ticks.map((t) => (
          <line key={t} x1={left} x2={width - 4} y1={y(t)} y2={y(t)} />
        ))}
      </g>
      <g fill="#5B6B66" fontSize="11">
        {ticks.map((t) => (
          <text key={t} x={left - 8} y={y(t) + 4} textAnchor="end">
            {compact(t)}
          </text>
        ))}
      </g>
      {data.map((d, i) => {
        const cx = left + slot * i + slot / 2;
        return (
          <g key={d.month}>
            {/* 2px celah antar batang; ujung atas membulat, pangkal rata di garis dasar */}
            <path d={barPath(cx - bw - 1, y(d.income), bw, base - y(d.income))} fill={INCOME}>
              <title>{`Pemasukan ${monthLabel(d.month)}: ${rupiah(d.income)}`}</title>
            </path>
            <path d={barPath(cx + 1, y(d.expense), bw, base - y(d.expense))} fill={EXPENSE}>
              <title>{`Pengeluaran ${monthLabel(d.month)}: ${rupiah(d.expense)}`}</title>
            </path>
            <text x={cx} y="206" textAnchor="middle" fontSize="11" fill="#5B6B66">
              {monthShort(d.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function CashflowChart({ data }: { data: Point[] }) {
  const hasData = data.some((d) => d.income || d.expense);
  const label = `Grafik pemasukan dan pengeluaran ${monthLabel(data[0].month)} sampai ${monthLabel(data[data.length - 1].month)}`;

  return (
    <section aria-labelledby="cash-title" className="h-full rounded-[22px] bg-white p-[18px] app:rounded-[20px] app:border app:border-line app:p-[22px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="cash-title" className="m-0 text-[15px] app:text-base">
          Arus kas 6 bulan terakhir
        </h2>
        <div className="flex gap-4 text-xs text-muted">
          <span>
            <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-[-1px]" style={{ background: INCOME }} />
            Pemasukan
          </span>
          <span>
            <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-[-1px]" style={{ background: EXPENSE }} />
            Pengeluaran
          </span>
        </div>
      </div>

      {hasData ? (
        <>
          <div className="app:hidden">
            <Bars data={data} width={340} label={label} />
          </div>
          <div className="hidden app:block">
            <Bars data={data} width={560} label={label} />
          </div>
          <details className="mt-3">
            <summary className="inline-flex min-h-11 items-center text-[13px] font-bold text-g700 hover:underline">Lihat angka</summary>
            <table className="mt-1 w-full border-collapse text-[13px] tabular-nums">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-1.5 font-semibold">Bulan</th>
                  <th className="py-1.5 text-right font-semibold">Pemasukan</th>
                  <th className="py-1.5 text-right font-semibold">Pengeluaran</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.month} className="border-t border-line">
                    <td className="py-1.5">{monthLabel(d.month)}</td>
                    <td className="py-1.5 text-right">{rupiah(d.income)}</td>
                    <td className="py-1.5 text-right">{rupiah(d.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p className="m-0 text-muted">Grafik muncul setelah ada pemasukan atau pengeluaran tercatat dalam 6 bulan terakhir.</p>
      )}
    </section>
  );
}
