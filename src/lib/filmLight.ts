// Arthouse Atlas's own "light of the film" (frontend/src/components/film/
// useFilmLight.js), ported unchanged: average the still's colour, weighted by
// saturation, ignoring crushed blacks and blown highlights; a black-and-white
// film keeps the house gold. The panel samples its frame live with this, the
// same way the live site does.
export const HOUSE_GOLD = "#d9ad62";

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};

const hslToHex = (h: number, s: number, l: number) => {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return toHex(f(0), f(8), f(4));
};

export function readLight(data: Uint8ClampedArray | number[]): string {
  let r = 0, g = 0, b = 0, w = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.08 || l > 0.94) continue;
    const weight = s * s + 0.01;
    r += data[i] * weight;
    g += data[i + 1] * weight;
    b += data[i + 2] * weight;
    w += weight;
  }
  if (!w) return HOUSE_GOLD;
  const [h, s] = rgbToHsl(r / w, g / w, b / w);
  if (s < 0.12) return HOUSE_GOLD;
  return hslToHex(h, Math.min(0.75, Math.max(0.45, s * 1.25)), 0.6);
}

/** Sample an <img> the way the live site does: draw it into 48×27, read it. */
export function sampleLight(img: HTMLImageElement): string {
  try {
    const c = document.createElement("canvas");
    c.width = 48;
    c.height = 27;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return HOUSE_GOLD;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return readLight(ctx.getImageData(0, 0, c.width, c.height).data);
  } catch {
    return HOUSE_GOLD;
  }
}
