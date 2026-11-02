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

/** A sky: vertical colour stops, each pixel one of its two neighbouring
 *  stops picked by the Bayer matrix (pure dithered bands, no blending). */
function sky(name, stops, { w = 16, h = 120 } = {}) {
  const cols = stops.map(([, c]) => hex(c));
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const t = (y + 0.5) / h;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const f = Math.min(1, Math.max(0, (t - stops[k][0]) / (stops[k + 1][0] - stops[k][0])));
    for (let x = 0; x < w; x++) {
      const c = f > BAYER[(y % 4) * 4 + (x % 4)] ? cols[k + 1] : cols[k];
      const i = (y * w + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  }
  writeFileSync(new URL(`${name}.png`, OUT), png(w, h, px));
}

/** The setting sun: a disc banded top (pale gold) to bottom (ember), in a
 *  dithered halo. */
function sun(name, { size = 72, core = 0.36, top = "#fff1bf", mid = "#ffbe63", low = "#ff7f45", halo = "#ff9a58" } = {}) {
  const [T, M, L, Hc] = [top, mid, low, halo].map(hex);
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const d = Math.hypot(dx, dy) / 0.5;
      const th = BAYER[(y % 4) * 4 + (x % 4)];
      const i = (y * size + x) * 4;
      let c;
      let a;
      if (d <= core) {
        // Across the disc, top to bottom: gold → orange → ember.
        const v = (dy / 0.5 / core + 1) / 2;
        c = v < 0.5 ? (v * 2 > th ? M : T) : ((v - 0.5) * 2 > th ? L : M);
        a = 1;
      } else {
        // The halo: a few dithered alpha steps.
        const v = Math.max(0, 1 - (d - core) / (1 - core)) ** 1.6;
        const q = Math.min(4, Math.floor(v * 4 + th)) / 4;
        c = Hc;
        a = q * 0.55;
      }
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = Math.round(a * 255);
    }
  writeFileSync(new URL(`${name}.png`, OUT), png(size, size, px));
}

/** A long thin cloud, lit from below. */
function cloud(name, color, { w = 44, h = 6, strength = 0.7 } = {}) {
  const [r, g, b] = hex(color);
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = ((x + 0.5) / w - 0.5) * 2;
      const dy = ((y + 0.5) / h - 0.62) * 2;
      const v = Math.max(0, 1 - Math.hypot(dx, dy * 0.9)) ** 0.9;
      const q = Math.min(3, Math.floor(v * 3 + BAYER[(y % 4) * 4 + (x % 4)])) / 3;
      const i = (y * w + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = Math.round(q * strength * 255);
    }
  writeFileSync(new URL(`${name}.png`, OUT), png(w, h, px));
}

/** Sunlight through a four-pane window, fallen at a slant: a skewed patch
 *  with the window bars left in shadow and soft dithered edges. */
function windowLight(name, color, { w = 96, h = 72, skew = 0.55, strength = 0.6 } = {}) {
  const [r, g, b] = hex(color);
  const px = Buffer.alloc(w * h * 4);
  const pw = Math.round(w * 0.42); // the patch's width before the slant
  const x0 = 3;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x - x0 - y * skew; // undo the slant
      const v = y;
      // Distance inside the patch, the bars cut out (the cross of the frame).
      const inX = Math.min(u, pw - u);
      const inY = Math.min(v - 4, h - 4 - v);
      const barU = Math.abs(u - pw / 2) - 1.2;
      const barV = Math.abs(v - h / 2) - 1.2;
      const e = Math.min(inX, inY, barU, barV);
      const soft = Math.max(0, Math.min(1, (e + 0.5) / 1.5));
      // Brighter near the top, where it comes in.
      const fade = 1 - (v / h) * 0.45;
      const q = Math.min(4, Math.floor(soft * fade * 4 + BAYER[(y % 4) * 4 + (x % 4)])) / 4;
      const i = (y * w + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = Math.round(q * strength * 255);
    }
  writeFileSync(new URL(`${name}.png`, OUT), png(w, h, px));
}

mkdirSync(OUT, { recursive: true });
glow("glow-dawn", "#f4a37a", { strength: 0.55 });
glow("glow-dusk", "#9d8be0", { strength: 0.45 });
glow("glow-amber", "#eeb04c", { strength: 0.5 });
band("band-evening", "#1f1a1c");
band("band-dusk", "#16112b");
// The end of the tour: About in daylight, Contact at sunset.
windowLight("window-day", "#ffc670", { w: 64, h: 52, skew: 0.5, strength: 0.5 });
glow("glow-day", "#ffd99a", { strength: 0.45 });
sky("sky-sunset", [
  [0, "#1c1530"],
  [0.3, "#2a1c3e"],
  [0.5, "#43234a"],
  [0.64, "#6b2d4f"],
  [0.76, "#a3404b"],
  [0.86, "#d4633f"],
  [0.94, "#ef9450"],
  [1, "#fcc274"],
]);
sun("sun-set");
cloud("cloud-lit", "#f39a62");
cloud("cloud-dim", "#b4566a", { strength: 0.55 });
band("band-sunset", "#1c1530");
band("band-ground", "#3a1f2c");
console.log("wrote public/bg/*.png");
