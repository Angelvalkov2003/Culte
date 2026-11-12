import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/shop/catalog";
import { siteUrl } from "@/lib/env";
import { companyInfo, getSettings } from "@/lib/settings";
import { formatEUR } from "@/lib/format";
import { ProductImage } from "@/components/site/product-image";
import { ProductCard } from "@/components/site/product-card";
import { AddToCart } from "@/components/shop/add-to-cart";
import { JsonLd, productJsonLd } from "@/components/site/json-ld";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

function imageUrl(publicId: string | null) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return publicId && cloud ? `https://res.cloudinary.com/${cloud}/image/upload/c_fill,w_1200,h_1500/${publicId}` : undefined;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Продуктът не е намерен" };
  const img = imageUrl(p.image_public_id);
  return {
    title: p.name,
    description: p.description.slice(0, 160),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description: p.description.slice(0, 160), images: img ? [img] : undefined },
  };
}

export default async function ProductPage({ params }: Params) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [related, settings] = await Promise.all([getRelatedProducts(product), getSettings()]);
  const c = companyInfo(settings);
  const manufacturer = product.manufacturer?.trim() || `${c.name}, ${c.address}, ${c.email}`;
  const soldOut = product.stock <= 0;
  const url = `${siteUrl()}/products/${product.slug}`;

  return (
    <div className="container-page pt-8">
      <JsonLd data={productJsonLd(product, url, imageUrl(product.image_public_id))} />
      <nav aria-label="Път" className="text-sm text-espresso-soft">
        <Link href="/shop" className="hover:text-terracotta">
          Магазин
        </Link>
        {product.category && (
          <>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-terracotta">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-12">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg md:col-span-7">
          <ProductImage
            publicId={product.image_public_id}
            name={product.name}
            category={product.category?.name}
            sizes="(min-width: 768px) 58vw, 100vw"
            large
            priority
          />
        </div>
        <div className="md:col-span-5 md:pt-6">
          <h1 className="animate-rise text-[clamp(2rem,4vw,3rem)]">{product.name}</h1>
          <p className="mt-4 text-2xl tabular-nums">{formatEUR(product.price)}</p>
          <p className={`mt-2 text-sm ${soldOut ? "text-danger" : "text-olive"}`}>
            {soldOut ? "Изчерпан" : product.stock <= 3 ? `Последни ${product.stock} бр.` : "В наличност"}
          </p>
          <div className="mt-8">
            <AddToCart productId={product.id} stock={product.stock} />
          </div>
          <div className="prose-culte mt-10 border-t border-line pt-6">
            <p>{product.description}</p>
          </div>
          {product.safety_info && (
            <details className="mt-6 border-t border-line pt-4 text-sm">
              <summary className="cursor-pointer font-medium">Безопасност и употреба</summary>
              <p className="mt-2 leading-6 text-espresso-soft">{product.safety_info}</p>
            </details>
          )}
          <details className="mt-3 border-t border-line pt-4 text-sm">
            <summary className="cursor-pointer font-medium">Производител</summary>
            <p className="mt-2 leading-6 text-espresso-soft">{manufacturer}</p>
          </details>
          <p className="mt-6 text-sm text-espresso-soft">
            Доставка в цялата страна до адрес или офис, или вземане от салона в Пловдив.{" "}
            <Link href="/shipping-returns" className="link-underline">
              Доставка и връщане
            </Link>
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-24">
          <h2 id="related" className="text-3xl">
            Може да ви хареса
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
