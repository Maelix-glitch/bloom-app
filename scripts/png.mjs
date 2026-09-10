/**
 * Bloom — tiny zero-dependency PNG codec for the asset scripts.
 *
 * Only what we need: decode 8-bit RGB/RGBA non-interlaced, encode 8-bit RGBA,
 * and alpha-blend one image over a solid background with nearest-neighbour
 * scaling (our sources are 512–1024px, so this is plenty sharp).
 */
import { inflateSync, deflateSync } from "node:zlib";

export function decodePng(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const bit = buf[24];
  const color = buf[25];
  const interlace = buf[28];
  if (bit !== 8 || ![2, 6].includes(color) || interlace !== 0) {
    throw new Error(`unsupported PNG: bit=${bit} color=${color} interlace=${interlace}`);
  }
  const ch = color === 6 ? 4 : 3;
  let pos = 8;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    if (type === "IDAT") idat.push(buf.subarray(pos + 8, pos + 8 + len));
    if (type === "IEND") break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(w * h * ch);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[row + x - ch] : 0;
      const b = y > 0 ? px[row - stride + x] : 0;
      const c = x >= ch && y > 0 ? px[row - stride + x - ch] : 0;
      let v = raw[p++];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - b);
        const pc = Math.abs(q - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      px[row + x] = v;
    }
  }
  return { w, h, ch, px };
}

const CRC_T = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(b) {
  let c = -1;
  for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
export function encodePng(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Solid RGBA canvas. */
export function solidCanvas(w, h, [r, g, b]) {
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  }
  return out;
}

/** Alpha-blend `src` onto `dst`, scaled to `size` px and placed at (dx, dy). */
export function blendCentered(dst, dw, src, size, dx, dy) {
  for (let y = 0; y < size; y++) {
    const sy = Math.min(src.h - 1, (y / size) * src.h) | 0;
    for (let x = 0; x < size; x++) {
      const sx = Math.min(src.w - 1, (x / size) * src.w) | 0;
      const sp = (sy * src.w + sx) * src.ch;
      const dp = ((dy + y) * dw + (dx + x)) * 4;
      const a = src.ch === 4 ? src.px[sp + 3] / 255 : 1;
      dst[dp] = Math.round(src.px[sp] * a + dst[dp] * (1 - a));
      dst[dp + 1] = Math.round(src.px[sp + 1] * a + dst[dp + 1] * (1 - a));
      dst[dp + 2] = Math.round(src.px[sp + 2] * a + dst[dp + 2] * (1 - a));
    }
  }
}
