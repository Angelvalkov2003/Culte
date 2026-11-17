/** Вградена карта от Google Maps (без API ключ) с картичка за упътване отгоре. */
export function MapEmbed({ query, address, href }: { query: string; address: string; href: string }) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&hl=bg&z=16&output=embed`;
  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-lg border border-line bg-sand sm:aspect-[4/3] sm:h-auto sm:min-h-[360px]">
      <iframe
        src={src}
        title="Карта до салона Culte"
        className="absolute inset-0 h-full w-full border-0 [filter:grayscale(0.15)_saturate(0.9)]"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-md border border-line bg-cream p-4 shadow-[0_8px_24px_rgba(18,18,18,0.1)] sm:bottom-6 sm:left-6 sm:max-w-xs">
        <p className="font-serif text-xl leading-tight">Culte</p>
        <p className="mt-1 text-sm text-espresso-soft">{address}</p>
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium link-underline">
          Упътване
        </a>
      </div>
    </div>
  );
}
