import { LANDSCAPE as L } from "@/components/hero/board/spec";

/*
 * The teardown's beats: one table, turned into CSS (scroll-driven keyframes),
 * the way the hero's timeline.ts drives the opening.
 *
 * Units: a beat's `at` is scroll distance in stage heights (H, one viewport,
 * never under 600px), counted from the top of the page — the Starweave rig
 * starts there, under the hero. Every animated property of every part gets
 * ONE @keyframes covering the whole rig, so beats on the same part never
 * mask each other. Transform + opacity only (individual `translate`, `scale`,
 * `rotate`), plus one registered angle for the module's tilt.
 *
 * Positions are board millimetres in the rig's frame: the same 176 × 104 mm
 * box, at the same place and scale, as the hero's board.
 */

export const T = 2.4; // stuck scroll, in H

/** Where the module comes from: its spot on the hero board. */
export const DS = L.DS1;
/** The FPC as the hero draws it (DisplayModule.tsx), relative to the module. */
const ZIF = L.ZIF1;
export const FPC = { x: ZIF.x + ZIF.w / 2 - 4.6 - DS.x, y: ZIF.y + ZIF.h - DS.y, w: 9.2, h: 1.6 - (ZIF.y + ZIF.h - DS.y) };

/** Where it lands on the mat, then where its pieces end up (the teardown photo). */
export const LAND = { x: 48, y: 30 };
export const GLASS = { x: 2, y: 2, w: DS.w - 4, h: DS.h - 5.2 }; // relative to the module
export const PHOTO = { glass: { x: 4, y: 27 }, board: { x: 92, y: 25 } };
export const DISH = { x: 86, y: 88, r: 5.2 };

/** The four standoff screws (centres, relative to the module) and where each lands in the dish. */
export const SCREWS = [
  [1.0, 1.0, -1.7, -0.9],
  [DS.w - 1.0, 1.0, 1.5, -1.3],
  [1.0, DS.h - 1.6, -0.7, 1.5],
  [DS.w - 1.0, DS.h - 1.6, 1.7, 1.0],
].map(([x, y, ox, oy]) => ({ x, y, dx: DISH.x - LAND.x + ox - x, dy: DISH.y - LAND.y + oy - y }));

// ── The table ───────────────────────────────────────────────────────────

const GLIDE = "var(--ease-glide)";
const LANDING = "var(--ease-land)";
const UP = "cubic-bezier(0.2, 0.6, 0.35, 1)"; // thrown up: fast, slowing at the top
const DOWN = "cubic-bezier(0.6, 0, 0.9, 0.5)"; // falling: slow, then fast

const mm = (v: number) => (v === 0 ? "0px" : `calc(${+v.toFixed(3)} * var(--mm))`);
const xy = (x: number, y: number) => `${mm(x)} ${mm(y)}`;

type Key = [at: number, value: string, ease?: string];
type Track = {
  sel: string;
  prop: string;
  keys: Key[];
  /** The finished layout without motion (fallback); null = leave the property alone. */
  rest?: string | null;
  /** A range of its own (default: the whole rig) and a timing function. */
  range?: string;
  fn?: string;
};

const P = ".rig-sw";
const ds = DS;

function tracks(): Track[] {
  const t: Track[] = [];
  const hero = (sel: string, prop: string, from: string, to: string) =>
    t.push({ sel, prop, keys: [[0, from], [1, to]], rest: null, range: "0px 1px", fn: "steps(1, jump-end)" });

  // 1 · Lift-off. The first scrolled pixel swaps the hero's screen for the
  // copy (identical, in the same place); the board then scrolls away under it.
  hero(`${P} .mc`, "opacity", "0.01", "1");
  hero("#ds1", "opacity", "1", "0.01");
  hero("#ds1", "visibility", "visible", "hidden");
  hero('.fpc[data-ds="ds1"]', "opacity", "1", "0.01");
  t.push({ sel: '.zif[data-ds="ds1"] .zif-latch', prop: "scale", keys: [[0, "1 1"], [0.1, "1 0.35"]], rest: null });
  t.push({ sel: '.zif[data-ds="ds1"] .zif-latch', prop: "translate", keys: [[0, "0 0"], [0.1, `0 ${mm(-0.9)}`]], rest: null });

  t.push({ sel: `${P} .mc-tilt`, prop: "--tilt", keys: [[0, "3.5deg", GLIDE], [0.45, "0deg"]], rest: "0deg" });
  t.push({ sel: `${P} .mc-light`, prop: "opacity", keys: [[0.02, "1"], [0.35, "0"]], rest: "0" });
  t.push({ sel: `${P} .mc-acts`, prop: "opacity", keys: [[0.04, "1"], [0.22, "0"]], rest: "0" });
  // Up off the board (rising toward the lamp, its shadow opening out), across,
  // and down with a hard stop. No zoom: scaling would re-draw the live screen.
  const up = { x: -0.5, y: -1.2 };
  t.push({ sel: `${P} .mc-move`, prop: "translate", keys: [[0, "0px 0px", GLIDE], [0.28, xy(up.x, up.y), GLIDE], [0.8, xy(LAND.x - ds.x + up.x, LAND.y - ds.y + up.y), LANDING], [0.93, xy(LAND.x - ds.x, LAND.y - ds.y)]] });
  t.push({ sel: `${P} .mc-lift`, prop: "opacity", keys: [[0, "0", GLIDE], [0.3, "1"], [0.8, "1", LANDING], [0.93, "0"]] });
  t.push({ sel: `${P} .mc-lift`, prop: "translate", keys: [[0, "0px 0px", GLIDE], [0.3, xy(3.5, 5.5)], [0.8, xy(3.5, 5.5), LANDING], [0.93, "0px 0px"]] });

  // 2 · Set down: the bench comes up around it.
  t.push({ sel: `${P} .rig-lamp`, prop: "opacity", keys: [[0.75, "0"], [1.05, "1"]] });
  t.push({ sel: `${P} .rig-print`, prop: "opacity", keys: [[0.98, "0"], [1.1, "1"]] });
  t.push({ sel: `${P} .rig-print`, prop: "translate", keys: [[0.98, `0 ${mm(1)}`, LANDING], [1.1, "0px 0px"]] });
  t.push({ sel: `${P} .rig-dish`, prop: "opacity", keys: [[1.0, "0"], [1.1, "1"]] });
  t.push({ sel: `${P} .rig-dish`, prop: "scale", keys: [[1.0, "0.9", LANDING], [1.1, "1"]] });
  tape(t, `${P} .tape-rig`, 1.04, 1.2);

  // 3 · Screws out: each backs out (2½ turns, rising toward you), then hops
  // into the dish and lands with a hard stop.
  SCREWS.forEach((s, i) => {
    const a = 1.22 + i * 0.07;
    const top = Math.min(0, s.dy) - 6;
    t.push({ sel: `${P} .mc-sx${i}`, prop: "translate", keys: [[a + 0.08, "0px 0px"], [a + 0.18, xy(s.dx, 0)]] });
    t.push({ sel: `${P} .mc-sy${i}`, prop: "translate", keys: [[a + 0.08, "0px 0px", UP], [a + 0.13, xy(0, top), DOWN], [a + 0.18, xy(0, s.dy)]] });
    t.push({ sel: `${P} .mc-sy${i}`, prop: "scale", keys: [[a, "1", GLIDE], [a + 0.08, "1.7"], [a + 0.14, "1.7", LANDING], [a + 0.18, "1"]] });
    t.push({ sel: `${P} .mc-sr${i}`, prop: "rotate", keys: [[a, "0deg"], [a + 0.08, "-900deg"]] });
  });

  // 4 · The screen comes off its board, a glint crossing the glass, and is
  // set down on the mat — still running.
  const g = { x: PHOTO.glass.x - (LAND.x + GLASS.x), y: PHOTO.glass.y - (LAND.y + GLASS.y) };
  t.push({ sel: `${P} .mc-gw`, prop: "translate", keys: [[1.58, "0px 0px", GLIDE], [1.66, xy(-0.4, -1.4), GLIDE], [1.86, xy(g.x - 0.4, g.y - 1.4), LANDING], [1.94, xy(g.x, g.y)]] });
  t.push({ sel: `${P} .mc-gshadow`, prop: "opacity", keys: [[1.58, "0", GLIDE], [1.66, "1"], [1.86, "1", LANDING], [1.94, "0"]] });
  t.push({ sel: `${P} .mc-gshadow`, prop: "translate", keys: [[1.58, "0px 0px", GLIDE], [1.66, xy(2, 3)], [1.86, xy(2, 3), LANDING], [1.94, "0px 0px"]] });
  t.push({ sel: `${P} .mc-glint`, prop: "translate", keys: [[1.6, "-130% 0"], [1.78, "130% 0"]] });

  // 5 · The board underneath slides clear; labels feed out for every part.
  const b = { x: PHOTO.board.x - LAND.x, y: PHOTO.board.y - LAND.y };
  for (const piece of [".mc-board", ".mc-fpcw"]) t.push({ sel: `${P} ${piece}`, prop: "translate", keys: [[1.8, "0px 0px", GLIDE], [2.0, xy(b.x, b.y)]] });
  tape(t, `${P} .tape-see`, 1.92, 2.04);
  t.push({ sel: `${P} .rig-live`, prop: "opacity", keys: [[2.02, "0"], [2.08, "1"]] });
  t.push({ sel: `${P} .rig-live`, prop: "visibility", keys: [[2.01, "hidden"], [2.02, "visible"]] });
  tape(t, `${P} .tape-knows`, 2.0, 2.12);
  tape(t, `${P} .tape-decides`, 2.06, 2.18);
  t.push({ sel: `${P} .rig-cue`, prop: "opacity", keys: [[2.16, "0"], [2.26, "0.75"]] });
  return t;
}

/** A label-maker tape feeding out of its slot, at constant speed. */
function tape(t: Track[], sel: string, a: number, b: number) {
  t.push({ sel: `${sel} .tape-strip`, prop: "translate", keys: [[a, "101% 0"], [b, "0px 0px"]] });
}

// ── To CSS ──────────────────────────────────────────────────────────────

const pct = (at: number) => `${+((Math.min(T, Math.max(0, at)) / T) * 100).toFixed(3)}%`;

/** Scroll-driven keyframes for the Starweave rig (inside the motion gate),
 *  the start state as the base (so an unresolved timeline never flashes the
 *  finished layout), and the finished layout for everyone else. */
export function rigCss() {
  const all = tracks();
  const by = new Map<string, { names: string[]; ranges: string[]; fns: string[] }>();
  let keyframes = "", base = "", rest = "";
  all.forEach((tr, i) => {
    const name = `rig-${i}`;
    // Hidden parts wait at 1%, not 0: Chrome doesn't draw a fully transparent
    // layer, so it would be drawn late, as it appears (checkerboarding).
    const keys = tr.prop === "opacity" ? tr.keys.map(([at, v, e]): Key => [at, v === "0" ? "0.01" : v, e]) : tr.keys;
    const frames = tr.range
      ? keys.map(([, v], j) => `${j ? "to" : "from"}{${tr.prop}:${v}}`)
      : [
          ...(keys[0][0] > 0 ? [`0%{${tr.prop}:${keys[0][1]}${keys[0][2] ? `;animation-timing-function:${keys[0][2]}` : ""}}`] : []),
          ...keys.map(([at, v, e]) => `${pct(at)}{${tr.prop}:${v}${e ? `;animation-timing-function:${e}` : ""}}`),
          ...(keys[keys.length - 1][0] < T ? [`100%{${tr.prop}:${keys[keys.length - 1][1]}}`] : []),
        ];
    keyframes += `@keyframes ${name}{${frames.join("")}}`;
    const e = by.get(tr.sel) ?? { names: [], ranges: [], fns: [] };
    e.names.push(name);
    e.ranges.push(tr.range ?? `0px calc(${T} * var(--H))`);
    e.fns.push(tr.fn ?? "linear");
    by.set(tr.sel, e);
    if (tr.rest !== null) {
      base += `${tr.sel}{${tr.prop}:${keys[0][1]}}`;
      rest += `${tr.sel}{${tr.prop}:${tr.rest ?? keys[keys.length - 1][1]}}`;
    }
  });
  let rules = "";
  for (const [sel, e] of by) {
    // The shorthand would reset the timeline and range, so longhands only.
    rules += `${sel}{animation-name:${e.names.join(",")};animation-duration:1ms;animation-duration:auto;animation-timing-function:${e.fns.join(",")};animation-fill-mode:both;animation-timeline:scroll(root);animation-range:${e.ranges.join(",")}}`;
  }
  const gate = "@supports (animation-timeline: scroll()) and (animation-range: 0px 1px){@media (prefers-reduced-motion: no-preference) and (min-width: 700px) and (min-height: 600px)";
  return `.rig-sw{--T:${T}}${rest}${gate}{${keyframes}${base}:root:not([data-intro~="play"]){${rules}}}}`;
}
