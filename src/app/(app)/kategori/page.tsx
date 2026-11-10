import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { CATEGORY_SUGGESTIONS } from "@/lib/category-options";
import { getCategories, type Category } from "@/lib/data/finance";
import { CategoryRow, CreateCategoryForm, Suggestions } from "./forms";

export const metadata: Metadata = { title: "Kategori" };

export default function KategoriPage() {
  return (
    <>
      <PageHeader title="Kategori" subtitle="Atur kategori yang muncul saat mencatat transaksi" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Memuat kategori...</p>}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  const all = await getCategories();
  const have = new Set(all.map((c) => `${c.kind}:${c.name.toLowerCase()}`));
  const suggestions = CATEGORY_SUGGESTIONS.filter((s) => !have.has(`${s.kind}:${s.name.toLowerCase()}`));

  return (
    <PageBody>
      <div className="grid gap-3.5 app:gap-6 wide:grid-cols-2 wide:items-start">
        <div className="flex flex-col gap-3.5 app:gap-6">
          <Group title="Pengeluaran" rows={all.filter((c) => c.kind === "expense")} />
          <Group title="Pemasukan" rows={all.filter((c) => c.kind === "income")} />
        </div>
        <div className="flex flex-col gap-3.5 app:gap-6">
          <CreateCategoryForm />
          <Suggestions items={[...suggestions]} />
        </div>
      </div>
    </PageBody>
  );
}

function Group({ title, rows }: { title: string; rows: Category[] }) {
  const active = rows.filter((c) => !c.archived);
  const hidden = rows.filter((c) => c.archived);
  return (
    <section aria-label={`Kategori ${title.toLowerCase()}`} className={card}>
      <h2 className="m-0 mb-1 text-[15px] app:text-base">
        {title} <span className="font-medium text-muted">({active.length})</span>
      </h2>
      <ul className="m-0 list-none p-0">
        {active.map((c, i) => (
          <Row key={c.id} c={c} first={i === 0} />
        ))}
      </ul>
      {hidden.length > 0 && (
        <>
          <h3 className="mt-4 mb-0 text-[13px] text-muted">Disembunyikan (tidak muncul saat mencatat)</h3>
          <ul className="m-0 list-none p-0">
            {hidden.map((c, i) => (
              <Row key={c.id} c={c} first={i === 0} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Row({ c, first }: { c: Category; first: boolean }) {
  return <CategoryRow c={c} first={first} />;
}
