import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { CookieNotice } from "@/components/site/cookie-notice";
import { RevealObserver } from "@/components/site/reveal-observer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CookieNotice />
      <RevealObserver />
    </>
  );
}
