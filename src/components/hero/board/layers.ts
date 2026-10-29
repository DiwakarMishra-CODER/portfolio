// Static board layers as SVG strings (mm units). Rendered once on the server
// and served as images from /board/[layer] — they never change at runtime,
// so they stay out of the React tree and are rasterised once.
//
// One lamp: softbox upper-left. Highlights sit on top-left edges; contact
// shadows fall down-right. No filters except the static mask grain.
import { chamfered, fmt as f, silk, type Pt, type Rect } from "./geom";
import type { PartGroup, Spec } from "./spec";

const SILK = "#E8E6DF";

/** Solder-mask finishes. Green is the default — the colour anyone reads as
 *  "circuit board" at first glance — done as deep, matte, desaturated green
 *  (never toy green), with gold pads and copper catching light under it. */
export type Mask = "green" | "black";
const MASKS: Record<Mask, { mask: string; overTrace: string; ridge: string; shade: string; via: string; viaCore: string; clearance: string }> = {
  green: { mask: "#10301F", overTrace: "#1C4A32", ridge: "rgba(214,255,226,.16)", shade: "rgba(0,12,4,.6)", via: "#1d4530", viaCore: "#0a1d13", clearance: "#0b2016" },
  black: { mask: "#131314", overTrace: "#1F1D1B", ridge: "rgba(255,226,196,.17)", shade: "rgba(0,0,0,.7)", via: "#1b1a19", viaCore: "#0d0d0d", clearance: "#0c0c0c" },
};

const open = (S: Spec) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S.BOARD.w} ${S.BOARD.h}" width="${S.BOARD.w * 10}" height="${S.BOARD.h * 10}">`;

const metalDefs = `
<linearGradient id="enig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1DFA4"/><stop offset=".45" stop-color="#D0B26A"/><stop offset="1" stop-color="#9B7C3C"/></linearGradient>
<linearGradient id="solder" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ECEFF1"/><stop offset=".5" stop-color="#B9BEC3"/><stop offset="1" stop-color="#7B8187"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D5DADF"/><stop offset=".45" stop-color="#A9AFB5"/><stop offset="1" stop-color="#4E545A"/></linearGradient>
<linearGradient id="epoxy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1D1D1F"/><stop offset=".5" stop-color="#0F0F10"/><stop offset="1" stop-color="#0A0A0B"/></linearGradient>
<linearGradient id="nickel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9DCDF"/><stop offset=".55" stop-color="#AEB2B6"/><stop offset="1" stop-color="#6E7378"/></linearGradient>
<radialGradient id="bore" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#030303"/><stop offset=".7" stop-color="#0b0b0b"/><stop offset="1" stop-color="#3a3326"/></radialGradient>`;

// ── Small helpers ──────────────────────────────────────────────────────────
const r = (x: number, y: number, w: number, h: number, a = "") => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${a}/>`;
const c = (x: number, y: number, rad: number, a = "") => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}"${a}/>`;
/** Contact shadow: a tight dark copy and a wide faint one, down-right of the part. */
const shadow = (x: number, y: number, w: number, h: number, rx = 0.2) =>
  `<rect x="${f(x + 0.8)}" y="${f(y + 0.8)}" width="${f(w)}" height="${f(h)}" rx="${f(rx + 0.6)}" fill="#000" opacity=".18"/>` +
  `<rect x="${f(x + 0.2)}" y="${f(y + 0.25)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="#000" opacity=".6"/>`;

// ═════════════════════════════════════════════════════════════════════════
//  S.BOARD: substrate, mask, traces (relief), vias, pads, holes, silkscreen
// ═════════════════════════════════════════════════════════════════════════

/** Stitching vias along the board edge, skipping parts and holes. */
function stitchVias(S: Spec): Pt[] {
  const pts: Pt[] = [];
  const near = (x: number, y: number, r: Rect, m: number) => x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m;
  const blocked = (x: number, y: number) =>
    S.HOLES.some(([hx, hy]) => Math.hypot(x - hx, y - hy) < 4.2) ||
    S.FIDUCIALS.some(([fx, fy]) => Math.hypot(x - fx, y - fy) < 1.8) ||
    near(x, y, S.J1, 1.4) ||
    S.VIA_BLOCKS.some((b) => near(x, y, b, 0)) ||
    !clearOfTraces(S, [x, y], 0.55);
  for (let x = 7; x <= S.BOARD.w - 7; x += 2.54) {
    if (!blocked(x, 1.3)) pts.push([x, 1.3]);
    if (!blocked(x, S.BOARD.h - 1.3)) pts.push([x, S.BOARD.h - 1.3]);
  }
  for (let y = 9; y <= S.BOARD.h - 9; y += 2.54) {
    if (!blocked(1.3, y)) pts.push([1.3, y]);
    if (!blocked(S.BOARD.w - 1.3, y)) pts.push([S.BOARD.w - 1.3, y]);
  }
  return pts;
}

/** Is a point at least `gap` mm (plus half each trace's width) from every trace? */
function clearOfTraces(S: Spec, [x, y]: Pt, gap: number) {
  for (const t of S.TRACES) {
    for (let i = 1; i < t.pts.length; i++) {
      const [ax, ay] = t.pts[i - 1], [bx, by] = t.pts[i];
      const vx = bx - ax, vy = by - ay;
      const k = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
      if (Math.hypot(x - ax - k * vx, y - ay - k * vy) < gap + t.width / 2) return false;
    }
  }
  return true;
}

function tentedVia([x, y]: Pt, m: (typeof MASKS)[Mask]) {
  // A via under the mask: a faint ring raised through it, lit top-left.
  return c(x, y, 0.3, ` fill="${m.via}"`) + c(x - 0.06, y - 0.06, 0.3, ` fill="none" stroke="${m.ridge}" stroke-width=".06"`) + c(x, y, 0.12, ` fill="${m.viaCore}"`);
}

function hole([x, y]: Pt) {
  let s = c(x, y, 3.0, ` fill="url(#enig)"`) + c(x, y, 2.6, ` fill="none" stroke="#9B7C3C" stroke-width=".08" opacity=".7"`);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += c(x + Math.cos(a) * 2.3, y + Math.sin(a) * 2.3, 0.22, ` fill="#3a2f17"`);
  }
  return s + c(x, y, 1.6, ` fill="url(#bore)"`);
}

/** Silkscreen: its own image, printed after the mask during the opening. */
export function silkLayer(rev: string, S: Spec): string {
  const t = (s: string, x: number, y: number, h = 1.0, a: "start" | "middle" | "end" = "start") => silk(s, x, y, h, a);
  let d = "";
  // Plain words only. Engineer designators (R1, U3, TP1…) mean nothing to a
  // visitor, so the board doesn't print them; the parts stay as texture.
  // One quiet line of fine print (the name is already on the processor).
  d += t(`PORTFOLIO  2026  DELHI  BUILD ${rev}`, S.TITLE_LINE.x, S.TITLE_LINE.y, 0.8, S.TITLE_LINE.anchor);

  // Outlines: courtyards with notches, corner brackets, pin-1 marks.
  let o = "";
  const box = (x: number, y: number, w: number, h: number) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
  const brackets = (x: number, y: number, w: number, h: number, k = 2) =>
    `M${f(x)} ${f(y + k)}V${f(y)}H${f(x + k)}M${f(x + w - k)} ${f(y)}H${f(x + w)}V${f(y + k)}M${f(x + w)} ${f(y + h - k)}V${f(y + h)}H${f(x + w - k)}M${f(x + k)} ${f(y + h)}H${f(x)}V${f(y + h - k)}`;
  for (const s of S.SWITCHES) o += box(s.x - 0.35, s.y - 0.35, S.SW_SIZE + 0.7, S.SW_SIZE + 0.7);
  o += box(S.DIP.x - 0.35, S.DIP.y - 0.35, S.DIP.w + 0.7, S.DIP.h + 0.7);
  if (S.U3) o += box(S.U3.x - 1.3, S.U3.y - 0.5, S.U3.w + 2.6, S.U3.h + 1.0);
  if (S.Y1) o += box(S.Y1.x - 0.4, S.Y1.y - 0.4, S.Y1.w + 0.8, S.Y1.h + 0.8);
  o += brackets(S.U1.x - 0.9, S.U1.y - 0.9, S.U1.w + 1.8, S.U1.h + 1.8, 3);
  o += brackets(S.DS1.x - 0.6, S.DS1.y - 0.6, S.DS1.w + 1.2, S.DS1.h + 1.2, 3) + brackets(S.DS2.x - 0.6, S.DS2.y - 0.6, S.DS2.w + 1.2, S.DS2.h + 1.2, 3);
  // Display outlines hug the display sideways (it has no pins there) and clear its pins top and bottom.
  for (const { display: a } of S.ACH_SLOTS) o += brackets(a.x - 0.45, a.y - 1.6, a.w + 0.9, a.h + 3.2, 1.3);
  // Electrolytic cans: round outline with the flat polarity corners, and a "+".
  for (const e of S.ELECTROLYTICS) {
    const k = e.r + 0.6;
    o += `M${f(e.x - k)} ${f(e.y - k + 1.2)}V${f(e.y + k)}H${f(e.x + k)}V${f(e.y - k)}H${f(e.x - k + 1.2)}L${f(e.x - k)} ${f(e.y - k + 1.2)}`;
    d += t("+", e.x - k - 0.4, e.y - k + 0.4, 0.9, "end");
  }
  if (S.HEADER) o += box(S.HEADER.x - 0.4, S.HEADER.y - 0.4, S.HEADER.w + 0.8, S.HEADER.h + 0.8);
  o += S.J1_ROT ? box(S.J1.x - 0.5, S.J1.y + 0.5, S.J1.w + 1.0, S.J1.h) : box(S.J1.x + 0.5, S.J1.y - 0.5, S.J1.w, S.J1.h + 1.0);
  // Pin-1 dots.
  const dots = [S.U3 ? c(S.U3.x - 1.0, S.U3.y - 0.9, 0.22) : "", c(S.U2.x - 0.5, S.U2.y - 0.5, 0.18), c(S.U1.x - 0.4, S.U1.y - 0.4, 0.3), c(S.ZIF1.x - 0.5, S.ZIF1.y - 0.5, 0.2), c(S.ZIF2.x + S.ZIF2.w + 0.5, S.ZIF2.y - 0.5, 0.2)].join("");

  return `${open(S)}<g fill="none" stroke="${SILK}" stroke-width=".15" stroke-linecap="round" stroke-linejoin="round" opacity=".92"><path d="${d}"/><path d="${o}"/></g><g fill="${SILK}" opacity=".92">${dots}</g></svg>`;
}

export function boardLayer(rev: string, mask: Mask, S: Spec): string {
  const m = MASKS[mask];
  const traces = S.TRACES.map((t) => `<path d="${chamfered(t.pts, Math.max(0.3, t.width * 2))}" stroke-width="${t.width}"/>`).join("");
  const caps = S.decouplers();
  // Dogbone: each decoupling cap gets a short stub to a via, away from U1
  // (dropped where a via would crowd a trace or the board edge).
  const cx = S.U1.x + S.U1.w / 2, cy = S.U1.y + S.U1.h / 2;
  const dog = caps
    .map(([x, y, h]) => {
      const vx = h ? (x < cx ? x - 1.0 : x + 1.0) : x;
      const vy = h ? y : y < cy ? y - 1.0 : y + 1.0;
      return { path: `M${f(x)} ${f(y)}L${f(vx)} ${f(vy)}`, via: [vx, vy] as Pt };
    })
    .filter((v) => v.via[1] > 0.8 && v.via[0] > 0.8 && v.via[0] < S.BOARD.w - 0.8 && clearOfTraces(S, v.via, 0.5));

  // Pads (ENIG gold), drawn a little larger than the terminations they carry
  // so a gold fillet shows at every joint.
  let pads = "";
  for (const [x, y, h] of caps) pads += h ? r(x - 0.42, y - 0.2, 0.84, 0.4) : r(x - 0.2, y - 0.42, 0.4, 0.84);
  for (const [x, y, h] of S.SERIES_R) pads += h ? r(x - 0.42, y - 0.2, 0.84, 0.4) : r(x - 0.2, y - 0.42, 0.4, 0.84);
  pads += r(S.C1.x - 0.2, S.C1.y - 0.15, 1.0, S.C1.h + 0.3) + r(S.C1.x + S.C1.w - 0.8, S.C1.y - 0.15, 1.0, S.C1.h + 0.3);
  pads += r(S.C2.x - 0.2, S.C2.y - 0.15, 1.0, S.C2.h + 0.3) + r(S.C2.x + S.C2.w - 0.8, S.C2.y - 0.15, 1.0, S.C2.h + 0.3);
  pads += r(S.L1.x - 0.3, S.L1.y + 1.2, 1.2, 1.6) + r(S.L1.x + S.L1.w - 0.9, S.L1.y + 1.2, 1.2, 1.6);
  for (let i = 0; i < 3; i++) pads += r(S.U2.x + 0.3 + i * 0.95, S.U2.y - 0.75, 0.5, 0.7) + r(S.U2.x + 0.3 + i * 0.95, S.U2.y + S.U2.h + 0.05, 0.5, 0.7);
  const U3 = S.U3, Y1 = S.Y1;
  if (U3) for (let i = 0; i < 4; i++) pads += r(U3.x - 1.25, U3.y + 0.2 + i * 1.27, 1.1, 0.55) + r(U3.x + U3.w + 0.15, U3.y + 0.2 + i * 1.27, 1.1, 0.55);
  if (Y1) pads += r(Y1.x - 0.25, Y1.y + 0.6, 0.9, 1.3) + r(Y1.x + Y1.w - 0.65, Y1.y + 0.6, 0.9, 1.3);
  pads += r(S.D1.x - 0.15, S.D1.y - 0.05, 0.6, S.D1.h + 0.1) + r(S.D1.x + S.D1.w - 0.45, S.D1.y - 0.05, 0.6, S.D1.h + 0.1);
  for (const l of S.LEDS) pads += r(l.x - 0.15, l.y - 0.05, 0.6, 0.9) + r(l.x + 1.15, l.y - 0.05, 0.6, 0.9);
  const sw = S.SW_SIZE;
  for (const s of S.SWITCHES) for (const [px, py] of [[0, 0.1 * sw], [sw - 1.2, 0.1 * sw], [0, sw - 1.6], [sw - 1.2, sw - 1.6]]) pads += r(s.x + px - 0.5, s.y + py, 2.2, 1.0);
  for (const tp of S.TPS) pads += c(tp.x, tp.y, 0.55);
  // USB-C shell tabs (either side of the receptacle).
  pads += S.J1_ROT
    ? r(S.J1.x - 0.9, S.J1.y + 1.2, 1.2, 1.6) + r(S.J1.x + S.J1.w - 0.3, S.J1.y + 1.2, 1.2, 1.6)
    : r(S.J1.x + 1.2, S.J1.y - 0.9, 1.6, 1.2) + r(S.J1.x + 1.2, S.J1.y + S.J1.h - 0.3, 1.6, 1.2);
  for (const [x, y] of S.FIDUCIALS) pads += c(x, y, 0.5);
  // U1: a pad under every gull-wing leg, all four sides.
  for (const x of S.U1_LEGS.x) pads += r(x - 0.15, S.U1.y, 0.3, 1.7) + r(x - 0.15, S.U1.y + S.U1.h - 1.7, 0.3, 1.7);
  for (const y of S.U1_LEGS.y) pads += r(S.U1.x, y - 0.15, 1.7, 0.3) + r(S.U1.x + S.U1.w - 1.7, y - 0.15, 1.7, 0.3);
  // Display legs, top and bottom edges.
  for (const { display: dsp } of S.ACH_SLOTS) for (const x of S.displayLegs(dsp)) pads += r(x - 0.35, dsp.y - 1.2, 0.7, 1.3) + r(x - 0.35, dsp.y + dsp.h - 0.1, 0.7, 1.3);
  for (const e of S.ELECTROLYTICS) pads += r(e.x - 1.0, e.y - e.r - 0.9, 2.0, 1.6) + r(e.x - 1.0, e.y + e.r - 0.7, 2.0, 1.6);

  return `${open(S)}<defs>${metalDefs}
<filter id="grain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0"/></filter>
<g id="tr" fill="none" stroke-linecap="round" stroke-linejoin="round">${traces}${dog.map((d) => `<path d="${d.path}" stroke-width=".15"/>`).join("")}</g>
</defs>
<rect width="${S.BOARD.w}" height="${S.BOARD.h}" rx="${S.BOARD.r}" fill="#8f865f"/>
<rect x=".12" y=".12" width="${S.BOARD.w - 0.24}" height="${S.BOARD.h - 0.24}" rx="${S.BOARD.r - 0.1}" fill="#BDB28A"/>
<rect x=".3" y=".3" width="${S.BOARD.w - 0.6}" height="${S.BOARD.h - 0.6}" rx="${S.BOARD.r - 0.25}" fill="${m.mask}"/>
<rect x=".3" y=".3" width="${S.BOARD.w - 0.6}" height="${S.BOARD.h - 0.6}" rx="${S.BOARD.r - 0.25}" filter="url(#grain)"/>
<use href="#tr" stroke="${m.shade}" transform="translate(.05 .06)"/>
<use href="#tr" stroke="${m.ridge}" transform="translate(-.035 -.035)"/>
<use href="#tr" stroke="${m.overTrace}"/>
<g>${stitchVias(S).map((v) => tentedVia(v, m)).join("")}${dog.map((d) => tentedVia(d.via, m)).join("")}${S.POWER_VIAS.map((v) => tentedVia(v, m)).join("")}</g>
${S.FIDUCIALS.map(([x, y]) => c(x, y, 1.0, ` fill="${m.clearance}"`)).join("")}
<g fill="url(#enig)">${pads}</g>
${S.HOLES.map(hole).join("")}
</svg>`;
}

// ═════════════════════════════════════════════════════════════════════════
//  PARTS: every small component, at datasheet size, with contact shadows
// ═════════════════════════════════════════════════════════════════════════

/** A chip passive: body + two solder-capped terminations, along x or y. */
function passive(x: number, y: number, len: number, wid: number, horizontal: boolean, body: string) {
  const tl = len * 0.24;
  if (horizontal) {
    const X = x - len / 2, Y = y - wid / 2;
    return shadow(X, Y, len, wid, 0.04) + r(X, Y, len, wid, ` rx=".04" fill="${body}"`) + r(X, Y, tl, wid, ` fill="url(#solder)"`) + r(X + len - tl, Y, tl, wid, ` fill="url(#solder)"`) + r(X + tl, Y, len - 2 * tl, wid * 0.35, ` fill="rgba(255,255,255,.08)"`);
  }
  const X = x - wid / 2, Y = y - len / 2;
  return shadow(X, Y, wid, len, 0.04) + r(X, Y, wid, len, ` rx=".04" fill="${body}"`) + r(X, Y, wid, tl, ` fill="url(#solder)"`) + r(X, Y + len - tl, wid, tl, ` fill="url(#solder)"`) + r(X, Y + tl, wid * 0.35, len - 2 * tl, ` fill="rgba(255,255,255,.08)"`);
}
const CERAMIC = "#8C7B63";
const RESISTOR = "#151515";

/** A small epoxy IC body with a lit top-left bevel and a laser mark. */
function icBody(x: number, y: number, w: number, h: number, mark: string, markH: number) {
  return (
    shadow(x, y, w, h, 0.15) +
    r(x, y, w, h, ` rx=".15" fill="url(#epoxy)"`) +
    `<path d="M${f(x + 0.15)} ${f(y + h - 0.1)}V${f(y + 0.15)}H${f(x + w - 0.1)}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width=".07"/>` +
    `<path d="${silk(mark, x + w / 2, y + h / 2 + markH / 2, markH, "middle")}" fill="none" stroke="#A6A59F" stroke-width="${f(markH * 0.11)}" stroke-linecap="round" opacity=".85"/>`
  );
}

function shieldCan(s: Rect) {
  let holes = "";
  for (let y = s.y + 1.1; y < s.y + s.h - 0.8; y += 1.05) for (let x = s.x + 1.1; x < s.x + s.w - 0.8; x += 1.05) holes += c(x, y, 0.26);
  return (
    shadow(s.x, s.y, s.w, s.h, 0.5) +
    r(s.x, s.y, s.w, s.h, ` rx=".5" fill="url(#nickel)"`) +
    r(s.x + 0.35, s.y + 0.35, s.w - 0.7, s.h - 0.7, ` rx=".35" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".08"`) +
    `<g fill="#3d4146">${holes}</g>` +
    `<path d="M${f(s.x + 0.5)} ${f(s.y + s.h - 0.2)}H${f(s.x + s.w - 0.5)}" stroke="rgba(0,0,0,.35)" stroke-width=".12"/>`
  );
}

/** USB-C receptacle (mid-mount), seen from above, opening at the board edge
 *  on the left (the portrait board rotates it). The shell is a deep-drawn
 *  steel tube of stadium section, so from above it shades across its width
 *  like polished metal: a bright shoulder toward the lamp, banded
 *  reflections, a dark shoulder away. A flared lip at the mouth, two spring
 *  fingers cut into the top, the folded back cover with its weld spots. */
function usbC(j: Rect) {
  // A spring finger: a U-shaped slit, the tongue pressed in a hair.
  const finger = (cy: number) => {
    const fx = j.x + 1.4, rx = j.x + 3.2, hw = 0.36;
    return (
      r(fx, cy - hw, rx - fx, 2 * hw, ` fill="rgba(0,0,0,.14)"`) +
      `<path d="M${f(rx)} ${f(cy - hw)}H${f(fx)}V${f(cy + hw)}H${f(rx)}" fill="none" stroke="#2a2e32" stroke-width=".08"/>` +
      `<path d="M${f(rx)} ${f(cy + hw + 0.08)}H${f(fx + 0.05)}" stroke="rgba(255,255,255,.5)" stroke-width=".05"/>`
    );
  };
  let brush = "";
  for (let y = j.y + 0.4; y < j.y + j.h - 0.3; y += 0.22) brush += `M${f(j.x + 0.5)} ${f(y)}H${f(j.x + j.w - 1)}`;
  const back = j.x + j.w - 0.9;
  return (
    `<linearGradient id="usb-tube" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset=".07" stop-color="#dde1e5"/><stop offset=".17" stop-color="#959ba2"/><stop offset=".34" stop-color="#cdd2d7"/><stop offset=".56" stop-color="#aab0b6"/><stop offset=".78" stop-color="#7a8087"/><stop offset=".91" stop-color="#4f545a"/><stop offset="1" stop-color="#2b2f33"/></linearGradient>` +
    `<linearGradient id="usb-fall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient>` +
    shadow(j.x, j.y, j.w, j.h, 0.6) +
    r(j.x, j.y, j.w, j.h, ` rx=".45" fill="url(#usb-tube)"`) +
    r(j.x, j.y, j.w, j.h, ` rx=".45" fill="url(#usb-fall)"`) +
    `<path d="${brush}" stroke="rgba(255,255,255,.07)" stroke-width=".04"/>` +
    // The flared lip at the mouth.
    r(j.x, j.y + 0.2, 0.28, j.h - 0.4, ` rx=".12" fill="rgba(255,255,255,.4)"`) +
    `<path d="M${f(j.x + 0.36)} ${f(j.y + 0.35)}V${f(j.y + j.h - 0.35)}" stroke="rgba(0,0,0,.35)" stroke-width=".05"/>` +
    finger(j.y + j.h * 0.31) +
    finger(j.y + j.h * 0.69) +
    // The back cover, folded down over the rear, spot-welded.
    `<path d="M${f(back)} ${f(j.y + 0.25)}V${f(j.y + j.h - 0.25)}" stroke="rgba(0,0,0,.45)" stroke-width=".07"/>` +
    `<path d="M${f(back + 0.1)} ${f(j.y + 0.25)}V${f(j.y + j.h - 0.25)}" stroke="rgba(255,255,255,.3)" stroke-width=".05"/>` +
    [0.22, 0.5, 0.78].map((k) => c(back + 0.48, j.y + j.h * k, 0.16, ` fill="rgba(0,0,0,.22)"`) + c(back + 0.45, j.y + j.h * k - 0.04, 0.08, ` fill="rgba(255,255,255,.35)"`)).join("") +
    r(j.x, j.y, j.w, j.h, ` rx=".45" fill="none" stroke="rgba(0,0,0,.5)" stroke-width=".05"`)
  );
}

function screw([x, y]: Pt) {
  let lobes = "";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    lobes += c(x + Math.cos(a) * 0.42, y + Math.sin(a) * 0.42, 0.28);
  }
  return (
    c(x + 0.35, y + 0.4, 2.45, ` fill="#000" opacity=".5"`) +
    c(x, y, 2.4, ` fill="url(#steel)"`) +
    c(x - 0.25, y - 0.3, 1.9, ` fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".12"`) +
    `<g fill="#202326">${lobes}${c(x, y, 0.5)}</g>`
  );
}

/** The parts layer, one group at a time (they're placed in turn during the
 *  opening). Each group is its own image, cropped to its rect. */
export function partsLayer(group: PartGroup, S: Spec): string {
  let s = "";
  if (group === "ring") {
    // Decoupling ring around U1 and the series-resistor columns.
    for (const [x, y, h] of S.decouplers()) s += passive(x, y, 0.6, 0.3, h, CERAMIC);
    for (const [x, y, h] of S.SERIES_R) s += passive(x, y, 0.6, 0.3, h, RESISTOR);
  }
  if (group === "power") {
    s += passive(S.C1.x + S.C1.w / 2, S.C1.y + S.C1.h / 2, S.C1.w, S.C1.h, true, CERAMIC);
    s += passive(S.C2.x + S.C2.w / 2, S.C2.y + S.C2.h / 2, S.C2.w, S.C2.h, true, CERAMIC);
    s += shadow(S.L1.x, S.L1.y, S.L1.w, S.L1.h, 0.5) + r(S.L1.x, S.L1.y, S.L1.w, S.L1.h, ` rx=".5" fill="#2a2a2c"`) + r(S.L1.x + 0.5, S.L1.y + 0.5, S.L1.w - 1, S.L1.h - 1, ` rx=".35" fill="#343437"`);
    s += `<path d="${silk("4R7", S.L1.x + S.L1.w / 2, S.L1.y + S.L1.h / 2 + 0.45, 0.9, "middle")}" fill="none" stroke="#9d9b94" stroke-width=".1" stroke-linecap="round"/>`;
    for (let i = 0; i < 3; i++) s += r(S.U2.x + 0.45 + i * 0.95, S.U2.y - 0.5, 0.2, 0.55, ` fill="url(#solder)"`) + r(S.U2.x + 0.45 + i * 0.95, S.U2.y + S.U2.h - 0.05, 0.2, 0.55, ` fill="url(#solder)"`);
    s += icBody(S.U2.x, S.U2.y, S.U2.w, S.U2.h, "A5W", 0.55);
    s += passive(S.D1.x + S.D1.w / 2, S.D1.y + S.D1.h / 2, S.D1.w, S.D1.h, true, "#E7E1D2");
    // USB-C: drawn as on the landscape board, turned to face the top edge on the portrait one.
    s += S.J1_ROT ? `<g transform="translate(${f(S.J1.x + S.J1.w)} ${f(S.J1.y)}) rotate(90)">${usbC({ x: 0, y: 0, w: S.J1.h, h: S.J1.w })}</g>` : usbC(S.J1);
    s += esd(S.ESD[2][0], S.ESD[2][1]);
    s += electrolytics(S);
  }
  if (group === "right") {
    const U3 = S.U3, Y1 = S.Y1;
    if (U3) {
      // Flash: gull-wing legs, then the body.
      for (let i = 0; i < 4; i++) {
        const y = U3.y + 0.32 + i * 1.27;
        s += r(U3.x - 0.95, y, 1.0, 0.3, ` fill="url(#solder)"`) + r(U3.x + U3.w - 0.05, y, 1.0, 0.3, ` fill="url(#solder)"`);
      }
      s += icBody(U3.x, U3.y, U3.w, U3.h, "25Q128JV", 0.6);
      s += c(U3.x + 0.6, U3.y + 0.6, 0.22, ` fill="#060606"`);
    }
    if (Y1) {
      // Crystal: a seam-welded metal can.
      s += shadow(Y1.x, Y1.y, Y1.w, Y1.h, 0.3) + r(Y1.x, Y1.y, Y1.w, Y1.h, ` rx=".3" fill="url(#steel)"`) + r(Y1.x + 0.25, Y1.y + 0.25, Y1.w - 0.5, Y1.h - 0.5, ` rx=".2" fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".06"`);
      s += `<path d="${silk("24.000", Y1.x + Y1.w / 2, Y1.y + Y1.h / 2 + 0.3, 0.6, "middle")}" fill="none" stroke="#4E545A" stroke-width=".07" stroke-linecap="round"/>`;
    }
    if (S.SH1) s += shieldCan(S.SH1);
    // Status LEDs (0603, diffuse white body with a clear lens).
    for (const l of S.LEDS) s += passive(l.x + 0.8, l.y + 0.4, 1.6, 0.8, true, "#E7E1D2");
    if (S.HEADER) s += header(S.HEADER);
  }
  if (group === "conn") {
    // ESD protection diodes beside each cable connector.
    s += esd(S.ESD[0][0], S.ESD[0][1]) + esd(S.ESD[1][0], S.ESD[1][1]);
  }
  if (group === "u1") {
    // U1's gull-wing legs: a bright soldered foot on the pad, a darker shoulder
    // rising into the package body.
    const foot = "url(#solder)";
    for (const x of S.U1_LEGS.x) {
      s += r(x - 0.11, S.U1.y + 0.35, 0.22, 1.0, ` fill="${foot}"`) + r(x - 0.11, S.U1.y + 1.35, 0.22, S.U1_BODY.y - S.U1.y - 1.35, ` fill="#7b8187"`);
      s += r(x - 0.11, S.U1.y + S.U1.h - 1.35, 0.22, 1.0, ` fill="${foot}"`) + r(x - 0.11, S.U1_BODY.y + S.U1_BODY.h, 0.22, S.U1.y + S.U1.h - 1.35 - (S.U1_BODY.y + S.U1_BODY.h), ` fill="#5d6268"`);
    }
    for (const y of S.U1_LEGS.y) {
      s += r(S.U1.x + 0.35, y - 0.11, 1.0, 0.22, ` fill="${foot}"`) + r(S.U1.x + 1.35, y - 0.11, S.U1_BODY.x - S.U1.x - 1.35, 0.22, ` fill="#7b8187"`);
      s += r(S.U1.x + S.U1.w - 1.35, y - 0.11, 1.0, 0.22, ` fill="${foot}"`) + r(S.U1_BODY.x + S.U1_BODY.w, y - 0.11, S.U1.x + S.U1.w - 1.35 - (S.U1_BODY.x + S.U1_BODY.w), 0.22, ` fill="#5d6268"`);
    }
  }
  if (group === "disp") {
    for (const { display: dsp } of S.ACH_SLOTS) {
      for (const x of S.displayLegs(dsp)) {
        s += r(x - 0.2, dsp.y - 0.95, 0.4, 1.0, ` fill="url(#solder)"`) + r(x - 0.2, dsp.y + dsp.h - 0.05, 0.4, 1.0, ` fill="url(#solder)"`);
      }
    }
  }
  const g = S.PART_GROUPS[group];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(g.x)} ${f(g.y)} ${f(g.w)} ${f(g.h)}" width="${f(g.w * 10)}" height="${f(g.h * 10)}"><defs>${metalDefs}</defs>${s}</svg>`;
}

function esd(x: number, y: number) {
  return icBody(x, y, 1.2, 0.8, "", 0.4) + r(x + 0.15, y, 0.18, 0.8, ` fill="#5b5b5b"`);
}

/** Aluminium electrolytic cans on their black bases: vent score, polarity band. */
function electrolytics(S: Spec) {
  let s = "";
  for (const e of S.ELECTROLYTICS) {
    const k = e.r + 0.3;
    s += shadow(e.x - k, e.y - k, 2 * k, 2 * k, 0.4);
    s += `<path d="M${f(e.x - k)} ${f(e.y - k + 0.9)}V${f(e.y + k)}H${f(e.x + k)}V${f(e.y - k)}H${f(e.x - k + 0.9)}Z" fill="#1b1b1c"/>`;
    s += c(e.x + 0.18, e.y + 0.22, e.r, ` fill="#000" opacity=".45"`) + c(e.x, e.y, e.r, ` fill="url(#steel)"`);
    s += c(e.x - 0.35, e.y - 0.4, e.r * 0.78, ` fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".1"`);
    // Polarity: the black printed segment on the negative side, as on every
    // SMD can; and a thin pressure-vent score across the top.
    const cx = e.x + e.r * 0.38, hy = Math.sqrt(1 - 0.38 * 0.38) * e.r;
    s += `<path d="M${f(cx)} ${f(e.y - hy)}A${f(e.r)} ${f(e.r)} 0 0 1 ${f(cx)} ${f(e.y + hy)}Z" fill="#141516"/>`;
    s += `<path d="M${f(e.x - e.r * 0.42)} ${f(e.y)}H${f(e.x + e.r * 0.3)}M${f(e.x - 0.06)} ${f(e.y - e.r * 0.42)}V${f(e.y + e.r * 0.42)}" stroke="#6e737a" stroke-width=".08" stroke-linecap="round"/>`;
  }
  return s;
}

/** 2 × 5 pin header: black plastic, square gold pins with a lit bevel. */
function header(H: Rect) {
  let s = shadow(H.x, H.y, H.w, H.h, 0.2) + r(H.x, H.y, H.w, H.h, ` rx=".2" fill="#161617"`);
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      const px = H.x + 1.27 + i * 2.54, py = H.y + 1.27 + j * 2.54;
      s += r(px - 0.55, py - 0.55, 1.1, 1.1, ` fill="#0b0b0b"`) + r(px - 0.34, py - 0.34, 0.68, 0.68, ` fill="url(#enig)"`) + r(px - 0.34, py - 0.34, 0.68, 0.2, ` fill="rgba(255,255,255,.35)"`);
    }
  }
  return s;
}

/** One corner screw, drawn about the origin (placed at each mounting hole). */
export function screwLayer(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 6.4 6.4" width="64" height="64"><defs>${metalDefs}</defs>${screw([0, 0])}</svg>`;
}

// ═════════════════════════════════════════════════════════════════════════
//  BENCH: what lies on the mat around the board — a ruler printed on the mat
//  at true board scale, precision tweezers, a reel of parts, a few loose
//  parts; and (its own layer, so it can be plugged in during the opening)
//  the USB-C cable that powers the board. Board mm. One lamp, upper left:
//  every prop casts a soft shadow down-right.
// ═════════════════════════════════════════════════════════════════════════

export const BENCH_M = 40;

const benchDefs = `${metalDefs}
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".9"/></filter>
<filter id="softer" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
<linearGradient id="blade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d636a"/><stop offset=".28" stop-color="#e9ecef"/><stop offset=".5" stop-color="#b9bfc5"/><stop offset=".85" stop-color="#80868d"/><stop offset="1" stop-color="#4d5258"/></linearGradient>
<linearGradient id="reel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b67ad" stop-opacity=".95"/><stop offset=".5" stop-color="#22457e" stop-opacity=".92"/><stop offset="1" stop-color="#142a50" stop-opacity=".95"/></linearGradient>
<linearGradient id="mold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4e54"/><stop offset=".22" stop-color="#2a2d31"/><stop offset=".7" stop-color="#17191c"/><stop offset="1" stop-color="#0b0c0e"/></linearGradient>
<linearGradient id="plug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f4f6"/><stop offset=".14" stop-color="#c9ced3"/><stop offset=".5" stop-color="#a3a9af"/><stop offset=".86" stop-color="#6f757b"/><stop offset="1" stop-color="#3d4247"/></linearGradient>`;

const svgBox = (x: number, y: number, w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x)} ${f(y)} ${f(w)} ${f(h)}" width="${f(w * 10)}" height="${f(h * 10)}"><defs>${benchDefs}</defs>${body}</svg>`;

export function benchLayer(S: Spec): string {
  const M = BENCH_M, W = S.BOARD.w, H = S.BOARD.h;
  const ink = "rgba(186,204,216,0.34)";
  // Rulers printed on the mat, flush with the board's bottom and left edges.
  let ticks = "", nums = "";
  for (let x = 0; x <= W; x++) {
    const l = x % 10 === 0 ? 2.1 : x % 5 === 0 ? 1.4 : 0.8;
    ticks += `M${x} ${H + 1.6}v${l}`;
    if (x % 10 === 0) nums += silk(String(x), x, H + 5.4, 1.05, "middle");
  }
  for (let y = 0; y <= H; y++) {
    const l = y % 10 === 0 ? 2.1 : y % 5 === 0 ? 1.4 : 0.8;
    ticks += `M${-1.6} ${y}h${-l}`;
    if (y % 10 === 0 && y > 0) nums += silk(String(y), -4.6, y + 0.5, 1.05, "end");
  }
  nums += silk("MM", W + 3.2, H + 5.4, 1.05, "start");
  const ruler = `<g fill="none" stroke="${ink}" stroke-linecap="round"><path d="${ticks}" stroke-width=".12"/><path d="${nums}" stroke-width=".13"/></g>`;

  // Precision tweezers, set down beside the board: two tapered stainless
  // blades welded at the back, brushed along their length, a ridged grip,
  // tips toward the board.
  const tw = (() => {
    const outline = (side: number) =>
      `M${side * 0.4} 0C${side * 2.4} 2 ${side * 3.4} 20 ${side * 3.5} 52L${side * 2.4} 104L${side * 1.1} 120L${side * 0.55} 119L${side * 0.9} 104L${side * 1.2} 52C${side * 1.1} 24 ${side * 0.6} 6 0 2Z`;
    const blade = (side: number) =>
      `<path d="${outline(side)}" fill="url(#blade)"/>` +
      // The outer edge catching the lamp, and the inner edge in shadow.
      `<path d="M${side * 0.9} 5C${side * 2.2} 18 ${side * 2.8} 34 ${side * 2.9} 52L${side * 2.05} 103" fill="none" stroke="rgba(255,255,255,.6)" stroke-width=".22"/>` +
      `<path d="M${side * 0.15} 3C${side * 0.8} 14 ${side * 1.15} 34 ${side * 1.25} 52L${side * 0.95} 104" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".18"/>`;
    let grip = "";
    for (let i = 0; i < 18; i++) grip += `M${-3.3} ${30 + i * 1.5}H${3.3}`;
    return (
      `<g transform="translate(${W + 4.2} 4) rotate(-3)">` +
      `<g filter="url(#soft)" opacity=".62" transform="translate(1.8 2.6)"><path d="${outline(-1)}"/><path d="${outline(1)}"/></g>` +
      blade(-1) + blade(1) +
      `<path d="${grip}" stroke="rgba(0,0,0,.32)" stroke-width=".42"/>` +
      `<path d="${grip}" stroke="rgba(255,255,255,.16)" stroke-width=".18" transform="translate(0 .45)"/>` +
      // The weld at the back.
      `<ellipse cx="0" cy="1.6" rx="1.1" ry=".7" fill="rgba(255,255,255,.35)"/>` +
      `</g>`
    );
  })();

  // A reel of parts, the way components arrive: a translucent blue flange
  // with three windows onto the wound carrier tape, a hub with drive slots.
  const reel = (() => {
    const cx = W + 26, cy = H + 18, R = 30;
    let windows = "", slots = "";
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * Math.PI * 2 + 0.35, a1 = a0 + 1.45, ri = 10, ro = R - 4;
      const p = (rr: number, a: number) => `${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`;
      windows += `M${p(ri, a0)}L${p(ro, a0)}A${ro} ${ro} 0 0 1 ${p(ro, a1)}L${p(ri, a1)}A${ri} ${ri} 0 0 0 ${p(ri, a0)}Z`;
      const b = (i / 3) * Math.PI * 2;
      slots += `<path d="M${p(3.4, b)}L${p(5.6, b)}" stroke="#0b0d10" stroke-width="1.2" stroke-linecap="round"/>`;
    }
    return (
      `<circle cx="${cx + 2}" cy="${cy + 3}" r="${R}" fill="#000" opacity=".6" filter="url(#softer)"/>` +
      // The tape wound on the hub, seen through the windows.
      `<circle cx="${cx}" cy="${cy}" r="${R - 9}" fill="none" stroke="#1e1d1b" stroke-width="13"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${R - 9}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="13" stroke-dasharray=".25 .6"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${R - 3.6}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width=".5" stroke-dasharray="1 3"/>` +
      // The flange, with its windows cut through.
      `<path d="M${cx - R} ${cy}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z${windows}" fill="url(#reel)" fill-rule="evenodd"/>` +
      `<path d="${windows}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width=".3"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${R - 0.4}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width=".4"/>` +
      `<path d="M${cx - R * 0.8} ${cy - R * 0.45}A${R * 0.92} ${R * 0.92} 0 0 1 ${cx - R * 0.1} ${cy - R * 0.9}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".9" stroke-linecap="round"/>` +
      `<circle cx="${cx}" cy="${cy}" r="7" fill="#1a3866"/><circle cx="${cx}" cy="${cy}" r="7" fill="none" stroke="rgba(255,255,255,.2)" stroke-width=".3"/>` +
      `<circle cx="${cx}" cy="${cy}" r="2.6" fill="#07090b"/>` + slots
    );
  })();

  // A few loose parts that didn't make it onto the board.
  const loose = [
    [-3.4, 78, 24, 1.6, 0.8, RESISTOR],
    [-4.6, 84.5, -38, 1.6, 0.8, RESISTOR],
    [-3.2, 92, 66, 3.2, 1.6, CERAMIC],
    [W + 2.6, 12, -12, 1.6, 0.8, CERAMIC],
  ] as const;
  const parts = loose.map(([x, y, a, l, w, body]) => `<g transform="translate(${x} ${y}) rotate(${a})">${passive(0, 0, l, w, true, body)}</g>`).join("");

  return svgBox(-M, -M, W + 2 * M, H + 2 * M, reel + ruler + tw + parts);
}

/** The phone's bench has no room round the board for props. */
export function benchPhoneLayer(): string {
  return svgBox(0, 0, 1, 1, "");
}

/*
 * The USB-C cable: a braided cable into a machined aluminium plug housing
 * (space grey, brushed along its length, its edges diamond-cut so they catch
 * the lamp), a black collar at the nose, then the plug's polished steel
 * shell. Drawn plugged in, with the opening along +x (the portrait board
 * rotates it). The shell runs on under the board, into the receptacle, so it
 * shows while the plug slides in during the opening (intro.css).
 */
function usbCable(mouthX: number, y: number, path: string, sh = [1.6, 2.4]) {
  const nose = mouthX - 0.25;
  const hx = nose - 15.6, hw = 14.5, hh = 10.6, hy = y - hh / 2; // the housing
  let ribs = "", brush = "";
  for (let i = 0; i < 5; i++) ribs += `M${f(hx - 1.4 - i * 1.4)} ${f(y - 2.9 + i * 0.22)}v${f(5.8 - i * 0.44)}`;
  for (let k = hy + 0.5; k < hy + hh - 0.4; k += 0.24) brush += `M${f(hx + 0.8)} ${f(k)}H${f(hx + hw - 0.8)}`;
  return (
    `<linearGradient id="alu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa1aa"/><stop offset=".07" stop-color="#727982"/><stop offset=".3" stop-color="#535860"/><stop offset=".62" stop-color="#3d4148"/><stop offset=".9" stop-color="#26292e"/><stop offset="1" stop-color="#17191c"/></linearGradient>` +
    `<linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".12" stop-color="#cfd4d9"/><stop offset=".3" stop-color="#6d737a"/><stop offset=".48" stop-color="#e6e9ec"/><stop offset=".7" stop-color="#8e949b"/><stop offset=".88" stop-color="#3c4146"/><stop offset="1" stop-color="#22262a"/></linearGradient>` +
    `<linearGradient id="boot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3e44"/><stop offset=".3" stop-color="#202327"/><stop offset="1" stop-color="#0b0c0e"/></linearGradient>` +
    // Shadows on the mat.
    `<g filter="url(#soft)" opacity=".6" transform="translate(${sh[0]} ${sh[1]})"><path d="${path}" fill="none" stroke="#000" stroke-width="4.2" stroke-linecap="round"/><rect x="${f(hx - 7.5)}" y="${f(hy)}" width="${f(hw + 8)}" height="${f(hh)}" rx="2.6"/></g>` +
    // The cable: a dark tube, its braid, a highlight along the lamp side.
    `<path d="${path}" fill="none" stroke="#0e1012" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="${path}" fill="none" stroke="#2b2f34" stroke-width="3.1" stroke-dasharray=".42 .42"/>` +
    `<path d="${path}" fill="none" stroke="#202327" stroke-width="3.1" stroke-dasharray=".42 .42" stroke-dashoffset=".42" opacity=".9"/>` +
    `<path d="${path}" fill="none" stroke="rgba(255,255,255,.2)" stroke-width=".6" stroke-linecap="round" transform="translate(-.8 -.8)"/>` +
    // The plug's polished shell (into the receptacle, under the board).
    `<rect x="${f(nose - 0.3)}" y="${f(y - 4.1)}" width="7.3" height="8.2" rx="1.3" fill="url(#chrome)"/>` +
    // The strain relief: black, tapering into the cable, ribbed.
    `<path d="M${f(hx + 0.6)} ${f(y - 3.4)}L${f(hx - 7.6)} ${f(y - 2.2)}L${f(hx - 7.6)} ${f(y + 2.2)}L${f(hx + 0.6)} ${f(y + 3.4)}Z" fill="url(#boot)"/>` +
    `<path d="${ribs}" stroke="rgba(0,0,0,.6)" stroke-width=".3"/>` +
    `<path d="${ribs}" stroke="rgba(255,255,255,.09)" stroke-width=".16" transform="translate(.3 0)"/>` +
    // The black collar at the nose.
    r(nose - 1.2, y - 4.5, 1.25, 9, ` rx=".45" fill="url(#boot)"`) +
    `<path d="M${f(nose - 1.05)} ${f(y - 4.25)}H${f(nose - 0.2)}" stroke="rgba(255,255,255,.25)" stroke-width=".1"/>` +
    // The housing: brushed space-grey aluminium…
    r(hx, hy, hw, hh, ` rx="2.6" fill="url(#alu)"`) +
    `<path d="${brush}" stroke="rgba(255,255,255,.05)" stroke-width=".05"/>` +
    // …a soft sheen where the lamp falls on its rounded top…
    `<ellipse cx="${f(hx + hw * 0.42)}" cy="${f(hy + hh * 0.24)}" rx="${f(hw * 0.38)}" ry="${f(hh * 0.12)}" fill="#fff" opacity=".08" filter="url(#soft)"/>` +
    // …and its diamond-cut edges: lit where they face the lamp (top, back), dark where they face away.
    `<path d="M${f(hx + 0.5)} ${f(hy + hh - 2.2)}V${f(hy + 2.6)}A2.1 2.1 0 0 1 ${f(hx + 2.6)} ${f(hy + 0.5)}H${f(hx + hw - 2.6)}A2.1 2.1 0 0 1 ${f(hx + hw - 0.5)} ${f(hy + 2.6)}" fill="none" stroke="rgba(255,255,255,.78)" stroke-width=".14" stroke-linecap="round"/>` +
    `<path d="M${f(hx + hw - 0.5)} ${f(hy + 2.6)}V${f(hy + hh - 2.6)}A2.1 2.1 0 0 1 ${f(hx + hw - 2.6)} ${f(hy + hh - 0.5)}H${f(hx + 2.6)}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width=".14" stroke-linecap="round"/>` +
    r(hx, hy, hw, hh, ` rx="2.6" fill="none" stroke="rgba(0,0,0,.6)" stroke-width=".06"`)
  );
}

/** The cable layer's box on each board (mm), for placing its image. */
export const cableBox = (S: Spec) =>
  S.J1_ROT
    ? { x: S.J1.x + S.J1.w / 2 - 12, y: -BENCH_M, w: 24, h: BENCH_M + 8 }
    : { x: -BENCH_M, y: S.J1.y - 10, w: BENCH_M + 8, h: S.BOARD.h - S.J1.y + BENCH_M + 10 };

export function cableLayer(S: Spec): string {
  const b = cableBox(S);
  const y = S.J1.y + S.J1.h / 2, mouth = S.J1.x;
  const nose = mouth - 0.25;
  // Out of the plug, a gentle curve down and off the bench.
  const path = `M${f(nose - 23)} ${f(y)}C${f(nose - 30)} ${f(y)} ${f(nose - 34)} ${f(y + 8)} ${f(nose - 35)} ${f(y + 28)}S${f(nose - 36)} ${f(y + 80)} ${f(nose - 30)} ${f(S.BOARD.h + BENCH_M + 4)}`;
  const body = usbCable(mouth, y, path);
  if (!S.J1_ROT) return svgBox(b.x, b.y, b.w, b.h, body);
  // Portrait: the port opens upward at the top edge; draw it opening left at
  // the origin, then turn it to face up.
  const x = S.J1.x + S.J1.w / 2, top = S.J1.y;
  const p = `M${f(-0.25 - 23)} 0C${f(-0.25 - 32)} 0 ${f(-0.25 - 36)} 4 ${f(-0.25 - 41)} 6`;
  return svgBox(b.x, b.y, b.w, b.h, `<g transform="translate(${f(x)} ${f(top)}) rotate(90)">${usbCable(0, 0, p, [2.4, -1.6])}</g>`); // the shadow still falls down-right
}
