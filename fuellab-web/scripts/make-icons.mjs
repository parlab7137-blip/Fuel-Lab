// Generates the FuelLab home-screen / PWA icons into public/icons (no dependencies).
// Run: node scripts/make-icons.mjs
import { deflateSync } from 'zlib';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BG = hex('#ffffff');
const GREEN = hex('#2e7d46');
const WHITE = hex('#ffffff');

/** Distance from (px,py) to the segment (ax,ay)-(bx,by): used for the round-capped slash. */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}


// Same geometry as src/components/Logo.tsx (viewBox 0-100 there, 0-1 here): a leaf on the diagonal
// (where two circles overlap) with a white midrib and a short stem. Stays inside the 80% maskable safe zone.
const R = 0.32, OFF = 0.2 / Math.SQRT2;
const inLeaf = (x, y) =>
  (x - (0.5 + OFF)) ** 2 + (y - (0.5 + OFF)) ** 2 <= R * R && (x - (0.5 - OFF)) ** 2 + (y - (0.5 - OFF)) ** 2 <= R * R;
const shapes = [
  { color: GREEN, hit: (x, y) => segDist(x, y, 0.323, 0.677, 0.24, 0.76) <= 0.025 },
  { color: GREEN, hit: inLeaf },
  { color: WHITE, hit: (x, y) => inLeaf(x, y) && segDist(x, y, 0.36, 0.64, 0.64, 0.36) <= 0.0125 },
];

const SS = 4; // supersampling for smooth edges

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let pxX = 0; pxX < size; pxX++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (pxX + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          let c = BG;
          for (const s of shapes) if (s.hit(x, y)) c = s.color;
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS, i = (py * size + pxX) * 4;
      px[i] = Math.round(r / n); px[i + 1] = Math.round(g / n); px[i + 2] = Math.round(b / n); px[i + 3] = 255;
    }
  }
  return px;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const rgba = render(size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) {
  writeFileSync(join(outDir, name), png(size));
  console.log('wrote', name);
}
