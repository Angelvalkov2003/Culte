import type { Metadata } from "next";
import Link from "next/link";
import { getCart } from "@/lib/shop/cart";
import { formatEUR } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { ProductImage } from "@/components/site/product-image";
import { PopOut } from "@/components/site/dog-figure";
import { CartLineControls } from "@/components/shop/cart-line-controls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Количка", robots: { index: false } };

export default async function CartPage() {
  const cart = await getCart();
  const adjusted = cart.items.some((i) => i.adjusted);

  return (
    <div className="container-page pt-12">
      <h1 className="animate-rise text-5xl">Количка</h1>
      {cart.items.length === 0 ? (
        <div className="group mt-10 grid max-w-3xl items-end gap-8 sm:grid-cols-[220px_1fr]">
          <PopOut dog="blue" tone="sand" className="w-[220px]" sizes="220px" />
          <div className="pb-2">
            <p className="font-serif text-3xl">Тук е празно засега</p>
            <p className="mt-2 text-[15px] text-espresso-soft">Разгледайте козметиката, която ползваме в салона.</p>
            <ButtonLink href="/shop" className="mt-6">
              Към магазина
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <section className="lg:col-span-8" aria-label="Продукти в количката">
            {adjusted && (
              <p role="alert" className="mb-6 rounded-md border border-clay/50 bg-sand p-4 text-sm">
                Наличността на някои продукти се промени и коригирахме количествата.
              </p>
            )}
            <ul className="divide-y divide-line border-y border-line">
              {cart.items.map(({ product, quantity, lineTotal }) => (
                <li key={product.id} className="flex gap-4 py-5">
                  <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-md sm:w-28">
                    <ProductImage publicId={product.image_public_id} name={product.name} category={product.category?.name} sizes="112px" />
                  </Link>
                  <div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <Link href={`/products/${product.slug}`} className="font-medium hover:text-terracotta">
                        {product.name}
                      </Link>
                      <p className="mt-1 text-sm text-espresso-soft">{formatEUR(product.price)} / бр.</p>
                    </div>
                    <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end">
                      <CartLineControls productId={product.id} quantity={quantity} stock={product.stock} />
                      <p className="tabular-nums">{formatEUR(lineTotal)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <aside className="lg:col-span-4" aria-label="Обобщение">
            <div className="rounded-lg bg-sand p-6">
              <dl className="flex justify-between text-[15px]">
                <dt>Продукти</dt>
                <dd className="tabular-nums">{formatEUR(cart.subtotal)}</dd>
              </dl>
              <p className="mt-2 text-sm text-espresso-soft">Доставката се изчислява в следващата стъпка.</p>
              <ButtonLink href="/checkout" size="lg" className="mt-6 w-full">
                Към поръчка
              </ButtonLink>
              <Link href="/shop" className="mt-4 block text-center text-sm link-underline">
                Продължи пазаруването
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
