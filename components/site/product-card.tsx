import Link from "next/link";
import { formatEUR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ProductImage } from "@/components/site/product-image";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const soldOut = product.stock <= 0;
  return (
    <Link href={`/products/${product.slug}`} data-reveal className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-out group-hover:[&_img]:scale-[1.04]">
        <ProductImage
          publicId={product.image_public_id}
          name={product.name}
          category={product.category?.name}
          priority={priority}
        />
        {soldOut && (
          <span className="absolute top-3 left-3 rounded-sm bg-espresso px-2 py-1 text-xs font-medium text-cream">
            Изчерпан
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2 sm:gap-4">
        <h3 className="min-w-0 font-sans text-[15px] leading-snug font-medium text-espresso transition-colors group-hover:text-terracotta">
          {product.name}
        </h3>
        <p className="shrink-0 text-[15px] tabular-nums text-espresso">{formatEUR(product.price)}</p>
      </div>
      {product.category && <p className="mt-1 text-[13px] text-espresso-soft">{product.category.name}</p>}
    </Link>
  );
}
