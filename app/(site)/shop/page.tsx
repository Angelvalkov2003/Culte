import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getProducts, type ProductSort } from "@/lib/shop/catalog";
import { cn } from "@/lib/format";
import { ProductCard } from "@/components/site/product-card";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FiltersToggle } from "@/components/shop/filters-toggle";

export const dynamic = "force-dynamic";

type SP = { category?: string; q?: string; min?: string; max?: string; sort?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const { category } = await searchParams;
  const cat = category ? (await getCategories()).find((c) => c.slug === category) : null;
  return {
    title: cat ? `${cat.name} за кучета` : "Магазин за козметика за кучета",
    description: cat?.description || "Шампоани, балсами, парфюми и инструменти за грижа за козината. Доставка в цяла България.",
    alternates: { canonical: cat ? `/shop?category=${cat.slug}` : "/shop" },
  };
}

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Препоръчани" },
  { value: "price-asc", label: "Цена: възходяща" },
  { value: "price-desc", label: "Цена: низходяща" },
  { value: "name", label: "Име" },
];

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sort = (SORTS.find((s) => s.value === sp.sort)?.value ?? "featured") as ProductSort;
  const min = sp.min ? Number(sp.min) : undefined;
  const max = sp.max ? Number(sp.max) : undefined;
  const q = sp.q?.slice(0, 80);

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ category: sp.category, q, min, max, sort }),
  ]);
  const active = categories.find((c) => c.slug === sp.category);

  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/shop?${s}` : "/shop";
  };
  const filtered = Boolean(q || min != null || max != null || sp.category);

  return (
    <div className="container-page pt-12">
      <header className="grid gap-6 md:grid-cols-12">
        <h1 className="text-[clamp(2.6rem,6vw,4.4rem)] md:col-span-7">{active ? active.name : "Козметика за кучета"}</h1>
        <p className="self-end text-[15px] leading-7 text-espresso-soft md:col-span-4 md:col-start-9">
          {active?.description ||
            "Продуктите, с които работим в салона, подбрани за домашна грижа между две посещения."}
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <aside className="lg:col-span-3" aria-label="Филтри">
          <FiltersToggle active={filtered}>
          <form action="/shop" method="get" className="space-y-8 lg:sticky lg:top-24">
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            <div>
              <label htmlFor="q" className="text-sm font-medium">
                Търсене
              </label>
              <Input id="q" name="q" type="search" defaultValue={q} placeholder="Шампоан, балсам…" className="mt-2" />
            </div>

            <nav aria-label="Категории">
              <p className="text-sm font-medium">Категория</p>
              <ul className="mt-2 space-y-1 text-[15px]">
                <li>
                  <Link
                    href={href({ category: undefined })}
                    className={cn("block py-1", !sp.category ? "font-semibold text-terracotta" : "hover:text-terracotta")}
                    aria-current={!sp.category ? "page" : undefined}
                  >
                    Всички
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={href({ category: c.slug })}
                      className={cn("block py-1", sp.category === c.slug ? "font-semibold text-terracotta" : "hover:text-terracotta")}
                      aria-current={sp.category === c.slug ? "page" : undefined}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <fieldset>
              <legend className="text-sm font-medium">Цена, €</legend>
              <div className="mt-2 flex items-center gap-2">
                <Input name="min" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={sp.min} placeholder="от" aria-label="Минимална цена" />
                <span aria-hidden="true">–</span>
                <Input name="max" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={sp.max} placeholder="до" aria-label="Максимална цена" />
              </div>
            </fieldset>

            <div>
              <label htmlFor="sort" className="text-sm font-medium">
                Подреждане
              </label>
              <Select id="sort" name="sort" defaultValue={sort} className="mt-2">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-3">
              <Button type="submit" size="sm">
                Приложи
              </Button>
              {filtered && (
                <Link href="/shop" className="inline-flex h-9 items-center text-sm link-underline">
                  Изчисти
                </Link>
              )}
            </div>
          </form>
          </FiltersToggle>
        </aside>

        <section className="lg:col-span-9" aria-label="Продукти">
          <p className="text-sm text-espresso-soft" aria-live="polite">
            {products.length} {products.length === 1 ? "продукт" : "продукта"}
          </p>
          {products.length === 0 ? (
            <div className="mt-6 rounded-lg bg-sand p-8">
              <p className="font-serif text-2xl">Няма продукти по тези критерии</p>
              <p className="mt-2 text-[15px] text-espresso-soft">
                Опитайте с по-широк ценови диапазон или{" "}
                <Link href="/shop" className="link-underline">
                  вижте всички продукти
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
