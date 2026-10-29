// The engraved name's letterforms: outlines of the capitals it needs, from
// Bodoni Moda (SIL OFL 1.1 — src/assets/fonts/BodoniModa-OFL.txt), a static
// text-size cut (opsz 11, weight 600: sturdy hairlines, for readability) subset
// to D I W A K R M S H, written to
// src/components/hero/name/outlines.json — the page ships path data for
// nine letters, not a font.
//
//   npm i --no-save opentype.js && node scripts/data/name-outlines.mjs
//
// The subset came from Google Fonts' CSS API (family=Bodoni+Moda:opsz,wght@11,600
// &text=DIWAKRMSH). Units: cap height = 1, y down (cap line 0, baseline 1).
// Each glyph: its advance, its outline as an SVG path, and each contour as a
// polyline (for the laser that traces it).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHARS = "DIWAKRMSH";
// (A small file's Buffer sits inside Node's shared pool: copy out exactly its bytes.)
const bytes = fs.readFileSync(path.join(root, "src/assets/fonts/BodoniModa-11-600-name.woff"));
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
const H = font.charToGlyph("H").getBoundingBox();
const cap = H.y2; // cap height from the H itself (the subset has no OS/2 cap height)
const r = (v) => Math.round(v * 10000) / 10000;
const X = (x) => r(x / cap);
const Y = (y) => r((y + cap) / cap); // opentype paths are y-down from the baseline

function flatten(cmds) {
  const contours = [];
  let cur = null, x = 0, y = 0;
  const push = (px, py) => cur.push([X(px), Y(py)]);
  for (const c of cmds) {
    if (c.type === "M") { cur = []; contours.push(cur); x = c.x; y = c.y; push(x, y); }
    else if (c.type === "L") { x = c.x; y = c.y; push(x, y); }
    else if (c.type === "Q" || c.type === "C") {
      const n = 12;
      for (let i = 1; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const px = c.type === "Q" ? u * u * x + 2 * u * t * c.x1 + t * t * c.x : u * u * u * x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x;
        const py = c.type === "Q" ? u * u * y + 2 * u * t * c.y1 + t * t * c.y : u * u * u * y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y;
        push(px, py);
      }
      x = c.x; y = c.y;
    } else if (c.type === "Z" && cur?.length) cur.push(cur[0]);
  }
  return contours;
}

const glyphs = {};
for (const ch of CHARS) {
  const g = font.charToGlyph(ch);
  const p = g.getPath(0, 0, font.unitsPerEm);
  const d = p.commands
    .map((c) => (c.type === "M" || c.type === "L" ? `${c.type}${X(c.x)} ${Y(c.y)}` : c.type === "Q" ? `Q${X(c.x1)} ${Y(c.y1)} ${X(c.x)} ${Y(c.y)}` : c.type === "C" ? `C${X(c.x1)} ${Y(c.y1)} ${X(c.x2)} ${Y(c.y2)} ${X(c.x)} ${Y(c.y)}` : "Z"))
    .join("");
  glyphs[ch] = { adv: X(g.advanceWidth), d, contours: flatten(p.commands) };
}
const kern = {};
for (const a of CHARS) for (const b of CHARS) {
  const k = font.getKerningValue(font.charToGlyph(a), font.charToGlyph(b));
  if (k) kern[a + b] = X(k);
}
const out = { source: "Bodoni Moda (opsz 11, wght 600), © 2020 The Bodoni Moda Project Authors, SIL OFL 1.1", glyphs, kern };
const file = path.join(root, "src/components/hero/name/outlines.json");
fs.writeFileSync(file, JSON.stringify(out));
const w = (s) => [...s].reduce((a, c) => a + glyphs[c].adv, 0);
console.log(`outlines.json: ${(fs.statSync(file).size / 1024).toFixed(1)} KB; DIWAKAR ${w("DIWAKAR").toFixed(2)} / MISHRA ${w("MISHRA").toFixed(2)} cap heights; kern pairs ${Object.keys(kern).length}`);
