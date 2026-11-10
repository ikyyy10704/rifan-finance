import { categoryIcon, Icon, TONE } from "@/components/icons";
import { rupiah } from "@/lib/format";

type Row = { id: number; name: string; icon: string | null; color: string | null; total: number };

const TOP = 5;
const BAR = "#13805A"; // satu warna: yang dibandingkan hanya besarnya, bukan identitas seri

/**
 * Batang horizontal berurutan, bukan donut: dengan belasan kategori, panjang batang lebih mudah
 * dibandingkan daripada sudut irisan. 5 terbesar + "Lainnya".
 */
export function CategorySpend({ rows, monthName }: { rows: Row[]; monthName: string }) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const top = rows.slice(0, TOP);
  const restTotal = rows.slice(TOP).reduce((s, r) => s + r.total, 0);
  const list = restTotal > 0 ? [...top, { id: -1, name: `Lainnya (${rows.length - TOP} kategori)`, icon: "other", color: "l", total: restTotal }] : top;

  return (
    <section aria-labelledby="cat-title" className="h-full rounded-[22px] bg-white p-[18px] app:rounded-[20px] app:border app:border-line app:p-[22px]">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="cat-title" className="m-0 text-[15px] app:text-base">
          Pengeluaran per kategori, {monthName}
        </h2>
        {total > 0 && <b className="text-[13px] whitespace-nowrap">{rupiah(total)}</b>}
      </div>

      {list.length === 0 ? (
        <p className="m-0 text-muted">Belum ada pengeluaran bulan ini. Kategori terbesar akan muncul di sini setelah Anda mencatat pengeluaran.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
          {list.map((r) => {
            const share = r.total / total;
            const pct = Math.round(share * 100);
            return (
              <li key={r.id} title={`${r.name}: ${rupiah(r.total)} (${pct}% dari pengeluaran ${monthName})`}>
                <div className="mb-1.5 flex items-center gap-2.5 text-[13px]">
                  <span className={`grid h-7 w-7 flex-none place-items-center rounded-full ${TONE[r.color ?? "l"] ?? TONE.l}`}>
                    <Icon name={categoryIcon(r.icon)} className="h-4 w-4" />
                  </span>
                  <b className="min-w-0 flex-1 truncate">{r.name}</b>
                  <span className="whitespace-nowrap text-muted tabular-nums">{pct}%</span>
                  <b className="w-[92px] text-right whitespace-nowrap tabular-nums">{rupiah(r.total)}</b>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#EAF0EC]" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, 1.5)}%`, background: BAR }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
