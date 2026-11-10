import Link from "next/link";
import { formatEUR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ProductImage } from "@/components/site/product-image";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const soldOut = product.stock <= 0;
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md">
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
      <div className="mt-3 flex items-start justify-between gap-4">
        <h3 className="font-sans text-[15px] leading-snug font-medium text-espresso group-hover:text-terracotta">
          {product.name}
        </h3>
        <p className="shrink-0 text-[15px] tabular-nums text-espresso">{formatEUR(product.price)}</p>
      </div>
      {product.category && <p className="mt-1 text-[13px] text-espresso-soft">{product.category.name}</p>}
    </Link>
  );
}
