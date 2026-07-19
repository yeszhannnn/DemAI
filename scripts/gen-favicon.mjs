// scripts/gen-favicon.mjs — generate app/favicon.ico from public/logo.png.
// Decodes the real logo PNG, area-resamples it to multiple sizes, and wraps
// the PNGs in a multi-resolution ICO (32-bit, PNG-encoded entries) that every
// modern browser accepts. Run with `npm run favicon`.
//
// Why this exists: Next.js App Router serves BOTH app/favicon.ico and
// app/icon.png when both are present, emitting two <link rel="icon"> tags.
// Browsers prefer the .ico for the tab — so a stale favicon.ico overrides a
// fresh icon.png. Regenerating the .ico from the real logo fixes that.

import { inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./gen-icons.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public", "logo.png");
const OUT = join(ROOT, "app", "favicon.ico");

// 256 is the max ICO dimension; widths/heights of 256 are stored as byte 0.
const SIZES = [16, 32, 48, 64, 128, 256];

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Decode an 8-bit, non-interlaced PNG into { width, height, rgba }. */
function decodePng(buf) {
  const channelsByType = { 0: 1, 2: 3, 4: 2, 6: 4 };
  let width, height, bitDepth, colorType, interlace;
  const idatChunks = [];
  let pos = 8; // skip PNG signature
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 8 + len + 4; // length + type + data + crc
  }
  if (interlace !== 0) throw new Error("Interlaced PNG not supported");
  if (bitDepth !== 8) throw new Error("Only 8-bit PNG supported");
  const channels = channelsByType[colorType];
  if (!channels) throw new Error(`Unsupported color type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const recon = Buffer.alloc((stride + 1) * height);
  const bpp = channels;
  for (let y = 0; y < height; y++) {
    const lineOff = y * (stride + 1);
    const filter = raw[lineOff];
    const src = raw.subarray(lineOff + 1, lineOff + 1 + stride);
    const dst = recon.subarray(lineOff + 1, lineOff + 1 + stride);
    const prev = y > 0 ? recon.subarray((y - 1) * (stride + 1) + 1, (y - 1) * (stride + 1) + 1 + stride) : null;
    for (let i = 0; i < stride; i++) {
      const filt = src[i];
      const left = i >= bpp ? dst[i - bpp] : 0;
      const up = prev ? prev[i] : 0;
      const upLeft = prev && i >= bpp ? prev[i - bpp] : 0;
      let val;
      switch (filter) {
        case 0: val = filt; break;
        case 1: val = (filt + left) & 0xff; break;
        case 2: val = (filt + up) & 0xff; break;
        case 3: val = (filt + ((left + up) >> 1)) & 0xff; break;
        case 4: val = (filt + paeth(left, up, upLeft)) & 0xff; break;
        default: throw new Error(`Bad filter ${filter}`);
      }
      dst[i] = val;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const lineOff = y * (stride + 1) + 1;
    for (let x = 0; x < width; x++) {
      const si = lineOff + x * channels;
      const di = (y * width + x) * 4;
      if (channels === 4) {
        rgba[di] = recon[si]; rgba[di + 1] = recon[si + 1]; rgba[di + 2] = recon[si + 2]; rgba[di + 3] = recon[si + 3];
      } else if (channels === 3) {
        rgba[di] = recon[si]; rgba[di + 1] = recon[si + 1]; rgba[di + 2] = recon[si + 2]; rgba[di + 3] = 255;
      } else if (channels === 2) {
        const g = recon[si]; rgba[di] = g; rgba[di + 1] = g; rgba[di + 2] = g; rgba[di + 3] = recon[si + 1];
      } else {
        const g = recon[si]; rgba[di] = g; rgba[di + 1] = g; rgba[di + 2] = g; rgba[di + 3] = 255;
      }
    }
  }
  return { width, height, rgba };
}

/** Area-average (box) resample with premultiplied alpha. Handles up + down. */
function resizeArea(src, sw, sh, dw, dh) {
  const dst = Buffer.alloc(dw * dh * 4);
  for (let dy = 0; dy < dh; dy++) {
    const y0 = (dy * sh) / dh;
    const y1 = ((dy + 1) * sh) / dh;
    const sy0 = Math.floor(y0);
    const sy1 = Math.min(Math.ceil(y1), sh);
    for (let dx = 0; dx < dw; dx++) {
      const x0 = (dx * sw) / dw;
      const x1 = ((dx + 1) * sw) / dw;
      const sx0 = Math.floor(x0);
      const sx1 = Math.min(Math.ceil(x1), sw);
      let accR = 0, accG = 0, accB = 0, accA = 0, accW = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        if (wy <= 0) continue;
        for (let sx = sx0; sx < sx1; sx++) {
          const wx = Math.min(sx + 1, x1) - Math.max(sx, x0);
          const w = wx * wy;
          if (w <= 0) continue;
          const si = (sy * sw + sx) * 4;
          const a = src[si + 3];
          accR += src[si] * a * w;
          accG += src[si + 1] * a * w;
          accB += src[si + 2] * a * w;
          accA += a * w;
          accW += w;
        }
      }
      const di = (dy * dw + dx) * 4;
      if (accA > 0) {
        dst[di] = Math.round(accR / accA);
        dst[di + 1] = Math.round(accG / accA);
        dst[di + 2] = Math.round(accB / accA);
        dst[di + 3] = Math.round(accA / accW);
      } else {
        dst[di + 3] = 0;
      }
    }
  }
  return dst;
}

function buildIco(sizes, srcRgba, sw, sh) {
  const pngs = sizes.map((n) => {
    const rgba = resizeArea(srcRgba, sw, sh, n, n);
    return { n, buf: encodePng(n, n, rgba) };
  });

  const headerLen = 6;
  const dirEntryLen = 16;
  const dataOffset = headerLen + dirEntryLen * pngs.length;

  const header = Buffer.alloc(headerLen);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = ICO
  header.writeUInt16LE(pngs.length, 4);

  const dir = Buffer.alloc(dirEntryLen * pngs.length);
  let cursor = 0;
  let dataCursor = dataOffset;
  for (const { n, buf } of pngs) {
    dir.writeUInt8(n === 256 ? 0 : n, cursor + 0);
    dir.writeUInt8(n === 256 ? 0 : n, cursor + 1);
    dir.writeUInt8(0, cursor + 2);
    dir.writeUInt8(0, cursor + 3);
    dir.writeUInt16LE(1, cursor + 4); // planes
    dir.writeUInt16LE(32, cursor + 6); // bpp
    dir.writeUInt32LE(buf.length, cursor + 8);
    dir.writeUInt32LE(dataCursor, cursor + 12);
    cursor += dirEntryLen;
    dataCursor += buf.length;
  }
  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)]);
}

const { width, height, rgba } = decodePng(readFileSync(SRC));
const ico = buildIco(SIZES, rgba, width, height);
writeFileSync(OUT, ico);
console.log(`Source: ${SRC} (${width}x${height})`);
console.log(`Wrote ${OUT} (${ico.length} bytes, ${SIZES.length} sizes: ${SIZES.join(",")})`);
