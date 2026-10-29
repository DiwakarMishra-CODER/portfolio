// The engraved name: Bodoni Moda's capitals (SIL OFL — outlines.json, from
// scripts/data/name-outlines.mjs), signed into the chip the way watchmakers
// sign a movement. Laid out and timed here for the laser that cuts them, in
// two passes as engravers work: it traces every letter's outline (contour
// pass, in the font's own contour order), then rasters the fill (a hatch
// sweeping down the name). The at-rest engraving (SVG), the laser canvas and
// the light that follows the pen all come from here.
//
// Units: cap height = 1, y down (cap line 0, baseline 1).
import outlines from "./outlines.json";
import type { Spec } from "../board/spec";
import { T } from "../timeline";

type Glyph = { adv: number; d: string; contours: [number, number][][] };
const GLYPHS = outlines.glyphs as unknown as Record<string, Glyph>;
const KERN: Record<string, number> = { WA: -0.1, AW: -0.1, RA: -0.03 };

const TRACK = 0.15; // letter-spacing, in cap heights — spaced like a dial's signature
export const LINE_PITCH = 1.45; // baseline to baseline, in cap heights
export const NAME_LINES = ["DIWAKAR", "MISHRA"];
export const HATCH = 0.055; // the fill's raster pitch, in cap heights

export type Pt = [number, number];
/** A positioned contour: points along it, each stamped with when the pen
 *  reaches it (ms). */
export type Written = { pts: Pt[]; at: number[]; start: number };
/** A positioned glyph outline, for filling. */
export type Placed = { d: string; x: number; y: number };

/** Lay out lines of capitals: positioned glyphs, their contours, the block size. */
function layout(lines: string[], k = 1, ox = 0, oy = 0) {
  const glyphs: Placed[] = [];
  const contours: { pts: Pt[]; line: number }[] = [];
  let width = 0;
  lines.forEach((text, li) => {
    let x = 0;
    const y = li * LINE_PITCH;
    [...text].forEach((ch, i) => {
      const g = GLYPHS[ch];
      if (!g) return;
      if (i > 0) x += TRACK + (KERN[text[i - 1] + ch] ?? 0);
      glyphs.push({ d: g.d, x, y });
      for (const c of g.contours) contours.push({ pts: c.map(([px, py]) => [ox + (px + x) * k, oy + (py + y) * k] as Pt), line: li });
      x += g.adv;
    });
    width = Math.max(width, x);
  });
  return { glyphs, contours, width, height: (lines.length - 1) * LINE_PITCH + 1 };
}

/*
 * The pen: constant marking speed, instant jumps between contours as a galvo
 * laser makes them, with a brief dwell where each one starts (the beam
 * piercing) and a longer one between lines. Scaled so it all fits [start, end].
 */
function schedule(contours: { pts: Pt[]; line: number }[], [start, end]: readonly [number, number]) {
  const DWELL = 0.12, LINE_DWELL = 0.5;
  const raw: number[][] = [];
  let u = 0;
  contours.forEach((st, i) => {
    if (i > 0) u += st.line !== contours[i - 1].line ? LINE_DWELL : DWELL;
    const at: number[] = [u];
    for (let k = 1; k < st.pts.length; k++) {
      u += Math.hypot(st.pts[k][0] - st.pts[k - 1][0], st.pts[k][1] - st.pts[k - 1][1]);
      at.push(u);
    }
    raw.push(at);
  });
  return raw.map((at) => at.map((v) => start + (v / u) * (end - start)));
}

let NAME: { glyphs: Placed[]; strokes: Written[]; width: number; height: number } | null = null;
/** The name: glyphs to fill, contours to trace (timed), block size (cap units). */
export function nameLayout() {
  if (NAME) return NAME;
  const { glyphs, contours, width, height } = layout(NAME_LINES);
  const times = schedule(contours, T.write);
  NAME = { glyphs, strokes: contours.map((c, i) => ({ pts: c.pts, at: times[i], start: times[i][0] })), width, height };
  return NAME;
}

/*
 * The DM mark: a watchmaker's hallmark — D and M in the same capitals inside
 * a fine ring. Units: the mark's radius = 1 (box 0–2). The ring is traced
 * first, then the letters' outlines.
 */
export const MARK_LETTER = 0.5; // the letters' cap height inside the ring
let MARK: { glyphs: Placed[]; strokes: Written[]; ox: number; oy: number } | null = null;
export function markLayout() {
  if (MARK) return MARK;
  const k = MARK_LETTER;
  const w = (GLYPHS.D.adv + 0.06 + GLYPHS.M.adv) * k;
  const ox = 1 - w / 2, oy = 1 - k / 2;
  const ring: Pt[] = [];
  for (let i = 0; i <= 120; i++) {
    const a = -Math.PI / 2 + (i / 120) * Math.PI * 2;
    ring.push([1 + 0.96 * Math.cos(a), 1 + 0.96 * Math.sin(a)]);
  }
  const glyphs: Placed[] = [];
  const contours: { pts: Pt[]; line: number }[] = [{ pts: ring, line: 0 }];
  let x = 0;
  for (const ch of ["D", "M"]) {
    const g = GLYPHS[ch];
    glyphs.push({ d: g.d, x, y: 0 });
    for (const c of g.contours) contours.push({ pts: c.map(([px, py]) => [ox + (px + x) * k, oy + py * k] as Pt), line: 0 });
    x += g.adv + 0.06;
  }
  const times = schedule(contours, T.mark);
  MARK = { glyphs, strokes: contours.map((c, i) => ({ pts: c.pts, at: times[i], start: times[i][0] })), ox, oy };
  return MARK;
}

// ── Where it all sits on the chip (board mm, per board) ───────────────────

export const LID_PAD_X = 3.2; // the lid's side padding (board.css .u1-lid)
export const MARK_D = 4.6; // the mark's diameter (mm)

/** The name block's box on the board (mm) and its cap height. */
export function nameBox(S: Spec) {
  const { width, height } = nameLayout();
  const h = S.NAME.capH;
  return { x: S.U1_BODY.x + LID_PAD_X, y: S.U1_BODY.y + S.NAME.top, w: width * h, h: height * h, capH: h };
}

// ── The pen's position over time (for the light that follows it, and sparks) ─

/** All contours' points in time order: [t, x, y, contour index]. */
export function penTrack(strokes: Written[]) {
  const t: number[] = [], x: number[] = [], y: number[] = [], k: number[] = [];
  strokes.forEach((st, i) =>
    st.pts.forEach((p, j) => {
      t.push(st.at[j]);
      x.push(p[0]);
      y.push(p[1]);
      k.push(i);
    }),
  );
  return { t, x, y, k };
}

/** Where the pen is at time `at`: on a contour, interpolated; between
 *  contours (beam off), already at the next one's start. */
export function penAt(track: ReturnType<typeof penTrack>, at: number): Pt {
  const { t, x, y, k } = track;
  if (at <= t[0]) return [x[0], y[0]];
  if (at >= t[t.length - 1]) return [x[x.length - 1], y[y.length - 1]];
  let lo = 0, hi = t.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid] <= at) lo = mid;
    else hi = mid;
  }
  if (k[lo] !== k[hi]) return [x[hi], y[hi]];
  const u = (at - t[lo]) / (t[hi] - t[lo] || 1);
  return [x[lo] + (x[hi] - x[lo]) * u, y[lo] + (y[hi] - y[lo]) * u];
}
