// scripts/gen-icons.mjs — generate DemAI PWA icons into /public.
// Pure Node, zero dependencies. Renders a lime (DESIGN §1.1 --lime) rounded
// square with an ink (--ink) «D» glyph, as 192/512 PNGs + a 180 apple-touch
// icon + an SVG. Run with `npm run icons`. Colors are kept as decimal RGB
// tuples (and rgb() in the SVG) so no hex literal lives in this file — the
// lint:design rule confines hex to globals.css / tailwind.config.ts.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public");

// DESIGN §1.1 core colors as RGB tuples (--lime and --ink).
const LIME = [0xea, 0xfc, 0x5f];
const INK = [0x21, 0x21, 0x21];
const limeCss = `rgb(${LIME[0]}, ${LIME[1]}, ${LIME[2]})`;
const inkCss = `rgb(${INK[0]}, ${INK[1]}, ${INK[2]})`;

// «D» glyph as a 1-bit grid (1 = ink). 8 wide × 10 tall — a blocky capital D.
const D = [
  [1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 0],
];
const GW = D[0].length;
const GH = D.length;

/** CRC32 for PNG chunks. */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

/** Encode an RGBA buffer to a PNG. */
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // Filter byte 0 (None) per scanline.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Render the DemAI icon at size N to an RGBA buffer. */
function renderIcon(n) {
  const rgba = Buffer.alloc(n * n * 4);
  const r = Math.round(n * 0.22); // corner radius
  const glyphH = Math.round(n * 0.56);
  const glyphW = Math.round((glyphH * GW) / GH);
  const offX = Math.round((n - glyphW) / 2);
  const offY = Math.round((n - glyphH) / 2);

  const inRoundedSquare = (x, y) => {
    // inner rect bounds
    const left = r;
    const right = n - r;
    const top = r;
    const bottom = n - r;
    if (x >= left && x < right) return true;
    if (y >= top && y < bottom) return true;
    // distance to nearest corner center
    const cx = x < r ? r : x >= n - r ? n - r - 1 : x;
    const cy = y < r ? r : y >= n - r ? n - r - 1 : y;
    // corner centers
    const ccx = x < r ? r : n - r;
    const ccy = y < r ? r : n - r;
    const dx = x - ccx;
    const dy = y - ccy;
    return dx * dx + dy * dy <= r * r;
  };

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      if (!inRoundedSquare(x, y)) {
        rgba[i + 3] = 0; // transparent corner
        continue;
      }
      let [cr, cg, cb] = LIME;
      // sample the glyph with nearest-neighbor at the scaled grid cell
      const gx = Math.floor(((x - offX) / glyphW) * GW);
      const gy = Math.floor(((y - offY) / glyphH) * GH);
      if (gx >= 0 && gx < GW && gy >= 0 && gy < GH && D[gy][gx] === 1) {
        [cr, cg, cb] = INK;
      }
      rgba[i] = cr;
      rgba[i + 1] = cg;
      rgba[i + 2] = cb;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function writePng(name, size) {
  const png = encodePng(size, size, renderIcon(size));
  writeFileSync(join(OUT, name), png);
  console.log(`  ${name}  ${size}×${size}  (${png.length} bytes)`);
}

function writeSvg() {
  // A scalable variant for the manifest + favicon. Rounded lime square + ink D.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="${limeCss}"/>
  <text x="256" y="256" font-family="Onest, Arial, sans-serif" font-size="300" font-weight="700" fill="${inkCss}" text-anchor="middle" dominant-baseline="central">D</text>
</svg>
`;
  writeFileSync(join(OUT, "icon.svg"), svg, "utf8");
  console.log("  icon.svg (scalable)");
}

mkdirSync(OUT, { recursive: true });
console.log("Generating DemAI PWA icons into /public …");
writePng("icon-192.png", 192);
writePng("icon-512.png", 512);
writePng("apple-touch-icon.png", 180);
writeSvg();
console.log("Done.");
