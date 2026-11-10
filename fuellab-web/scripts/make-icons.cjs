// Makes the FuelLab app icons and logo images from brand-source/fuellab-logo.webp.
// sharp isn't a project dependency (it's only needed when the logo changes). To run:
//   npm install --no-save sharp
//   node fuellab-web/scripts/make-icons.cjs fuellab-web/brand-source/fuellab-logo.webp fuellab-web/public
// Then bump CACHE in public/sw.js so installed apps pick up the new icons.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const [src, outDir] = process.argv.slice(2);
const BG = { r: 170, g: 29, b: 27, alpha: 1 };
const crop = { left: 265, top: 75, width: 1080, height: 1080 }; // the bowl circle + chopsticks, no lettering
(async () => {
  fs.mkdirSync(path.join(outDir, 'icons'), { recursive: true });
  // Even out the lightly textured red so padding added around it blends in with no seam.
  const { data, info } = await sharp(src).extract(crop).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > 120 && g < 70 && b < 70 && r - g > 90) { data[i] = BG.r; data[i + 1] = BG.g; data[i + 2] = BG.b; }
  }
  const mark = await sharp(data, { raw: info }).png().toBuffer();
  const out = (name, img) => img.toFile(path.join(outDir, name)).then(() => console.log('wrote', name));
  await out('icons/icon-192.png', sharp(mark).resize(192, 192));
  await out('icons/icon-512.png', sharp(mark).resize(512, 512));
  await out('icons/apple-touch-icon.png', sharp(mark).resize(180, 180));
  await out('icons/favicon-32.png', sharp(mark).resize(32, 32));
  await out('icons/logo-mark-96.png', sharp(mark).resize(96, 96));
  // Maskable: phones crop to a circle/squircle, so pad with the red so nothing is cut off.
  const pad = 300;
  const padded = await sharp(mark).extend({ top: pad, bottom: pad, left: pad, right: pad, background: BG }).png().toBuffer();
  await out('icons/icon-maskable-512.png', sharp(padded).resize(512, 512));
  await out('brand/logo-full.webp', sharp(src).resize(640, 640).webp({ quality: 88 }));
})();
