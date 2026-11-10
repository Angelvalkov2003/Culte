import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-page grid min-h-[70dvh] content-center py-20">
      <p className="font-serif text-8xl text-clay">404</p>
      <h1 className="mt-4 text-4xl">Тази страница не съществува</h1>
      <p className="mt-3 max-w-md text-[15px] text-espresso-soft">Възможно е адресът да е сгрешен или продуктът вече да не се предлага.</p>
      <div className="mt-8 flex gap-6 text-[15px]">
        <Link href="/" className="link-underline">Начало</Link>
        <Link href="/shop" className="link-underline">Магазин</Link>
        <Link href="/booking" className="link-underline">Запази час</Link>
      </div>
    </main>
  );
}
