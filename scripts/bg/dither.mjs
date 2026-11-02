// Writes the page's background light as tiny dithered PNGs (public/bg/): soft
// glows that sit behind the host and in section corners, and the band that
// dissolves the page into the dark contact plate. Rendered once here, shown
// upscaled with image-rendering: pixelated, so they cost nothing at runtime and
// share the host's 4x4 Bayer dither. No dependencies: a PNG is zlib + CRC32.
//
// usage: node scripts/bg/dither.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../../public/bg/", import.meta.url);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** A soft round light, quantised to a few alpha steps by the Bayer matrix. */
function glow(name, color, { size = 96, strength = 0.5, steps = 4, falloff = 1.7 } = {}) {
  const [r, g, b] = hex(color);
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      const v = Math.max(0, 1 - d) ** falloff;
      const q = Math.min(steps, Math.floor(v * steps + BAYER[(y % 4) * 4 + (x % 4)])) / steps;
      const i = (y * size + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = Math.round(q * strength * 255);
    }
  writeFileSync(new URL(`${name}.png`, OUT), png(size, size, px));
}

/** A strip that dissolves from nothing (top) to solid colour (bottom). */
function band(name, color, { w = 16, h = 8 } = {}) {
  const [r, g, b] = hex(color);
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = (y + 0.5) / h;
      const on = v > BAYER[(y % 4) * 4 + (x % 4)];
      const i = (y * w + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = on ? 255 : 0;
    }
  writeFileSync(new URL(`${name}.png`, OUT), png(w, h, px));
}

mkdirSync(OUT, { recursive: true });
glow("glow-dawn", "#f4a37a", { strength: 0.55 });
glow("glow-dusk", "#9d8be0", { strength: 0.45 });
glow("glow-amber", "#eeb04c", { strength: 0.5 });
band("band-evening", "#1f1a1c");
band("band-dusk", "#16112b");
console.log("wrote public/bg/*.png");
