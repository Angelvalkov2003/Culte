import Link from "next/link";
import { boxnowConfigured } from "@/lib/shipping/boxnow";
import { BOXNOW_FREE_LABEL, boxnowFreeActive } from "@/lib/shipping/boxnow-promo";

/** Лента над хедъра; изчезва сама след края на промоцията (проверка при всяка заявка). */
export function BoxnowBanner() {
  if (!boxnowFreeActive() || !boxnowConfigured()) return null;
  return (
    <div className="bg-espresso text-cream">
      <p className="container-page py-2 text-center text-sm">
        Безплатна доставка до автомат BoxNow до {BOXNOW_FREE_LABEL} —{" "}
        <Link href="/shop" className="underline underline-offset-2 hover:text-sand">
          към магазина
        </Link>
      </p>
    </div>
  );
}
