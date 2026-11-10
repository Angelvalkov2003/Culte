"use client";

import { CldImage } from "next-cloudinary";
import { ProductPlaceholder } from "@/components/site/product-placeholder";

export function ProductImage({
  publicId,
  name,
  category,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  large = false,
  priority = false,
}: {
  publicId: string | null;
  name: string;
  category?: string | null;
  sizes?: string;
  large?: boolean;
  priority?: boolean;
}) {
  if (!publicId || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    return <ProductPlaceholder name={name} category={category} large={large} />;
  }
  return (
    <CldImage
      src={publicId}
      alt={name}
      fill
      sizes={sizes}
      priority={priority}
      crop="fill"
      gravity="auto"
      className="object-cover"
    />
  );
}
