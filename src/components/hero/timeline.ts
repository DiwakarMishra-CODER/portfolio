// The opening sequence, in one table (ms from the moment the page's CSS
// animations start). CSS reads the beats as custom properties set on .hb (see
// Board.tsx), per-part delays are computed from them in the components, and
// the canvases read the same numbers through clock.ts. Move a beat here and
// everything that depends on it moves with it.
//
//   0      black; a white-hot point ignites on the chip
//   0      a red guide light frames the name; 300 the beam cuts it: outlines, then the fill
//   1060   the small lines and the DM mark; then the name holds a beat
//   1350   the chip (held up to the camera for its marking) comes down onto
//          the board, cooling to grey as it seats; the studio lamp comes up;
//          copper grows out of the chip to wherever each part will sit
//   2000   the green solder mask floods outward from the chip; labels print
//   2400   pick-and-place: parts drop in, the big screen modules last
//   3350   reflow: a warm glint, every joint flashes
//   3900   a held beat, then the USB cable goes in: a glide, resistance, a click
//   4250   power on, at the click: the power light snaps on, a flash across the
//          port, current runs in from it, fans out from the chip, the screens
//          and displays boot
//   5250   every button you can press is picked out in turn: a ring locks on
//   6500   "Scroll to take it apart"

export const T = {
  // The hook: the name, laser-marked.
  curtain: [0, 420], // black lifts as the laser's own light comes up
  guide: [0, 320], // the laser's red guide light frames the job
  write: [300, 1000], // the beam traces every letter's outline (name/glyphs.ts)…
  fill: [900, 1220], // …then rasters the fill, sweeping down the name
  small1: [1080, 1200], // the two small lines, a finer pass
  small2: [1150, 1290],
  mark: [1210, 1330], // the DM hallmark
  // The hand-off: held a beat, then the chip comes down and cools as it seats.
  land: [1350, 2250], // the marked chip comes down onto its footprint
  emberOut: [1850, 2250], // …the ember fading to the frosted engraving
  nameIn: [1800, 2200],
  // The reveal.
  camera: [1350, 2800], // the board settles back a touch (a small zoom: cheap to draw)
  dark: [1350, 2450], // the studio lamp comes up
  copper: 1750, // traces start growing out of the chip…
  copperSpeed: 150, // …at this many mm per second
  flood: [2100, 2670],
  silk: [2550, 2850], // the white labels print, left to right
  // Pick-and-place, in order.
  ring: 2500,
  power: 2580,
  right: 2660,
  conn: 2720,
  switches: 2750, // + 45 ms each
  dip: 2850,
  displays: 2880, // + 60 ms each
  screws: 2990,
  zif: 3040,
  ds1: 3090,
  ds2: 3190,
  fpc: 3280,
  latch: 3380,
  drop: 280, // how long one part takes to seat
  reflow: [3450, 3770],
  plug: [3900, 4250], // a held beat after the glint, then the cable goes in: glide, resistance, click
  // The climax.
  powerOn: 4250, // at the click: a spark at the USB port; current runs to the chip
  fanOut: 4530, // current leaves the chip along every trace…
  pulseSpeed: 260, // …at this many mm per second
  lampDim: [4480, 5730], // the room dims while the screens come up, then recovers
  boot1: 4630, // Starweave's screen
  boot2: 4750, // Arthouse's screen
  hint: 5250, // every button, in reading order: a ring closes in and locks on…
  hintStep: 170, // …this far apart
  cue: 6500,
  end: 7550, // everything settled (screens included)
} as const;

/** A slow arrival plays only the power-on: every beat shifts this much
 *  earlier, so the earlier ones are already complete at the first frame. */
export const SHORT_SHIFT = T.powerOn - 300;

/** CSS custom properties for the timeline, for the hero's root element. */
export function timelineVars(): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, val] of Object.entries(T)) {
    if (Array.isArray(val)) {
      v[`--t-${k}`] = `${val[0]}ms`;
      v[`--d-${k}`] = `${val[1] - val[0]}ms`;
    } else if (!k.endsWith("Speed")) {
      v[`--t-${k}`] = `${val}ms`;
    }
  }
  v["--t-short"] = `${SHORT_SHIFT}ms`;
  return v;
}

/** `--at` for one part: its own start time, in ms. */
export const at = (ms: number) => ({ "--at": `${Math.round(ms)}ms` });
