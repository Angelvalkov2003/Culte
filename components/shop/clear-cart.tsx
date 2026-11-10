"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearCart } from "@/app/(site)/cart/actions";

export function ClearCart() {
  const done = useRef(false);
  const router = useRouter();
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    clearCart().then(() => router.refresh());
  }, [router]);
  return null;
}
