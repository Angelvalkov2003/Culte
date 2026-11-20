/** Снимки от салона в public/gallery. Размерите са реалните в пиксели (за next/image и масонри мрежата). */
export type GalleryPhoto = { src: string; w: number; h: number; alt: string };

/** Една двойка за плъзгача „преди / след“ най-горе на страницата. */
export const BEFORE_AFTER = {
  before: { src: "/gallery/before.jpg", w: 1206, h: 1608, alt: "Червен той пудел преди подстригване, с рошава козина" },
  after: { src: "/gallery/after.jpg", w: 1205, h: 1756, alt: "Същият червен той пудел след подстригване в Animal House" },
} as const;

export const GALLERY: GalleryPhoto[] = [
  { src: "/gallery/89620BD0-65FA-4810-8642-91979DC5BDFE.jpg", w: 1206, h: 843, alt: "Малтийска болонка преди и след груминг" },
  { src: "/gallery/008C6561-1DD1-43C9-A42A-0FE4906C38A4.jpg", w: 1206, h: 1685, alt: "Кафяв пудел след груминг, с папийонка за Хелоуин" },
  { src: "/gallery/IMG_5336.jpg", w: 1206, h: 1025, alt: "Пудел преди и след подстригване" },
  { src: "/gallery/477D545E-5795-451E-B9F5-07513D0F0850.jpg", w: 1205, h: 747, alt: "Йоркширски териер преди и след груминг" },
  { src: "/gallery/cat.jpg", w: 1206, h: 1608, alt: "Сива котка след подстригване в салона" },
  { src: "/gallery/BD662B50-08C2-446E-BE0C-70660435FA9C.jpg", w: 1290, h: 788, alt: "Йоркширски териер преди и след, с панделка" },
  { src: "/gallery/IMG_5333.jpg", w: 1206, h: 881, alt: "Йоркширски териер преди и след подстригване" },
  { src: "/gallery/EF1F277F-45F1-47D4-A0BD-CACDC3966FE1.jpg", w: 1289, h: 800, alt: "Йоркширски териер с дълга козина преди и след груминг" },
  { src: "/gallery/IMG_5335.jpg", w: 1206, h: 1078, alt: "Йоркширски териер преди и след, с къса козина" },
  { src: "/gallery/IMG_5342.jpg", w: 1206, h: 915, alt: "Йоркширски териер преди и след, с червена панделка" },
];
