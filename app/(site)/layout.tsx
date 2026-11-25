import { Header } from "@/components/site/header";
import { BoxnowBanner } from "@/components/site/boxnow-banner";
import { Footer } from "@/components/site/footer";
import { CookieNotice } from "@/components/site/cookie-notice";
import { RevealObserver } from "@/components/site/reveal-observer";
import { ScrollToTop } from "@/components/site/scroll-to-top";
import { PawScatter } from "@/components/site/paw-scatter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BoxnowBanner />
      <Header />
      <main id="main" className="relative isolate overflow-x-clip">
        {children}
        <PawScatter />
      </main>
      <Footer />
      <CookieNotice />
      <RevealObserver />
      <ScrollToTop />
    </>
  );
}
