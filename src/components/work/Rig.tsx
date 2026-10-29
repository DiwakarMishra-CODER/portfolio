import type { CSSProperties, ReactNode } from "react";
import "./rig.css";
import { DISH, PHOTO, GLASS, rigCss } from "./beats";
import { CPU, MEM } from "./carrier";
import ModuleCopy from "./ModuleCopy";

/*
 * A project, taken apart on the bench. The rig is a tall scroll track with a
 * stage stuck to the viewport inside it; scroll position drives every beat
 * (beats.ts → scroll-driven CSS, nothing per frame in JS). The Starweave rig
 * starts at the very top of the page, under the hero, so its module can lift
 * straight off the board.
 *
 * Without scroll-driven animations, with reduced motion, or on a small
 * screen, the stage is simply the finished teardown: every piece laid out
 * and labelled, the screen still live.
 */

const mm = (v: number) => `calc(${+v.toFixed(3)} * var(--mm))`;
const at = (x: number, y: number): CSSProperties => ({ left: mm(x), top: mm(y) });

/** A label-maker tape: printed, fed out of its slot, stuck down. */
function Tape({ className, x, y, head, line, as: Head = "b", id }: { className: string; x?: number; y?: number; head: ReactNode; line?: ReactNode; as?: "b" | "h3"; id?: string }) {
  return (
    <div className={`tape ${className}`} style={x == null || y == null ? undefined : at(x, y)}>
      <div className="tape-strip">
        <Head className="tape-head" id={id}>
          {head}
        </Head>
        {line && <span className="tape-line">{line}</span>}
      </div>
    </div>
  );
}

type Props = {
  n: string;
  id: string;
  name: string;
  line: string;
  note: string;
  live: string;
  /** What's printed on its chips, and what the tapes beside them say. */
  mem: [string, string];
  cpu: [string, string];
  knows: string;
  decides: string;
  /** Its live screen (a copy of the hero's). */
  screen: ReactNode;
};

export default function Rig(p: Props) {
  // Where the labels go: under the screen, and under each chip on its board.
  const board = { x: PHOTO.board.x + GLASS.x, y: PHOTO.board.y + GLASS.y };
  return (
    <section className="rig rig-sw" data-hero-track aria-labelledby="work-title">
      <style dangerouslySetInnerHTML={{ __html: rigCss() }} />
      <div className="rig-stage">
        <div className="rig-lamp" aria-hidden="true" />
        <div className="rig-frame">
          <h2 id="work-title" className="rig-print" style={at(4, 3.4)}>
            Two live projects, taken apart. Every part still works.
          </h2>
          <span className="rig-dish" style={{ left: mm(DISH.x - DISH.r), top: mm(DISH.y - DISH.r), width: mm(DISH.r * 2), height: mm(DISH.r * 2) }} aria-hidden="true" />
          <article aria-labelledby={`${p.id}-name`}>
            <Tape className="tape-rig" x={4} y={11.5} as="h3" id={`${p.id}-name`} head={`Project ${p.n} · ${p.name}`} line={p.line} />
            <div className="rig-row" style={at(PHOTO.glass.x, PHOTO.glass.y + GLASS.h + 3.2)}>
              <Tape className="tape-see" head="What you see" line="The site, as you'd use it" />
              <a className="rig-live ds-act" href={p.live} target="_blank" rel="noreferrer">
                Live site <span className="ds-arrow">↗</span>
              </a>
            </div>
            <Tape className="tape-knows" x={board.x + MEM.x - 2} y={PHOTO.board.y + 47.5} head="▲ What it knows" line={p.knows} />
            <Tape className="tape-decides" x={board.x + CPU.x - 0.5} y={PHOTO.board.y + 47.5} head="▲ How it decides" line={p.decides} />
          </article>
          <p className="rig-cue hb-caption" style={at(88, 98.5)} aria-hidden="true">
            Scroll to look closer ↓
          </p>
          <ModuleCopy n={p.n} title={p.name} note={p.note} mem={p.mem} cpu={p.cpu}>
            {p.screen}
          </ModuleCopy>
        </div>
      </div>
      {/* Where links land: the bench (#work), and this project laid out (#starweave). */}
      <div className="rig-spacer">
        <span id="work" className="rig-mark" style={{ "--at": 1 } as CSSProperties} />
        <span id={p.id} className="rig-mark" style={{ "--at": 2.16 } as CSSProperties} />
      </div>
    </section>
  );
}

