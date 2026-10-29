// The display module's own circuit board: what lies under its screen. One
// image for every project's module (their chips differ only in what's
// printed on them, which is HTML). Millimetres, relative to the area the
// glass covers; same materials and lamp as the hero board (black mask, as
// on the module's carrier edge).
import { bus, chamfered, fmt as f, type Pt, type Rect } from "@/components/hero/board/geom";
import { CERAMIC, MASKS, RESISTOR, metalDefs, passive, shadow } from "@/components/hero/board/layers";

export const CARRIER = { w: 76, h: 38.3 };
/** The memory chip (a windowed ceramic package) and the processor (QFP), bodies only. */
export const MEM: Rect = { x: 6, y: 9.5, w: 21, h: 19 };
export const CPU: Rect = { x: 38.5, y: 9, w: 20, h: 20 };
/** The memory chip's quartz window. */
export const WINDOW: Rect = { x: MEM.x + MEM.w / 2 - 5, y: MEM.y + MEM.h / 2 - 4, w: 10, h: 8 };

const r = (x: number, y: number, w: number, h: number, a = "") => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${a}/>`;
const c = (x: number, y: number, rad: number, a = "") => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}"${a}/>`;

export function carrierLayer(): string {
  const m = MASKS.black;
  const lines: { pts: Pt[]; w: number }[] = [];
  const vias: Pt[] = [];
  let pads = "", parts = "";

  // The ribbon cable's contacts along the top edge, and its bus into the processor.
  for (let i = 0; i < 7; i++) pads += r(38 - 0.35 + (i - 3) * 1.2, 0, 0.7, 1.3);
  for (const l of bus([[38, 1.3], [38, 2.0], [43.5, 7.5], [43.5, 7.7]], 7, 1.2)) lines.push({ pts: l, w: 0.32 });

  // Memory ↔ processor: an eight-line data bus.
  const memLeg = (i: number) => MEM.y + 1.4 + i * 1.9 + 0.25;
  for (let i = 0; i < 8; i++) lines.push({ pts: [[MEM.x + MEM.w + 1.4, memLeg(i)], [CPU.x - 1.4, memLeg(i)]], w: 0.3 });
  // The memory's left pins drop to vias.
  for (let i = 0; i < 9; i += 2) {
    const y = memLeg(i);
    lines.push({ pts: [[MEM.x - 1.4, y], [2.6, y]], w: 0.25 });
    vias.push([2.2, y]);
  }

  // Processor, right side: a column of decoupling caps and their vias.
  for (let i = 0; i < 4; i++) {
    const y = CPU.y + 3 + i * 4.6;
    lines.push({ pts: [[CPU.x + CPU.w + 1.4, y], [63.4, y], [64.6, y + 1.2], [64.6, y + 1.6]], w: 0.3 });
    parts += passive(64.6, y + 2.4, 1.6, 0.8, false, CERAMIC);
    lines.push({ pts: [[64.6, y + 3.2], [64.6, y + 3.7], [66.6, y + 3.7]], w: 0.3 });
    vias.push([67.1, y + 3.7]);
  }
  // A test-point column at the right edge.
  for (let i = 0; i < 3; i++) pads += c(71.5, 12 + i * 6, 0.65);
  lines.push({ pts: [[CPU.x + CPU.w + 1.4, CPU.y + 1.4], [70, CPU.y + 1.4], [71.5, 12 - 0.6], [71.5, 12]], w: 0.25 });

  // Processor, below: its crystal and two load caps.
  const X = { x: 44, y: 32.2, w: 6.4, h: 3.2 };
  lines.push({ pts: [[45.2, CPU.y + CPU.h + 1.4], [45.2, X.y + 0.2]], w: 0.25 }, { pts: [[48.8, CPU.y + CPU.h + 1.4], [48.8, X.y + 0.2]], w: 0.25 });
  lines.push({ pts: [[X.x + X.w, X.y + 1.6], [53.6, X.y + 1.6]], w: 0.25 });
  parts += passive(54.6, X.y + 1.6, 1.6, 0.8, true, CERAMIC) + passive(57.4, X.y + 1.6, 1.6, 0.8, true, CERAMIC);
  pads += r(X.x - 0.2, X.y + 0.3, 1.4, 2.6) + r(X.x + X.w - 1.2, X.y + 0.3, 1.4, 2.6);
  parts += shadow(X.x, X.y, X.w, X.h, 0.4) + r(X.x, X.y, X.w, X.h, ` rx=".4" fill="url(#steel)"`) + r(X.x + 0.3, X.y + 0.3, X.w - 0.6, X.h - 0.6, ` rx=".3" fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".07"`);

  // Decoupling at the processor's corners and under the memory.
  for (const [x, y] of [[CPU.x - 2.2, CPU.y - 2.0], [CPU.x + CPU.w + 2.2, CPU.y - 2.0], [CPU.x - 2.2, CPU.y + CPU.h + 2.0]] as Pt[]) parts += passive(x, y, 1.6, 0.8, true, CERAMIC);
  for (const x of [9.5, 12.5]) {
    parts += passive(x, MEM.y + MEM.h + 3.2, 1.6, 0.8, true, CERAMIC);
    lines.push({ pts: [[x, MEM.y + MEM.h + 2.8], [x, MEM.y + MEM.h + 1.6]], w: 0.25 });
  }
  parts += passive(20, MEM.y + MEM.h + 3.4, 1.6, 0.8, true, RESISTOR);
  lines.push({ pts: [[21, MEM.y + MEM.h + 3.4], [24, MEM.y + MEM.h + 3.4], [26, MEM.y + MEM.h + 5.4], [36, MEM.y + MEM.h + 5.4], [38, CPU.y + CPU.h + 3.4], [42, CPU.y + CPU.h + 3.4]], w: 0.25 });

  // Pads under every leg.
  const qfp = (i: number) => CPU.x + 1.375 + i * 0.65;
  for (let i = 0; i < 27; i++) {
    pads += r(qfp(i) - 0.17, CPU.y - 1.6, 0.34, 1.5) + r(qfp(i) - 0.17, CPU.y + CPU.h + 0.1, 0.34, 1.5);
    pads += r(CPU.x - 1.6, CPU.y + 1.375 + i * 0.65 - 0.17, 1.5, 0.34) + r(CPU.x + CPU.w + 0.1, CPU.y + 1.375 + i * 0.65 - 0.17, 1.5, 0.34);
  }
  for (let i = 0; i < 9; i++) pads += r(MEM.x - 1.6, memLeg(i) - 0.32, 1.5, 0.64) + r(MEM.x + MEM.w + 0.1, memLeg(i) - 0.32, 1.5, 0.64);

  // The processor: gull-wing legs, then the epoxy body (lit top-left), pin 1.
  let chips = "";
  for (let i = 0; i < 27; i++) {
    const p = qfp(i), q = CPU.y + 1.375 + i * 0.65;
    chips += r(p - 0.11, CPU.y - 1.45, 0.22, 1.0, ` fill="url(#solder)"`) + r(p - 0.11, CPU.y - 0.45, 0.22, 0.45, ` fill="#7b8187"`);
    chips += r(p - 0.11, CPU.y + CPU.h + 0.45, 0.22, 1.0, ` fill="url(#solder)"`) + r(p - 0.11, CPU.y + CPU.h, 0.22, 0.45, ` fill="#5d6268"`);
    chips += r(CPU.x - 1.45, q - 0.11, 1.0, 0.22, ` fill="url(#solder)"`) + r(CPU.x - 0.45, q - 0.11, 0.45, 0.22, ` fill="#7b8187"`);
    chips += r(CPU.x + CPU.w + 0.45, q - 0.11, 1.0, 0.22, ` fill="url(#solder)"`) + r(CPU.x + CPU.w, q - 0.11, 0.45, 0.22, ` fill="#5d6268"`);
  }
  chips += shadow(CPU.x, CPU.y, CPU.w, CPU.h, 0.3) + r(CPU.x, CPU.y, CPU.w, CPU.h, ` rx=".3" fill="url(#epoxy)"`);
  chips += `<path d="M${f(CPU.x + 0.25)} ${f(CPU.y + CPU.h - 0.2)}V${f(CPU.y + 0.25)}H${f(CPU.x + CPU.w - 0.2)}" fill="none" stroke="rgba(255,255,255,.13)" stroke-width=".08"/>`;
  chips += c(CPU.x + 1.6, CPU.y + 1.6, 0.55, ` fill="#060606"`) + c(CPU.x + 1.55, CPU.y + 1.55, 0.55, ` fill="none" stroke="rgba(255,255,255,.1)" stroke-width=".06"`);

  // The memory: a dark ceramic package with gull-wing legs, a gold seal ring
  // round a quartz window, and its silicon die visible through the glass —
  // circuitry in thin metal, bond wires out to the frame.
  for (let i = 0; i < 9; i++) {
    const y = memLeg(i);
    chips += r(MEM.x - 1.45, y - 0.2, 1.05, 0.4, ` fill="url(#solder)"`) + r(MEM.x - 0.4, y - 0.2, 0.4, 0.4, ` fill="#7b8187"`);
    chips += r(MEM.x + MEM.w + 0.4, y - 0.2, 1.05, 0.4, ` fill="url(#solder)"`) + r(MEM.x + MEM.w, y - 0.2, 0.4, 0.4, ` fill="#5d6268"`);
  }
  const W = WINDOW, D = { x: W.x + 2.4, y: W.y + 2.1, w: 5.2, h: 3.8 };
  let die = "";
  for (let k = 0; k < 6; k++) die += `M${f(D.x + 0.5)} ${f(D.y + 0.5 + k * 0.55)}H${f(D.x + D.w - 0.5)}`;
  for (let k = 0; k < 8; k++) die += `M${f(D.x + 0.5 + k * 0.6)} ${f(D.y + 0.45)}V${f(D.y + D.h - 0.45)}`;
  let wires = "";
  for (let k = 0; k < 6; k++) {
    const x = D.x + 0.5 + k * 0.84;
    wires += `M${f(x)} ${f(D.y + 0.15)}L${f(x - 0.4 + k * 0.16)} ${f(W.y + 0.9)}M${f(x)} ${f(D.y + D.h - 0.15)}L${f(x - 0.4 + k * 0.16)} ${f(W.y + W.h - 0.9)}`;
  }
  chips +=
    shadow(MEM.x, MEM.y, MEM.w, MEM.h, 0.5) +
    r(MEM.x, MEM.y, MEM.w, MEM.h, ` rx=".5" fill="url(#ceramic)"`) +
    `<path d="M${f(MEM.x + 0.3)} ${f(MEM.y + MEM.h - 0.3)}V${f(MEM.y + 0.3)}H${f(MEM.x + MEM.w - 0.3)}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width=".09"/>` +
    c(MEM.x + 1.5, MEM.y + 1.5, 0.45, ` fill="#141210"`) +
    r(W.x, W.y, W.w, W.h, ` rx="1.4" fill="url(#enig)"`) +
    r(W.x + 0.3, W.y + 0.3, W.w - 0.6, W.h - 0.6, ` rx="1.15" fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".07"`) +
    r(W.x + 0.7, W.y + 0.7, W.w - 1.4, W.h - 1.4, ` rx=".9" fill="#0a0910"`) +
    r(D.x, D.y, D.w, D.h, ` fill="url(#die)"`) +
    `<path d="${die}" stroke="rgba(230,214,170,.35)" stroke-width=".05"/>` +
    `<path d="${wires}" stroke="#E2C77E" stroke-width=".05" opacity=".85"/>` +
    // The quartz catching the lamp.
    `<path d="M${f(W.x + 1.1)} ${f(W.y + W.h - 1.6)}L${f(W.x + 3.6)} ${f(W.y + 1.0)}H${f(W.x + 5.0)}L${f(W.x + 2.2)} ${f(W.y + W.h - 1.0)}Z" fill="#fff" opacity=".09"/>`;

  // Silkscreen: corner brackets round both chips.
  const brackets = (x: number, y: number, w: number, h: number, k = 1.6) =>
    `M${f(x)} ${f(y + k)}V${f(y)}H${f(x + k)}M${f(x + w - k)} ${f(y)}H${f(x + w)}V${f(y + k)}M${f(x + w)} ${f(y + h - k)}V${f(y + h)}H${f(x + w - k)}M${f(x + k)} ${f(y + h)}H${f(x)}V${f(y + h - k)}`;
  const silkPath = brackets(MEM.x - 2.4, MEM.y - 0.8, MEM.w + 4.8, MEM.h + 1.6) + brackets(CPU.x - 2.5, CPU.y - 2.5, CPU.w + 5, CPU.h + 5);

  const traces = lines.map((l) => `<path d="${chamfered(l.pts, Math.max(0.3, l.w * 2))}" stroke-width="${l.w}"/>`).join("");
  const via = ([x, y]: Pt) => c(x, y, 0.3, ` fill="${m.via}"`) + c(x - 0.06, y - 0.06, 0.3, ` fill="none" stroke="${m.ridge}" stroke-width=".06"`) + c(x, y, 0.12, ` fill="${m.viaCore}"`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARRIER.w} ${CARRIER.h}" width="${CARRIER.w * 10}" height="${CARRIER.h * 10}"><defs>${metalDefs}
<linearGradient id="ceramic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d3833"/><stop offset=".5" stop-color="#26221f"/><stop offset="1" stop-color="#181614"/></linearGradient>
<linearGradient id="die" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a4a86"/><stop offset=".3" stop-color="#2f6d73"/><stop offset=".55" stop-color="#b59a52"/><stop offset=".8" stop-color="#6d3f7a"/><stop offset="1" stop-color="#2b4f6e"/></linearGradient>
<g id="tr" fill="none" stroke-linecap="round" stroke-linejoin="round">${traces}</g></defs>
<use href="#tr" stroke="${m.shade}" transform="translate(.05 .06)"/>
<use href="#tr" stroke="${m.ridge}" transform="translate(-.035 -.035)"/>
<use href="#tr" stroke="${m.overTrace}"/>
${vias.map(via).join("")}
<g fill="url(#enig)">${pads}</g>
<path d="${silkPath}" fill="none" stroke="#E8E6DF" stroke-width=".15" stroke-linecap="round" opacity=".8"/>
${parts}${chips}</svg>`;
}
