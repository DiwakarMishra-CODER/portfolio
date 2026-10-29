import type { CSSProperties, ReactNode } from "react";
import { LANDSCAPE as L } from "@/components/hero/board/spec";
import { DS, FPC, GLASS, SCREWS } from "./beats";
import { CPU, MEM, WINDOW } from "./carrier";

/*
 * The display module that comes off the hero board: an exact copy of DS1
 * (DisplayModule.tsx), drawn at DS1's own place on a frame that matches the
 * board, so the first scrolled pixel can swap one for the other unseen. It
 * is built from separate pieces — its circuit board, the screen, four screws
 * — so the teardown can take it apart (beats.ts moves each one).
 *
 * Nesting, outside in: the swap (.mc), the skip-fade, the carry across the
 * mat (.mc-move: compositor), the board's tilt (.mc-tilt), the pointer
 * parallax (.mc-par), then the pieces.
 */

const mm = (v: number) => `calc(${+v.toFixed(3)} * var(--mm))`;
const box = (r: { x: number; y: number; w: number; h: number }): CSSProperties => ({ left: mm(r.x), top: mm(r.y), width: mm(r.w), height: mm(r.h) });
/** The board's lamp and the screens' spill, as they fall on this piece (it sits under both on the board). */
const light = (x: number, y: number): CSSProperties => ({ left: mm(-x), top: mm(-y), width: mm(L.BOARD.w), height: mm(L.BOARD.h) });

type Props = {
  n: string;
  title: string;
  note: string;
  /** What's printed on its two chips. */
  mem: [string, string];
  cpu: [string, string];
  /** The live screen (a copy of the hero's panel). */
  children: ReactNode;
};

export default function ModuleCopy({ n, title, note, mem, cpu, children }: Props) {
  const zif = L.ZIF1;
  // Where the board's tilt pivots (its 50% / 55%), in the module's own coordinates.
  const origin = `${mm(L.BOARD.w * 0.5 - DS.x)} ${mm(L.BOARD.h * 0.55 - DS.y)}`;
  const chip = (r: { x: number; y: number; w: number; h: number }) => box({ x: GLASS.x + r.x, y: GLASS.y + r.y, w: r.w, h: r.h });
  return (
    <div className="mc" inert style={box(DS)}>
      <div className="mc-fade">
        <div className="mc-move">
          <span className="mc-lift" />
          <div className="mc-tilt" style={{ transformOrigin: origin }}>
            {/* The ribbon cable, from where it leaves the connector's mouth
                (it goes with the circuit board it's soldered to). */}
            <div className="mc-fpcw">
              <div className="mc-fpc" style={box(FPC)}>
                <span className="mc-light-clip">
                  <i className="mc-light" style={light(DS.x + FPC.x, DS.y + FPC.y)} />
                </span>
              </div>
            </div>
            <div className="mc-par">
              <div className="mc-board ds elev" style={{ "--hgt": 6, "--drv-l": zif.x + zif.w / 2 - DS.x - 3.5 } as CSSProperties} data-part="Its circuit board">
                <div className="ds-carrier">
                  <span className="ds-driver" />
                  {SCREWS.map((s, i) => (
                    <span key={i} className="mc-hole" style={box({ x: s.x - 0.75, y: s.y - 0.75, w: 1.5, h: 1.5 })} />
                  ))}
                  {/* eslint-disable-next-line @next/next/no-img-element -- static vector layer, served by /board */}
                  <img className="mc-circuit" src="/board/carrier.svg" alt="" style={box(GLASS)} />
                  <span className="mc-mark mc-mark-mem" style={chip({ x: MEM.x, y: MEM.y, w: MEM.w, h: WINDOW.y - MEM.y })} data-part="What it knows · memory chip">
                    {mem[0]}
                  </span>
                  <span className="mc-mark mc-mark-mem" style={chip({ x: MEM.x, y: WINDOW.y + WINDOW.h, w: MEM.w, h: MEM.y + MEM.h - WINDOW.y - WINDOW.h })}>
                    {mem[1]}
                  </span>
                  <span className="mc-mark mc-mark-cpu" style={chip(CPU)} data-part="How it decides · processor">
                    {cpu[0]}
                    <br />
                    {cpu[1]}
                  </span>
                  <p className="ds-caption hb-caption">
                    <span>
                      Project {n} · <b>{title}</b>
                      <span className="ds-note"> — {note}</span>
                    </span>
                    <span className="ds-actions mc-acts">
                      <span className="ds-act">
                        How it works <span className="ds-arrow">↓</span>
                      </span>
                      <span className="ds-act">
                        Live site <span className="ds-arrow">↗</span>
                      </span>
                    </span>
                  </p>
                </div>
              </div>
              {/* The screen: glass and live panel, lifted off as one piece. */}
              <div className="mc-gw" style={box(GLASS)} data-part="What you see · the live screen">
                <span className="mc-gshadow" />
                <div className="ds-glass mc-glass">
                  <div className="ds-active">{children}</div>
                  <span className="mc-glint-clip">
                    <span className="mc-glint" />
                  </span>
                </div>
              </div>
              {SCREWS.map((s, i) => (
                <span key={i} className={`mc-sx mc-sx${i}`} style={box({ x: s.x - 0.65, y: s.y - 0.65, w: 1.3, h: 1.3 })}>
                  <span className={`mc-sy mc-sy${i}`}>
                    <span className={`ds-screw mc-sr${i}`} />
                  </span>
                </span>
              ))}
              <span className="mc-light-clip">
                <i className="mc-light" style={light(DS.x, DS.y)} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
