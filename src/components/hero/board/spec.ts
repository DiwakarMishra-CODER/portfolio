// The board, in millimetres. One source of truth for every part's footprint
// and every net's route, used by the SVG layers (layers.ts) and the HTML parts
// (Board.tsx) alike, so the two can never drift apart.
//
// Landscape board: 176 × 104 mm (the desktop hero). Datasheet sizes:
// 0201 0.6×0.3 · 0603 1.6×0.8 · 1206 3.2×1.6 · SOT-23-6 2.9×1.6 · SOIC-8
// 4.9×3.9 · 6 mm tact switch · USB-C 8.94 wide · 2.54 mm header · M3 hole
// 3.2 in a 6 mm ring · via 0.3/0.6 · signal 0.15 · power 0.6–1.0.
import { bus, type Pt, type Rect, type Trace } from "./geom";

export const BOARD = { w: 176, h: 104, r: 3 };

// ── U1: a fine-pitch quad flat package, legs on all four sides ────────────
// Footprint = the pads' outer edge; the body sits 2.4 mm inside it, and the
// gull-wing legs bridge the gap. Legs sit on a 0.6 mm grid, and every trace
// that meets U1 lands exactly on a leg.
export const U1 = { x: 52, y: 4, w: 72, h: 28, inset: 2.4 };
export const U1_BODY: Rect = { x: U1.x + U1.inset, y: U1.y + U1.inset, w: U1.w - 2 * U1.inset, h: U1.h - 2 * U1.inset };
export const LEG_PITCH = 0.6;
/** Leg centres along each side. */
export const U1_LEGS = {
  x: Array.from({ length: 111 }, (_, k) => +(55.5 + k * LEG_PITCH).toFixed(2)), // top & bottom
  y: Array.from({ length: 39 }, (_, k) => +(6.6 + k * LEG_PITCH).toFixed(2)), // left & right
};

export const DS1: Rect = { x: 4, y: 44, w: 80, h: 43.5 }; // Starweave display module
export const DS2: Rect = { x: 92, y: 44, w: 80, h: 43.5 }; // Arthouse display module
export const ZIF1: Rect = { x: 38, y: 36.8, w: 12, h: 3.4 }; // FPC connectors, centred on the buses
export const ZIF2: Rect = { x: 126, y: 36.8, w: 12, h: 3.4 };
export const FPC_W = 9.2;

// Achievements: each slot is a plain-words label block beside its display.
export const ACH_SLOTS = [
  { id: "cgpa", label: { x: 8, y: 90, w: 13, h: 9 }, display: { x: 21.5, y: 90, w: 17, h: 9 } },
  { id: "leetcode", label: { x: 43.5, y: 90, w: 18.5, h: 9 }, display: { x: 62.5, y: 90, w: 18.5, h: 9 } },
  { id: "grid", label: { x: 95, y: 90, w: 14, h: 9 }, display: { x: 109.5, y: 90, w: 20, h: 9 } },
  { id: "codex", label: { x: 134, y: 90, w: 13.5, h: 9 }, display: { x: 148, y: 90, w: 20, h: 9 } },
];
/** SMD legs along the top and bottom edge of each display (2.54 mm pitch):
 *  as many as fit its width, centred — never past its edge. */
export const displayLegs = (d: Rect) => {
  const n = Math.floor((d.w - 2) / 2.54) + 1;
  const off = (d.w - (n - 1) * 2.54) / 2;
  return Array.from({ length: n }, (_, k) => +(d.x + off + k * 2.54).toFixed(2));
};

// Nav switches (6 mm tact) and the X-ray DIP switch.
export const SWITCHES = [
  { ref: "SW1", label: "Work", href: "#work", x: 7, y: 21.4 },
  { ref: "SW2", label: "About", href: "#about", x: 18, y: 21.4 },
  { ref: "SW3", label: "Contact", href: "#contact", x: 29, y: 21.4 },
  { ref: "SW4", label: "Résumé", href: "/Diwakar-Mishra-Resume.pdf", x: 40, y: 21.4 },
] as const;
export const SW_SIZE = 6;
export const DIP: Rect = { x: 163, y: 10, w: 7.6, h: 5.6 };

// Small and mid-sized parts (the mid-sized ones bridge the scale between
// 1 mm passives and the big modules, as they do on a real board).
export const J1: Rect = { x: -0.7, y: 9, w: 7.35, h: 8.94 }; // USB-C, opening at the board edge
export const U2: Rect = { x: 10, y: 8.6, w: 2.9, h: 1.6 }; // buck regulator (SOT-23-6)
export const L1: Rect = { x: 15, y: 5.2, w: 4, h: 4 }; // shielded inductor
export const C1: Rect = { x: 9.8, y: 12.6, w: 3.2, h: 1.6 }; // bulk caps (1206)
export const C2: Rect = { x: 15.4, y: 12.6, w: 3.2, h: 1.6 };
/** Aluminium electrolytic cans (5 mm), the part everyone recognises. */
export const ELECTROLYTICS = [
  { x: 25, y: 11.4, r: 2.5 },
  { x: 32, y: 11.4, r: 2.5 },
];
export const D1: Rect = { x: 9.6, y: 4.8, w: 1.6, h: 0.8 }; // power LED (0603)
export const U3: Rect = { x: 132, y: 5.2, w: 4.9, h: 3.9 }; // SPI flash (SOIC-8)
export const Y1: Rect = { x: 129.4, y: 14, w: 3.2, h: 2.5 }; // crystal
export const SH1: Rect = { x: 140, y: 15.4, w: 16, h: 7.6 }; // perforated shield can
export const HEADER: Rect = { x: 157.6, y: 22.6, w: 12.7, h: 5.08 }; // 2 × 5 pin header, 2.54 mm
export const LEDS = [
  { ref: "D2", x: 149.2, y: 6.6 },
  { ref: "D3", x: 153.6, y: 6.6 },
  { ref: "D4", x: 158, y: 6.6 },
];
export const TPS = Array.from({ length: 6 }, (_, i) => ({ ref: `TP${i + 1}`, x: 130.2 + i * 4.6, y: 30.6 }));
export const HOLES: Pt[] = [
  [4.5, 4.5],
  [171.5, 4.5],
  [4.5, 99.5],
  [171.5, 99.5],
];
export const FIDUCIALS: Pt[] = [
  [2.6, 40.5],
  [173.4, 40.5],
  [88, 101.8],
];
export const TITLE = { x: 88, y: 90.6 }; // title block, centre of the bottom channel

// ── Nets ───────────────────────────────────────────────────────────────────
// Hand-planned topology; geometry computed (chamfers, bus offsets). Every
// trace ends on a pad, a leg, or a via.

const BUS_PITCH = 0.6;
const SIG = 0.15;

/** Power: USB-C → buck → inductor → the processor. Visibly fatter. */
const POWER: Trace[] = [
  { net: "PWR.vbus", width: 1.0, pts: [[6.6, 13.5], [8.8, 13.5], [8.8, 10.9], [10.6, 10.9]] },
  { net: "PWR.sw", width: 0.8, pts: [[12.3, 8.6], [12.3, 7.2], [15, 7.2]] },
  { net: "PWR.3v3", width: 1.0, pts: [[19, 7.2], [52, 7.2]] },
  { net: "PWR.led", width: 0.25, pts: [[11.2, 5.2], [12.8, 5.2], [12.8, 6.2]] },
  // Power for the displays, run under the big modules — visible above and
  // below them, hidden beneath: they sit on the board, not on top of it.
  { net: "PWR.dispL", width: 0.6, pts: [[5.4, 20.4], [5.4, 94.5], [21.5, 94.5]] },
  { net: "PWR.dispR", width: 0.6, pts: [[170.6, 34.4], [170.6, 94.5], [167, 94.5]] },
];

/** Each nav switch to U1's left legs, in lanes that never cross. */
const SWITCH_NETS: Trace[] = SWITCHES.map((s, i) => {
  const pin = s.x + SW_SIZE - 0.6;
  const lane = 15.0 + i * 1.2; // SW1 (leftmost) takes the top lane; all on the leg grid
  return { net: `SW.${s.ref}`, width: SIG, pts: [[pin, s.y + 0.1], [pin, lane], [52, lane]] as Pt[] };
});

/** U1 → ZIF buses: down from the legs, across a series-resistor column, into
 *  the connector. An 8-line bus is 4.2 mm wide, so its horizontal run fills
 *  the band between U1's legs (32) and the connector's top (36.8). */
const ZIF1_BUS = bus([[60, 32], [60, 33.2], [58.8, 34.4], [45.2, 34.4], [44, 35.6], [44, 37.4]], 8, BUS_PITCH).map((pts, i) => ({ net: `DS1.b${i}`, width: SIG, pts }));
const ZIF2_BUS = bus([[116.4, 32], [116.4, 33.2], [117.6, 34.4], [130.8, 34.4], [132, 35.6], [132, 37.4]], 8, BUS_PITCH).map((pts, i) => ({ net: `DS2.b${i}`, width: SIG, pts }));

/** The display bus: straight down the channel between the two modules, then
 *  split along the gap above the achievement displays, each line landing on a
 *  display leg. Lines that travel farthest take the higher lanes. */
const DISP_X = Array.from({ length: 8 }, (_, i) => +(85.5 + i * BUS_PITCH).toFixed(2));
const [L0, L1d, L2, L3] = ACH_SLOTS.map((s) => displayLegs(s.display));
const DISP_TARGETS = [
  { lane: 88.0, x: L0[0] }, // → CGPA (top lane travels farthest)
  { lane: 88.5, x: L0[1] },
  { lane: 89.0, x: L1d[0] }, // → LeetCode
  { lane: 89.5, x: L1d[1] },
  { lane: 89.5, x: L2[0] }, // → GRiD
  { lane: 89.0, x: L2[1] },
  { lane: 88.5, x: L3[0] }, // → CodeX
  { lane: 88.0, x: L3[1] },
];
const DISPLAY_BUS: Trace[] = DISP_X.map((x, i) => {
  const t = DISP_TARGETS[i];
  return { net: `DSP.b${i}`, width: SIG, pts: [[x, 32], [x, t.lane], [t.x, t.lane], [t.x, 90]] as Pt[] };
});

/** Right side: flash, crystal, status LEDs, the X-ray switch, test points,
 *  the header. Leaving U1 on its leg grid, jogging to each part's own pitch. */
const FLASH = [5.67, 6.94, 8.21, 9.48];
const RIGHT: Trace[] = [
  ...FLASH.map((yf, i) => {
    const yl = 6.6 + i * 1.2;
    const jog = yl - yf;
    return { net: `U3.p${i}`, width: SIG, pts: [[124, yl], [127.2, yl], [127.2 + jog, yf], [131.1, yf]] as Pt[] };
  }),
  { net: "Y1.a", width: SIG, pts: [[124, 15.0], [129.4, 15.0]] },
  { net: "Y1.b", width: SIG, pts: [[124, 17.4], [133.6, 17.4], [133.6, 15.25], [132.6, 15.25]] },
  ...LEDS.map((l, i) => ({ net: `LED.${l.ref}`, width: SIG, pts: [[124, 11.4 + i * 0.6], [l.x + 0.8, 11.4 + i * 0.6], [l.x + 0.8, 7.8]] as Pt[] })),
  { net: "DIP.xray", width: SIG, pts: [[124, 13.2], [163, 13.2]] },
  { net: "HDR.p1", width: SIG, pts: [[124, 23.4], [HEADER.x + 1.27, 23.4]] },
  ...TPS.map((tp, i) => {
    const lane = 24.6 + (5 - i) * 0.6; // farthest test point takes the top lane
    return { net: `TP.${tp.ref}`, width: SIG, pts: [[124, lane], [tp.x, lane], [tp.x, tp.y - 0.6]] as Pt[] };
  }),
];

export const TRACES: Trace[] = [...POWER, ...SWITCH_NETS, ...ZIF1_BUS, ...ZIF2_BUS, ...DISPLAY_BUS, ...RIGHT];

/** Parts traces must not cross (unless they terminate there, or — for the
 *  display power — run under the big modules, as real boards route). */
export const KEEPOUTS: (Rect & { id: string; nets?: string[] })[] = [
  { id: "U1", ...U1, nets: ["PWR.3v3", "SW", "DS1", "DS2", "DSP", "U3", "Y1", "LED", "DIP", "TP", "HDR"] },
  { id: "DS1", ...DS1, nets: ["PWR.dispL"] },
  { id: "DS2", ...DS2, nets: ["PWR.dispR"] },
  { id: "SH1", ...SH1 },
  { id: "HEADER", ...HEADER, nets: ["HDR"] },
  { id: "U3", ...U3, nets: ["U3"] },
  { id: "L1", ...L1, nets: ["PWR"] },
  { id: "ZIF1", ...ZIF1, nets: ["DS1"] },
  { id: "ZIF2", ...ZIF2, nets: ["DS2"] },
  ...ELECTROLYTICS.map((e, i) => ({ id: `EC${i + 1}`, x: e.x - e.r, y: e.y - e.r, w: 2 * e.r, h: 2 * e.r })),
  ...ACH_SLOTS.map((s) => ({ id: s.id, ...s.display, nets: ["DSP", "PWR.disp"] })),
  ...SWITCHES.map((s) => ({ id: s.ref, x: s.x, y: s.y, w: SW_SIZE, h: SW_SIZE, nets: [`SW.${s.ref}`] })),
];

/** Series resistors: a neat column of 0201s across each ZIF bus. */
export const SERIES_R: [number, number, boolean][] = [
  ...bus([[53, 34.4], [50, 34.4]], 8, BUS_PITCH).map((l): [number, number, boolean] => [l[0][0], l[0][1], true]),
  ...bus([[123, 34.4], [126, 34.4]], 8, BUS_PITCH).map((l): [number, number, boolean] => [l[0][0], l[0][1], true]),
];

/** Decoupling ring outside U1's legs: 0201 caps on every free stretch, each
 *  with a dogbone via. [x, y, horizontal?] */
export function decouplers(): [number, number, boolean][] {
  const out: [number, number, boolean][] = [];
  for (let x = 55; x <= 121; x += 2.2) out.push([x, 2.3, false]);
  for (let y = 5; y <= 30; y += 2.4) {
    if (!(y > 6 && y < 8.6) && !(y > 14.2 && y < 19.4)) out.push([50.5, y, true]);
    if (!(y > 4.8 && y < 18.2) && !(y > 22.6 && y < 28.4)) out.push([125.5, y, true]);
  }
  // Bottom edge: only between the three buses leaving the package.
  for (let x = 55; x <= 121; x += 2.2) {
    if ((x > 64 && x < 84) || (x > 91.6 && x < 112)) out.push([x, 33.4, false]);
  }
  return out;
}

/** Part groups placed together during the opening (pick-and-place), each
 *  served as its own image cropped to this rect (mm; generous, so contact
 *  shadows fit). */
export const PART_GROUPS = {
  u1: { x: 51, y: 3, w: 74, h: 30 }, // U1's legs (on the board from the first frame)
  ring: { x: 48.5, y: 0.8, w: 79, h: 38.2 }, // decoupling ring + series resistors
  power: { x: -1, y: 3.6, w: 38, h: 16 }, // USB-C, regulator, inductor, caps, cans
  right: { x: 128, y: 4, w: 43.5, h: 25 }, // flash, crystal, shield can, LEDs, header
  conn: { x: 35, y: 37.4, w: 106, h: 2.6 }, // ESD diodes beside the cable connectors
  disp: { x: 20.5, y: 88.6, w: 147, h: 12 }, // the achievement displays' legs
} satisfies Record<string, Rect>;
export type PartGroup = keyof typeof PART_GROUPS;

// ── The whole layout as one object, so the layers and parts can be drawn for
//    either board (landscape here, portrait in spec-phone.ts). ─────────────

export type Spec = {
  BOARD: { w: number; h: number; r: number };
  U1: Rect & { inset: number };
  U1_BODY: Rect;
  U1_LEGS: { x: number[]; y: number[] };
  DS1: Rect;
  DS2: Rect;
  ZIF1: Rect;
  ZIF2: Rect;
  FPC_W: number;
  ACH_SLOTS: { id: string; label: Rect; display: Rect }[];
  displayLegs: (d: Rect) => number[];
  SWITCHES: readonly { ref: string; label: string; href: string; x: number; y: number }[];
  SW_SIZE: number;
  DIP: Rect;
  J1: Rect;
  /** USB-C turned 90°, opening at the top edge (portrait board). */
  J1_ROT: boolean;
  U2: Rect;
  L1: Rect;
  C1: Rect;
  C2: Rect;
  D1: Rect;
  ELECTROLYTICS: { x: number; y: number; r: number }[];
  U3?: Rect;
  Y1?: Rect;
  SH1?: Rect;
  HEADER?: Rect;
  LEDS: { ref: string; x: number; y: number }[];
  TPS: { ref: string; x: number; y: number }[];
  HOLES: Pt[];
  FIDUCIALS: Pt[];
  TRACES: Trace[];
  KEEPOUTS: (Rect & { id: string; nets?: string[] })[];
  SERIES_R: [number, number, boolean][];
  decouplers: () => [number, number, boolean][];
  PART_GROUPS: Record<PartGroup, Rect>;
  /** Vias where the display power drops in from the other layer. */
  POWER_VIAS: Pt[];
  /** The one line of fine print: whose board, which build. */
  TITLE_LINE: { x: number; y: number; anchor: "start" | "middle" | "end" };
  CAPTIONS: { menu: Rect; note: Rect };
  /** ESD diodes beside the USB port and each cable connector. */
  ESD: Pt[];
  /** Areas the edge stitching vias keep out of (besides parts and traces). */
  VIA_BLOCKS: Rect[];
  /** The engraved name: cap height and its top inside the chip's lid (mm). */
  NAME: { capH: number; top: number };
};

export const LANDSCAPE: Spec = {
  BOARD, U1, U1_BODY, U1_LEGS, DS1, DS2, ZIF1, ZIF2, FPC_W, ACH_SLOTS, displayLegs, SWITCHES, SW_SIZE, DIP,
  J1, J1_ROT: false, U2, L1, C1, C2, D1, ELECTROLYTICS, U3, Y1, SH1, HEADER, LEDS, TPS, HOLES, FIDUCIALS,
  TRACES, KEEPOUTS, SERIES_R, decouplers, PART_GROUPS,
  POWER_VIAS: [[5.4, 20.4], [170.6, 34.4]],
  TITLE_LINE: { x: 170.6, y: 34.2, anchor: "end" },
  CAPTIONS: { menu: { x: 7, y: 18.4, w: 34, h: 2.2 }, note: { x: 7, y: 31.1, w: 40, h: 4.4 } },
  ESD: [[ZIF1.x - 2.2, ZIF1.y + 1.2], [ZIF2.x + ZIF2.w + 1.4, ZIF2.y + 1.2], [J1.x + J1.w + 1.6, J1.y + J1.h - 1.6]],
  VIA_BLOCKS: [],
  NAME: { capH: 5.9, top: 0.7 },
};
