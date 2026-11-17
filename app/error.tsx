"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container-page grid min-h-[60dvh] content-center py-20">
      <h1 className="text-4xl">Нещо се обърка</h1>
      <p className="mt-3 max-w-md text-[15px] text-espresso-soft">
        Страницата не се зареди. Опитайте отново или ни се обадете на 0878 817 088.
      </p>
      <button onClick={reset} className="mt-8 w-fit rounded-md bg-espresso px-5 py-2.5 text-cream hover:bg-espresso/90">
        Опитай отново
      </button>
    </main>
  );
}
