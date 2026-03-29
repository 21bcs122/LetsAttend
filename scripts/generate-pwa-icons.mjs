/**
 * Builds favicon + PWA icons from `public/branding/mtes-logo.png`.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const cwd = process.cwd();
const src = join(cwd, "public", "branding", "mtes-logo.png");
const iconsDir = join(cwd, "public", "icons");
const appDir = join(cwd, "app");

if (!existsSync(src)) {
  console.error("Missing source logo:", src);
  process.exit(1);
}

mkdirSync(iconsDir, { recursive: true });

/** Matches app manifest / dark chrome. */
const bg = { r: 10, g: 10, b: 10, alpha: 1 };

function squareFromLogo(size) {
  return sharp(src).resize(size, size, {
    fit: "contain",
    position: "center",
    background: bg,
  });
}

for (const size of [192, 512]) {
  await squareFromLogo(size).png().toFile(join(iconsDir, `icon-${size}.png`));
}

/** Maskable safe zone (~80%): smaller logo with padding for Android adaptive icons. */
const maskSize = 512;
const inner = Math.round(maskSize * 0.62);
const pad = Math.floor((maskSize - inner) / 2);
const innerBuf = await sharp(src)
  .resize(inner, inner, { fit: "contain", position: "center", background: bg })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: maskSize,
    height: maskSize,
    channels: 4,
    background: bg,
  },
})
  .composite([{ input: innerBuf, left: pad, top: pad }])
  .png()
  .toFile(join(iconsDir, "icon-maskable-512.png"));

/** Next.js App Router favicon (`<link rel="icon">`). */
await squareFromLogo(48).png().toFile(join(appDir, "icon.png"));

/** Apple touch icon (optional dedicated file; layout also references /icons). */
await squareFromLogo(180).png().toFile(join(appDir, "apple-icon.png"));

console.log(
  "Wrote public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, app/icon.png, app/apple-icon.png"
);
