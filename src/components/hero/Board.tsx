import type { CSSProperties } from "react";
import "./board.css";
import "./intro.css";
import "./screens/screens.css";
import { LANDSCAPE as L, type PartGroup, type Spec } from "./board/spec";
import { PORTRAIT as P } from "./board/spec-phone";
import { arrivals } from "./board/power";
import { cableBox } from "./board/layers";
import Chip from "./parts/Chip";
import BoardFx from "./parts/BoardFx";
import DisplayModule from "./parts/DisplayModule";
import Displays from "./parts/Displays";
import Switches from "./parts/Switches";
import DipSwitch from "./parts/DipSwitch";
import { place } from "./parts/place";
import MaskToggle from "./parts/MaskToggle";
import BoardController from "./BoardController";
import StarweavePanel from "./screens/StarweavePanel";
import ArthousePanel from "./screens/ArthousePanel";
import { T, at, timelineVars } from "./timeline";
import { nameBox, nameLayout, penAt, penTrack } from "./name/glyphs";

/*
 * The hero: one circuit board. Static layers (mask, traces, pads, silkscreen,
 * small parts) are SVG images from /board/*; the parts a visitor reads or
 * touches are HTML, placed on the same millimetre grid. Two boards share the
 * parts: landscape (desktop) and portrait (phones, spec-phone.ts) — every
 * image has a phone version, every part both coordinates (board.css picks).
 *
 * The opening (intro.css) builds it in front of you: the name is laser-marked
 * on the chip in the dark, the camera pulls back, copper grows out of the
 * chip, the mask floods, the parts are placed and soldered, and it powers on.
 * Without JS, or with reduced motion, the finished board is simply there.
 */

const PHONE = "(max-width: 699px)";

/** The close-up and the laser's moving light, per board — both follow the
 *  name, so both come from the spec.
 *
 *  Geometry: N is the name's centre, the zoom origin for both the board's
 *  small settle (CAM) and the chip's close-up (MAC[layout], its screen
 *  scale). The chip group is moved so N lands at the screen centre B (the
 *  board's centre on desktop; the viewport's on phones, where the board is
 *  taller than the screen). The darkness lives in board space (under the
 *  settle only), so its light pool follows the beam's on-screen position:
 *  q = N + (B − N + MAC·(p − N)) / CAM. */
const CAM = 1.06;
const MAC = { l: 2.5, p: 1.5 };
function introCss() {
  const end = T.write[1] + 250;
  const mm = (v: number) => `${v.toFixed(3)} * var(--mm)`;
  const track = penTrack(nameLayout().strokes);
  const layout = (S: Spec, k: number, phone: boolean) => {
    const box = nameBox(S);
    // The close-up frames the chip's whole face on desktop (the name and the
    // DM mark both in shot); on phones it's narrower, so it frames the name.
    const [nx, ny] = [phone ? box.x + box.w / 2 : S.U1_BODY.x + S.U1_BODY.w / 2, box.y + box.h / 2];
    const bx = S.BOARD.w / 2;
    // B − N, as CSS lengths (phones: from the viewport's centre).
    const dx = `(${mm(bx - nx)})`;
    const dy = phone ? `(50svh - 12px - ${mm(ny)})` : `(${mm(S.BOARD.h / 2 - ny)})`;
    const q = (px: number, py: number) => `translate:calc(${mm(nx)} + (${dx} + ${mm(k * (px - nx))}) / ${CAM}) calc(${mm(ny)} + (${dy} + ${mm(k * (py - ny))}) / ${CAM})`;
    // The light follows the pen: a keyframe every 40 ms while it writes.
    const kf: [number, number, number][] = [];
    for (let t = 0; t <= T.write[1]; t += 40) {
      const [px, py] = penAt(track, t);
      kf.push([t, box.x + px * box.capH, box.y + py * box.capH]);
    }
    kf.push([end, nx, ny]);
    const name = phone ? "hb-window-p" : "hb-window";
    return {
      keyframes: `@keyframes ${name}{${kf.map(([t, x, y]) => `${((t / end) * 100).toFixed(2)}%{${q(x, y)}}`).join("")}}`,
      vars: `--name-h:${S.NAME.capH};--name-top:${S.NAME.top};--cam-ox:calc(${mm(nx)});--cam-oy:calc(${mm(ny)});--cam:${CAM};--mac-k:${k};--mac-s:${(k / CAM).toFixed(4)};--mac-tx:calc(${dx} / ${CAM});--mac-ty:calc(${dy} / ${CAM});--win-k:${(k / CAM).toFixed(3)};`,
    };
  };
  const l = layout(L, MAC.l, false), p = layout(P, MAC.p, true);
  return (
    l.keyframes +
    p.keyframes +
    `.hb{--d-window:${end}ms}.hb-camera{${l.vars}}` +
    `@media ${PHONE}{.hb-camera{${p.vars}}:root[data-intro~="play"] .hb-dark{animation-name:hb-window-p,fade-out}}`
  );
}

const GROUPS: [PartGroup, number][] = [
  ["ring", T.ring],
  ["power", T.power],
  ["right", T.right],
  ["conn", T.conn],
  ["disp", T.displays - 40],
];

/** A static layer with its phone version. */
function Layer({ src, className, style }: { src: string; className: string; style?: CSSProperties }) {
  return (
    <picture>
      <source media={PHONE} srcSet={`/board/${src}-p.svg`} />
      <img className={className} src={`/board/${src}.svg`} alt="" style={style} />
    </picture>
  );
}

const box = (b: { x: number; y: number; w: number; h: number }, k: string) => ({ [`--cx${k}`]: b.x, [`--cy${k}`]: b.y, [`--cw${k}`]: b.w, [`--ch${k}`]: b.h });
const cableVars = { ...box(cableBox(L), "l"), ...box(cableBox(P), "p") } as CSSProperties;

export default function Board() {
  const leds = [
    { l: { x: L.D1.x + L.D1.w / 2, y: L.D1.y + L.D1.h / 2 }, p: { x: P.D1.x + P.D1.w / 2, y: P.D1.y + P.D1.h / 2 }, net: "PWR.led" },
    ...L.LEDS.map((d, i) => ({ l: { x: d.x + 0.8, y: d.y + 0.4 }, p: { x: P.LEDS[i].x + 0.8, y: P.LEDS[i].y + 0.4 }, net: `LED.${d.ref}` })),
  ];
  const glow = (c: { x: number; y: number }) => ({ x: c.x - 2.2, y: c.y - 2.2, w: 4.4, h: 4.4 });
  const spark = (S: Spec) => (S.J1_ROT ? { x: S.J1.x + S.J1.w / 2 - 4, y: S.J1.y - 3, w: 8, h: 8 } : { x: S.J1.x - 3, y: S.J1.y + S.J1.h / 2 - 4, w: 8, h: 8 });

  return (
    <section className="hb" data-hero-track aria-label="Introduction" style={timelineVars() as CSSProperties}>
      <style dangerouslySetInnerHTML={{ __html: introCss() }} />
      {/* The opening's clock: every intro animation starts with this one. */}
      <span className="hb-sentinel" aria-hidden="true" />
      {/* Shared paint for the LED displays (zero-size, never display:none). */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <radialGradient id="seg-lit" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0" stopColor="#ff9a5c" />
            <stop offset="0.6" stopColor="#ff4f00" />
            <stop offset="1" stopColor="#e64400" />
          </radialGradient>
        </defs>
      </svg>
      <div className="hb-view">
        <div className="hb-stage">
          {/* The workbench: an anti-static mat under the lamp. */}
          <div className="hb-bench" aria-hidden="true" />
          <div className="hb-camera">
            {/* On the mat around the board: a true-scale ruler, tweezers, a reel of parts, loose parts. */}
            <Layer src="bench" className="hb-bench-items" />
            {/* Its power cable, plugged in during the opening. */}
            <Layer src="cable" className="hb-cable" style={cableVars} />
            <div className="hb-board">
              {/* Bare laminate: seen only while the opening builds the board. */}
              <div className="hb-fr4" aria-hidden="true" />
              <BoardFx kind="copper" />
              <Layer src="board" className="hb-layer hb-mask" />
              <Layer src="silk" className="hb-layer hb-silk" />
              <MaskToggle />
              <div className="hb-spill" aria-hidden="true" />

              {/* Small parts, one image per group, placed in turn. */}
              {GROUPS.map(([g, ms]) => (
                <Layer key={g} src={`parts-${g}`} className="part drop" style={place(L.PART_GROUPS[g], P.PART_GROUPS[g], at(ms))} />
              ))}
              {L.HOLES.map(([x, y], i) => {
                const [px, py] = P.HOLES[i];
                return (
                  // eslint-disable-next-line @next/next/no-img-element -- static vector layer, served by /board
                  <img key={i} className="part drop" src="/board/screw.svg" alt="" style={place({ x: x - 3, y: y - 3, w: 6.4, h: 6.4 }, { x: px - 3, y: py - 3, w: 6.4, h: 6.4 }, at(T.screws + i * 35))} />
                );
              })}

              <Chip legs={<Layer src="parts-u1" className="part" style={place(L.PART_GROUPS.u1, P.PART_GROUPS.u1)} />} />
              <Switches />
              {/* Plain words: what the buttons are, and what this whole thing is. */}
              <p className="part hb-caption hb-menu silkprint" style={place(L.CAPTIONS.menu, P.CAPTIONS.menu)}>
                <b>Menu</b> · press a button
              </p>
              <p className="part hb-caption hb-note silkprint" style={place(L.CAPTIONS.note, P.CAPTIONS.note)}>
                This board is my portfolio.
                <br />
                Every part on it is something I built or earned.
              </p>
              <DisplayModule id="ds1" n="01" rect={L.DS1} zif={L.ZIF1} rectP={P.DS1} zifP={P.ZIF1} title="Starweave" note="an influence map of indie music" live="https://starweaves.vercel.app/" part="Project 01 · Starweave (live, from its real data)" seat={0}>
                <StarweavePanel />
              </DisplayModule>
              <DisplayModule id="ds2" n="02" rect={L.DS2} zif={L.ZIF2} rectP={P.DS2} zifP={P.ZIF2} title="Arthouse Atlas" note="an arthouse film recommender" live="https://arthouse-atlas.vercel.app/" part="Project 02 · Arthouse Atlas (its own opening titles)" seat={1}>
                <ArthousePanel />
              </DisplayModule>
              <Displays />
              <DipSwitch />

              {/* Lit status LEDs: power, and one per display. Each lights when current reaches it. */}
              {leds.map((d, i) =>
                d.net === "PWR.led" ? (
                  // The power light, beside the port: on the instant the plug clicks home.
                  <span key={i} className="part led-glow led-snap" style={place(glow(d.l), glow(d.p), { "--atl": `${T.powerOn}ms`, "--atp": `${T.powerOn}ms` })} aria-hidden="true" />
                ) : (
                  <span key={i} className="part led-glow" style={place(glow(d.l), glow(d.p), arrivals([d.net]))} aria-hidden="true" />
                ),
              )}

              {/* Power-on: the spark at the port, current along every trace, the chip's edge lighting. */}
              <BoardFx kind="pulses" />
              <span className="part hb-spark" style={place(spark(L), spark(P))} aria-hidden="true" />
              <span className="part j1-flash" style={place(L.J1, P.J1)} aria-hidden="true" />
              <span className="part u1-live" style={place(L.U1_BODY, P.U1_BODY)} aria-hidden="true" />
              <div className="hb-fx" aria-hidden="true">
                <span className="hb-reflow" />
              </div>
              <div className="hb-dim" aria-hidden="true" />

              <div className="hb-lamp" aria-hidden="true" />
              {/* The opening's darkness: lit only around the laser, then the lamp comes up. */}
              <div className="hb-dark" aria-hidden="true" />
              <div className="hb-black" aria-hidden="true" />
            </div>
          </div>
          <p className="hb-cue hb-caption" aria-hidden="true">
            Scroll to take it apart ↓
          </p>
          <BoardController />
        </div>
      </div>
    </section>
  );
}
