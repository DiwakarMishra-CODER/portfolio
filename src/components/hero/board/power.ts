// Power-on: when current reaches each part. It enters at the USB port, runs
// the power path into U1, then leaves U1 along every other trace at constant
// speed. Shared by the pulse layer and the parts that light up when it
// arrives (LEDs, displays), so they can't disagree.
import { lengthOf, type Pt } from "./geom";
import { LANDSCAPE, type Spec } from "./spec";
import { PORTRAIT } from "./spec-phone";
import { T } from "../timeline";

const fromChip = (S: Spec, [x, y]: Pt) => Math.hypot(Math.max(S.U1.x - x, 0, x - (S.U1.x + S.U1.w)), Math.max(S.U1.y - y, 0, y - (S.U1.y + S.U1.h)));

/** USB port → regulator → inductor → U1, in order. */
const POWER_PATH = ["PWR.vbus", "PWR.sw", "PWR.3v3"];

export type Pulse = { net: string; pts: Pt[]; width: number; len: number; start: number; dur: number };

function schedule(S: Spec): Pulse[] {
  const out: Pulse[] = [];
  // The power path: one pulse handing on to the next, arriving at U1 at fanOut.
  const path = POWER_PATH.map((n) => S.TRACES.find((t) => t.net === n)!);
  const total = path.reduce((s, t) => s + lengthOf(t.pts), 0);
  const speed = total / (T.fanOut - T.powerOn); // mm per ms
  let t0 = T.powerOn;
  for (const t of path) {
    const len = lengthOf(t.pts);
    out.push({ net: t.net, pts: t.pts, width: t.width, len, start: t0, dur: len / speed });
    t0 += len / speed;
  }
  // Everything else: out of the chip, from each trace's end nearest U1.
  const v = T.pulseSpeed / 1000;
  for (const t of S.TRACES) {
    if (POWER_PATH.includes(t.net)) continue;
    const pts = fromChip(S, t.pts[0]) <= fromChip(S, t.pts[t.pts.length - 1]) ? t.pts : [...t.pts].reverse();
    const len = lengthOf(pts);
    // The power LED sits on the regulator's output: it lights as power arrives there.
    const base = t.net === "PWR.led" ? out[1].start : T.fanOut;
    out.push({ net: t.net, pts, width: t.width, len, start: base + fromChip(S, pts[0]) / v, dur: len / v });
  }
  return out;
}

export const PULSES = { l: schedule(LANDSCAPE), p: schedule(PORTRAIT) };

/** The opening's copper: every trace grows out of the chip at constant speed,
 *  each from its end nearest U1, starting when the front reaches that end. */
function growth(S: Spec): Pulse[] {
  const v = T.copperSpeed / 1000;
  return S.TRACES.map((t) => {
    const pts = fromChip(S, t.pts[0]) <= fromChip(S, t.pts[t.pts.length - 1]) ? t.pts : [...t.pts].reverse();
    const len = lengthOf(pts);
    return { net: t.net, pts, width: t.width, len, start: T.copper + fromChip(S, pts[0]) / v, dur: len / v };
  });
}
export const GROWTH = { l: growth(LANDSCAPE), p: growth(PORTRAIT) };

/** `--atl`/`--atp`: when current reaches the far end of a net on each board
 *  (ms) — for parts that light up when it arrives. */
export const arrivals = (landscape: string[], portrait = landscape) => {
  const when = (list: Pulse[], nets: string[]) => Math.round(Math.max(...nets.map((n) => list.find((q) => q.net === n)).map((p) => (p ? p.start + p.dur : T.fanOut))));
  return { "--atl": `${when(PULSES.l, landscape)}ms`, "--atp": `${when(PULSES.p, portrait)}ms` };
};
