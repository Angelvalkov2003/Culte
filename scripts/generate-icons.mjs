// Generates favicon / app icons / OG image from logo.png (run: npm run icons)
import sharp from "sharp";

const src = "public/logo.png"; // 1536x1024, gold on black
// The "C" monogram sits in the upper centre of the artwork.
const mark = { left: 500, top: 8, width: 580, height: 580 };

const markBuf = await sharp(src).extract(mark).flatten({ background: "#000000" }).toBuffer();
await sharp(markBuf).resize(512, 512).png().toFile("app/icon.png");
await sharp(markBuf).resize(180, 180).png().toFile("app/apple-icon.png");
await sharp(markBuf).resize(48, 48).png().toFile("public/favicon-48.png");

// OG 1200x630: full logo centred on black
const logo = await sharp(src).resize({ height: 630, width: 1200, fit: "contain", background: "#000000" }).toBuffer();
await sharp(logo).jpeg({ quality: 88 }).toFile("app/opengraph-image.jpg");
await sharp(logo).jpeg({ quality: 88 }).toFile("app/twitter-image.jpg");
console.log("icons generated");
