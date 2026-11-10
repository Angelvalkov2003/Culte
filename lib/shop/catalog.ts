import "server-only";
import { cache } from "react";
import { hasSupabase } from "@/lib/env";
import { publicDb } from "@/lib/supabase/public";
import type { Category, Product, ShippingMethod } from "@/lib/types";

const PRODUCT_FIELDS =
  "id, category_id, name, slug, description, price, stock, is_active, image_public_id, sort_order, category:categories(id, name, slug)";

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!hasSupabase()) return [];
  const { data, error } = await publicDb().from("categories").select("*").eq("is_active", true).order("sort_order");
  if (error) console.error("categories", error.message);
  return data ?? [];
});

export type ProductSort = "featured" | "price-asc" | "price-desc" | "name";

export interface ProductQuery {
  category?: string;
  q?: string;
  min?: number;
  max?: number;
  sort?: ProductSort;
  limit?: number;
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  if (!hasSupabase()) return [];
  let req = publicDb().from("products").select(PRODUCT_FIELDS).eq("is_active", true);

  if (query.category) {
    const cat = (await getCategories()).find((c) => c.slug === query.category);
    if (!cat) return [];
    req = req.eq("category_id", cat.id);
  }
  if (query.q) {
    const term = query.q.replace(/[%_,()]/g, " ").trim();
    if (term) req = req.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (query.min != null && !Number.isNaN(query.min)) req = req.gte("price", query.min);
  if (query.max != null && !Number.isNaN(query.max)) req = req.lte("price", query.max);

  switch (query.sort) {
    case "price-asc":
      req = req.order("price", { ascending: true });
      break;
    case "price-desc":
      req = req.order("price", { ascending: false });
      break;
    case "name":
      req = req.order("name", { ascending: true });
      break;
    default:
      req = req.order("sort_order", { ascending: true });
  }
  if (query.limit) req = req.limit(query.limit);

  const { data, error } = await req;
  if (error) console.error("products", error.message);
  return (data as unknown as Product[]) ?? [];
}

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  if (!hasSupabase()) return null;
  const { data } = await publicDb()
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as unknown as Product) ?? null;
});

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!hasSupabase() || !ids.length) return [];
  const { data } = await publicDb().from("products").select(PRODUCT_FIELDS).in("id", ids).eq("is_active", true);
  return (data as unknown as Product[]) ?? [];
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (!hasSupabase()) return [];
  let req = publicDb().from("products").select(PRODUCT_FIELDS).eq("is_active", true).neq("id", product.id);
  if (product.category_id) req = req.eq("category_id", product.category_id);
  const { data } = await req.order("sort_order").limit(limit);
  let items = (data as unknown as Product[]) ?? [];
  if (items.length < limit) {
    const { data: more } = await publicDb()
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("is_active", true)
      .neq("id", product.id)
      .gt("stock", 0)
      .order("sort_order")
      .limit(limit * 2);
    const extra = ((more as unknown as Product[]) ?? []).filter((p) => !items.some((i) => i.id === p.id));
    items = [...items, ...extra].slice(0, limit);
  }
  return items;
}

export const getShippingMethods = cache(async (): Promise<ShippingMethod[]> => {
  if (!hasSupabase()) return [];
  const { data } = await publicDb().from("shipping_methods").select("*").eq("is_active", true).order("sort_order");
  return data ?? [];
});
