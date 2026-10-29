// The portrait board (phones): the same parts as the landscape one, restacked
// into a 64 mm-wide board you scroll down — name chip and menu first, then the
// two screens, then the achievements. Same rules as spec.ts: datasheet sizes,
// a 0.6 mm leg grid on U1, every trace ending on a pad, a leg or a via, and the
// design-rule check run on it in development.
import { bus, type Pt, type Rect, type Trace } from "./geom";
import type { Spec } from "./spec";

const BOARD = { w: 64, h: 232, r: 3 };

const U1 = { x: 4, y: 16.4, w: 56, h: 31.2, inset: 2.4 };
const U1_BODY: Rect = { x: U1.x + U1.inset, y: U1.y + U1.inset, w: U1.w - 2 * U1.inset, h: U1.h - 2 * U1.inset };
const U1_LEGS = {
  x: Array.from({ length: 84 }, (_, k) => +(7.3 + k * 0.6).toFixed(2)), // top & bottom
  y: Array.from({ length: 42 }, (_, k) => +(19.9 + k * 0.6).toFixed(2)), // left & right
};
const U1_BOTTOM = U1.y + U1.h;

const DS1: Rect = { x: 4, y: 78, w: 56, h: 40 };
const DS2: Rect = { x: 4, y: 127, w: 56, h: 40 };
const ZIF1: Rect = { x: 25.6, y: 72.6, w: 12, h: 3.4 };
const ZIF2: Rect = { x: 25.6, y: 121.6, w: 12, h: 3.4 };

// Achievements, two by two: plain-words label above each display.
const ACH_SLOTS = [
  { id: "cgpa", label: { x: 5, y: 170.6, w: 26, h: 12.6 }, display: { x: 5, y: 184.4, w: 26, h: 9 } },
  { id: "leetcode", label: { x: 33, y: 170.6, w: 26, h: 12.6 }, display: { x: 33, y: 184.4, w: 26, h: 9 } },
  { id: "grid", label: { x: 5, y: 196.2, w: 26, h: 12.6 }, display: { x: 5, y: 210, w: 26, h: 9 } },
  { id: "codex", label: { x: 33, y: 196.2, w: 26, h: 12.6 }, display: { x: 33, y: 210, w: 26, h: 9 } },
];
/** Nine legs per edge (2.54 mm pitch), centred on the wider phone displays. */
const displayLegs = (d: Rect) => Array.from({ length: 9 }, (_, k) => +(d.x + (d.w - 8 * 2.54) / 2 + k * 2.54).toFixed(2));
const LAST_LEG = (d: Rect) => displayLegs(d)[8];

// Menu: four 7.5 mm switches (a thumb-sized target).
const SW_SIZE = 7.5;
const SWITCHES = [
  { ref: "SW1", label: "Work", href: "#work", x: 6.25, y: 53 },
  { ref: "SW2", label: "About", href: "#about", x: 21.25, y: 53 },
  { ref: "SW3", label: "Contact", href: "#contact", x: 35.25, y: 53 },
  { ref: "SW4", label: "Résumé", href: "/Diwakar-Mishra-Resume.pdf", x: 50.25, y: 53 },
] as const;
const SW_PINS = [13.3, 28.3, 42.1, 57.1]; // each on a U1 leg, inside the switch's pad

// Top strip: USB-C at the top edge, the power stage, status LEDs, X-ray switch.
const J1: Rect = { x: 27.53, y: -0.7, w: 8.94, h: 7.35 };
const C1: Rect = { x: 9.4, y: 2.6, w: 3.2, h: 1.6 };
const C2: Rect = { x: 14.4, y: 2.6, w: 3.2, h: 1.6 };
const D1: Rect = { x: 20.4, y: 3.0, w: 1.6, h: 0.8 };
const L1: Rect = { x: 17.6, y: 7.6, w: 4, h: 4 };
const U2: Rect = { x: 23.0, y: 9.4, w: 2.9, h: 1.6 };
const ELECTROLYTICS = [
  { x: 6.2, y: 11.4, r: 2.5 },
  { x: 12.4, y: 11.4, r: 2.5 },
];
const LEDS = [
  { ref: "D2", x: 38.85, y: 3.2 },
  { ref: "D3", x: 43.05, y: 3.2 },
  { ref: "D4", x: 47.25, y: 3.2 },
];
const DIP: Rect = { x: 52.8, y: 8.8, w: 7.6, h: 5.6 };

const HOLES: Pt[] = [
  [4.5, 4.5],
  [59.5, 4.5],
  [4.5, 227.5],
  [59.5, 227.5],
];
const FIDUCIALS: Pt[] = [
  [14, 228.3],
  [50, 228.3],
  [32, 224.6],
];

// ── Nets ───────────────────────────────────────────────────────────────────
const SIG = 0.15;

const POWER: Trace[] = [
  { net: "PWR.vbus", width: 1.0, pts: [[30.4, 6.6], [30.4, 11.4], [25.45, 11.4]] },
  { net: "PWR.sw", width: 0.8, pts: [[23.55, 9.0], [21.3, 9.0]] },
  { net: "PWR.3v3", width: 1.0, pts: [[17.9, 9.6], [16.3, 9.6], [16.3, U1.y]] },
  { net: "PWR.led", width: 0.25, pts: [[21.85, 3.4], [25.45, 3.4], [25.45, 8.65]] },
  // Display power down each edge, outside the screens.
  { net: "PWR.dispL", width: 0.6, pts: [[1.2, 17.0], [1.2, 214.5], [5, 214.5]] },
  { net: "PWR.dispR", width: 0.6, pts: [[63.3, 50.0], [63.3, 214.5], [59, 214.5]] },
];

const SWITCH_NETS: Trace[] = SWITCHES.map((s, i) => ({ net: `SW.${s.ref}`, width: SIG, pts: [[SW_PINS[i], s.y + 1.2], [SW_PINS[i], U1_BOTTOM]] as Pt[] }));

/** U1 → DS1: straight down between the second and third switches. */
const ZIF1_BUS: Trace[] = Array.from({ length: 8 }, (_, i) => {
  const x = +(29.5 + i * 0.6).toFixed(2);
  return { net: `DS1.b${i}`, width: SIG, pts: [[x, U1_BOTTOM], [x, ZIF1.y + 0.6]] as Pt[] };
});

/** U1 → DS2: four lines down the right edge, past the first screen. */
const ZIF2_BUS: Trace[] = bus(
  [[60, 42.4], [60.6, 42.4], [61.7, 43.5], [61.7, 118.8], [60.6, 119.9], [32.7, 119.9], [31.6, 121.0], [31.6, ZIF2.y + 0.6]],
  4,
  0.6,
).map((pts, i) => ({ net: `DS2.b${i}`, width: SIG, pts }));

/** U1 → the four displays: four lines down the left edge; the line that
 *  travels farthest takes the higher lane, so none cross. Each lands on its
 *  display's last top leg. */
const [CGPA, LEET, GRID, CODEX] = ACH_SLOTS.map((s) => s.display);
const DISPLAY_BUS: Trace[] = [
  { x: 1.8, leg: 41.5, lane: 195.6, d: GRID, id: "grid" },
  { x: 2.4, leg: 42.1, lane: 195.0, d: CODEX, id: "codex" },
  { x: 3.0, leg: 42.7, lane: 169.5, d: CGPA, id: "cgpa" },
  { x: 3.6, leg: 43.3, lane: 168.9, d: LEET, id: "leetcode" },
].map((l) => ({ net: `DSP.${l.id}`, width: SIG, pts: [[U1.x, l.leg], [l.x, l.leg], [l.x, l.lane], [LAST_LEG(l.d), l.lane], [LAST_LEG(l.d), l.d.y - 0.6]] as Pt[] }));

const RIGHT: Trace[] = [
  ...LEDS.map((l) => ({ net: `LED.${l.ref}`, width: SIG, pts: [[l.x + 1.45, U1.y], [l.x + 1.45, l.y + 0.4]] as Pt[] })),
  { net: "DIP.xray", width: SIG, pts: [[56.5, U1.y], [56.5, DIP.y + DIP.h]] },
];

const TRACES: Trace[] = [...POWER, ...SWITCH_NETS, ...ZIF1_BUS, ...ZIF2_BUS, ...DISPLAY_BUS, ...RIGHT];

const KEEPOUTS: Spec["KEEPOUTS"] = [
  { id: "U1", ...U1, nets: ["PWR.3v3", "SW", "DS1", "DS2", "DSP", "LED", "DIP"] },
  { id: "DS1", ...DS1 },
  { id: "DS2", ...DS2 },
  { id: "J1", ...J1, nets: ["PWR.vbus"] },
  { id: "L1", ...L1, nets: ["PWR"] },
  { id: "DIP", ...DIP, nets: ["DIP"] },
  { id: "ZIF1", ...ZIF1, nets: ["DS1"] },
  { id: "ZIF2", ...ZIF2, nets: ["DS2"] },
  ...ELECTROLYTICS.map((e, i) => ({ id: `EC${i + 1}`, x: e.x - e.r, y: e.y - e.r, w: 2 * e.r, h: 2 * e.r })),
  ...ACH_SLOTS.map((s) => ({ id: s.id, ...s.display, nets: ["DSP", "PWR.disp"] })),
  ...SWITCHES.map((s) => ({ id: s.ref, x: s.x, y: s.y, w: SW_SIZE, h: SW_SIZE, nets: [`SW.${s.ref}`] })),
];

/** Series resistors: one 0201 on each line of the DS1 bus, above its connector. */
const SERIES_R: [number, number, boolean][] = ZIF1_BUS.map((t) => [t.pts[0][0], 70.4, false]);

/** Distance from a point to the nearest trace's edge. */
function traceGap([x, y]: Pt) {
  let best = Infinity;
  for (const t of TRACES) {
    for (let i = 1; i < t.pts.length; i++) {
      const [ax, ay] = t.pts[i - 1], [bx, by] = t.pts[i];
      const vx = bx - ax, vy = by - ay;
      const k = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
      best = Math.min(best, Math.hypot(x - ax - k * vx, y - ay - k * vy) - t.width / 2);
    }
  }
  return best;
}
const inRect = ([x, y]: Pt, r: Rect, m: number) => x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m;

/** Decoupling ring outside U1's legs, on every stretch no trace or part needs. */
function decouplers(): [number, number, boolean][] {
  const out: [number, number, boolean][] = [];
  const cans = ELECTROLYTICS.map((e) => ({ x: e.x - e.r - 0.5, y: e.y - e.r - 1.0, w: 2 * e.r + 1.0, h: 2 * e.r + 2.6 }));
  const free = (p: Pt) => traceGap(p) > 0.5 && !cans.some((c) => inRect(p, c, 0.3)) && !inRect(p, L1, 0.5);
  for (let x = 8.2; x <= 56; x += 2.2) {
    if (free([x, U1.y - 1.7])) out.push([+x.toFixed(2), U1.y - 1.7, false]);
    if (free([x, U1_BOTTOM + 1.7])) out.push([+x.toFixed(2), U1_BOTTOM + 1.7, false]);
  }
  for (let y = 20; y <= 40; y += 2.4) {
    if (free([2.3, y])) out.push([2.3, +y.toFixed(2), true]);
    if (free([61.7, y])) out.push([61.7, +y.toFixed(2), true]);
  }
  return out;
}

export const PORTRAIT: Spec = {
  BOARD, U1, U1_BODY, U1_LEGS, DS1, DS2, ZIF1, ZIF2, FPC_W: 9.2, ACH_SLOTS, displayLegs, SWITCHES, SW_SIZE, DIP,
  J1, J1_ROT: true, U2, L1, C1, C2, D1, ELECTROLYTICS, LEDS, TPS: [], HOLES, FIDUCIALS,
  TRACES, KEEPOUTS, SERIES_R, decouplers,
  PART_GROUPS: {
    u1: { x: 3, y: 15.4, w: 58, h: 33.2 },
    ring: { x: 0.8, y: 13.4, w: 62.4, h: 58.2 },
    power: { x: -0.5, y: 0.2, w: 39.5, h: 15.4 },
    right: { x: 37.8, y: 2.2, w: 13, h: 3.4 },
    conn: { x: 22.5, y: 73, w: 18.5, h: 51.6 },
    disp: { x: 4.5, y: 182.6, w: 55.5, h: 39 },
  },
  POWER_VIAS: [[1.2, 17.0], [63.3, 50.0]],
  TITLE_LINE: { x: 32, y: 230.4, anchor: "middle" },
  CAPTIONS: { menu: { x: 4.2, y: 50.2, w: 50, h: 2.4 }, note: { x: 4.2, y: 64.8, w: 56, h: 5.4 } },
  ESD: [[ZIF1.x - 2.2, ZIF1.y + 1.2], [ZIF2.x + ZIF2.w + 1.4, ZIF2.y + 1.2], [37.2, 7.4]],
  VIA_BLOCKS: [{ x: 16, y: 229, w: 32, h: 3 }],
  NAME: { capH: 5.0, top: 1.4 },
};
