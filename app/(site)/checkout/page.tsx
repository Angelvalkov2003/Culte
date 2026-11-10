import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/shop/cart";
import { getShippingMethods } from "@/lib/shop/catalog";
import { CheckoutForm } from "@/components/shop/checkout-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Поръчка", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, methods] = await Promise.all([getCart(), getShippingMethods()]);
  if (!cart.items.length) redirect("/cart");

  return (
    <div className="container-page pt-12">
      <h1 className="text-5xl">Поръчка</h1>
      <CheckoutForm
        methods={methods}
        subtotal={cart.subtotal}
        items={cart.items.map((i) => ({ id: i.product.id, name: i.product.name, quantity: i.quantity, total: i.lineTotal }))}
      />
    </div>
  );
}
