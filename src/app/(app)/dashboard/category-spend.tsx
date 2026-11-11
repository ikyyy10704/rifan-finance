import { rupiah } from "@/lib/format";

type Row = { id: number; name: string; icon: string | null; color: string | null; total: number };

const TOP = 5;
// Urutan kategorikal tetap (tidak diputar ulang), lolos validator dataviz untuk pasangan bersebelahan:
// CVD ΔE terendah 9,1, normal 19,6. Tiga warna di bawah 3:1 terhadap putih, jadi setiap irisan
// selalu punya label teks (nama, persen, nominal) di daftar sampingnya.
const SLOTS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];

const R = 70; // jari-jari luar
const W = 22; // tebal cincin

function arc(start: number, end: number) {
  // Sudut dalam radian, 0 = arah jam 12, searah jarum jam.
  const p = (a: number, r: number) => [100 + r * Math.sin(a), 100 - r * Math.cos(a)].map((n) => n.toFixed(2)).join(" ");
  const large = end - start > Math.PI ? 1 : 0;
  const ri = R - W;
  return `M${p(start, R)}A${R} ${R} 0 ${large} 1 ${p(end, R)}L${p(end, ri)}A${ri} ${ri} 0 ${large} 0 ${p(start, ri)}Z`;
}

/**
 * Donat komposisi pengeluaran bulan ini: 5 kategori terbesar + "Lainnya" (paling banyak 6 irisan,
 * supaya warnanya tetap bisa dibedakan). Angka pastinya ada di daftar di samping donat.
 */
export function CategorySpend({ rows, monthName }: { rows: Row[]; monthName: string }) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const top = rows.slice(0, TOP);
  const restTotal = rows.slice(TOP).reduce((s, r) => s + r.total, 0);
  const list = restTotal > 0 ? [...top, { id: -1, name: `Lainnya (${rows.length - TOP})`, icon: "other", color: "l", total: restTotal }] : top;

  // Sudut awal tiap irisan = jumlah porsi irisan sebelumnya.
  const slices = list.map((r, i) => {
    const before = list.slice(0, i).reduce((s, x) => s + x.total, 0);
    const share = r.total / total;
    return { ...r, share, start: (before / total) * Math.PI * 2, end: ((before + r.total) / total) * Math.PI * 2, color: SLOTS[i] };
  });

  return (
    <section aria-labelledby="cat-title" className="h-full rounded-[22px] bg-white p-[18px] app:rounded-[20px] app:border app:border-line app:p-[22px]">
      <h2 id="cat-title" className="m-0 mb-4 text-[15px] app:text-base">
        Komposisi pengeluaran, {monthName}
      </h2>

      {list.length === 0 ? (
        <p className="m-0 text-muted">Belum ada pengeluaran bulan ini. Komposisi per kategori muncul setelah Anda mencatat pengeluaran.</p>
      ) : (
        <div className="flex flex-col items-center gap-5 min-[480px]:flex-row min-[480px]:items-center">
          <svg viewBox="0 0 200 200" className="h-[168px] w-[168px] flex-none" role="img" aria-label={`Komposisi pengeluaran ${monthName}, total ${rupiah(total)}`}>
            {slices.length === 1 ? (
              <circle cx="100" cy="100" r={R - W / 2} fill="none" stroke={slices[0].color} strokeWidth={W}>
                <title>{`${slices[0].name}: ${rupiah(slices[0].total)} (100%)`}</title>
              </circle>
            ) : (
              slices.map((s) => (
                // Garis putih 2px memisahkan irisan yang bersebelahan.
                <path key={s.id} d={arc(s.start, s.end)} fill={s.color} stroke="#fff" strokeWidth={2} strokeLinejoin="round">
                  <title>{`${s.name}: ${rupiah(s.total)} (${Math.round(s.share * 100)}%)`}</title>
                </path>
              ))
            )}
            <text x="100" y="94" textAnchor="middle" fontSize="12" fill="#5B6B66">
              Total
            </text>
            <text x="100" y="114" textAnchor="middle" fontSize="15" fontWeight="800" fill="#0F1F1A">
              {compact(total)}
            </text>
          </svg>

          <ul className="m-0 flex w-full min-w-0 list-none flex-col gap-2 p-0">
            {slices.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 text-[13px]">
                <i className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: s.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="w-9 text-right text-muted tabular-nums">{Math.round(s.share * 100)}%</span>
                <b className="w-[92px] text-right whitespace-nowrap tabular-nums">{rupiah(s.total)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function compact(n: number) {
  if (n >= 1_000_000) return `Rp${+(n / 1_000_000).toFixed(1)}jt`.replace(".", ",");
  if (n >= 1_000) return `Rp${Math.round(n / 1_000)}rb`;
  return `Rp${n}`;
}
