import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Onest } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Culte — груминг салон и козметика за кучета в Пловдив",
    template: "%s | Culte",
  },
  description:
    "Груминг салон Culte в Пловдив: онлайн запазване на час, внимателна грижа за всяка порода и подбрана козметика за кучета.",
  applicationName: "Culte",
  openGraph: {
    type: "website",
    locale: "bg_BG",
    siteName: "Culte",
  },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F3EEE6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" data-scroll-behavior="smooth" className={`${cormorant.variable} ${onest.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
