import type { CSSProperties, ReactNode } from "react";
import { MARK_LETTER, markLayout, nameLayout, type Placed } from "./glyphs";

/*
 * The name and the DM hallmark as they rest on the chip: Bodoni capitals
 * cut into the epoxy, bright-cut the way a watchmaker signs a movement. Each
 * letter is a groove: a frosted floor (light grey — readability first, so
 * every stroke keeps its full weight), the wall facing the light lit bright,
 * the wall facing away in shadow, and a fine bright rim where the surface
 * breaks into the cut on the lamp's side. Static SVG, painted once — twice
 * over: lit from the upper left and from the upper right, blended by the
 * pointer (board.css), so the light moves across the cuts like a watch
 * turned in the hand. Masks, not clipPaths: a clip path may not `use` a
 * group, a mask may.
 */

const PAD = 0.12; // room around the block (cap heights)

/** The name's box (cap-height units, including the pad). */
export function nameBoxVars(): CSSProperties {
  const { width, height } = nameLayout();
  return { "--eng-w": width + 2 * PAD, "--eng-h": height + 2 * PAD, "--eng-pad": PAD } as CSSProperties;
}

function Glyphs({ glyphs }: { glyphs: Placed[] }) {
  return (
    <>
      {glyphs.map((g, i) => (
        <path key={i} d={g.d} transform={`translate(${g.x} ${g.y})`} />
      ))}
    </>
  );
}

type Box = [number, number, number, number];
const big = ([x, y, w, h]: Box) => ({ x: x - 1, y: y - 1, width: w + 2, height: h + 2 });

/** A band along the letters' edge: inside them, outside a copy moved by
 *  (dx, dy) — or, `outside`, the moved copy's part beyond the letters. */
function Band({ id, name, box, d, outside }: { id: string; name: string; box: Box; d: [number, number]; outside?: boolean }) {
  return (
    <mask id={`${id}-${name}`} maskUnits="userSpaceOnUse" {...big(box)}>
      <use href={`#${id}`} fill="#fff" transform={outside ? `translate(${d[0]} ${d[1]})` : undefined} />
      <use href={`#${id}`} fill="#000" transform={outside ? undefined : `translate(${d[0]} ${d[1]})`} />
    </mask>
  );
}

/** The light's two sides: travelling down-right (lamp upper left) or down-left. */
const LIGHTS = { l: [0.66, 0.75], r: [-0.66, 0.75] } as const;

/** The floor: the defs every layer uses, and the frosted floor of the cut. */
function Floor({ id, box, cut }: { id: string; box: Box; cut: number }) {
  const [x, y, w, h] = box;
  const v = (k: number, [dx, dy]: readonly [number, number]): [number, number] => [dx * cut * k, dy * cut * k];
  return (
    <>
      <defs>
        <mask id={`${id}-in`} maskUnits="userSpaceOnUse" {...big(box)}>
          <use href={`#${id}`} fill="#fff" />
        </mask>
        {Object.entries(LIGHTS).map(([side, d]) => (
          <g key={side}>
            {/* The wall facing away from the light: a graded shadow. */}
            <Band id={id} name={`${side}-sh1`} box={box} d={v(1, d)} />
            <Band id={id} name={`${side}-sh2`} box={box} d={v(1.9, d)} />
            {/* The wall facing it: a lit facet with a crisp bright edge. */}
            <Band id={id} name={`${side}-lit`} box={box} d={v(-1.25, d)} />
            <Band id={id} name={`${side}-edge`} box={box} d={v(-0.42, d)} />
            {/* The rim where the surface breaks into the cut, on the light's side. */}
            <Band id={id} name={`${side}-rim`} box={box} d={v(-0.5, d)} outside />
          </g>
        ))}
        <linearGradient id={`${id}-frost`} gradientUnits="userSpaceOnUse" x1={x} y1={y} x2={x + w} y2={y + h}>
          <stop offset="0" stopColor="#cfcec8" />
          <stop offset="0.55" stopColor="#b8b7b1" />
          <stop offset="1" stopColor="#a09f99" />
        </linearGradient>
      </defs>
      <rect {...big(box)} fill={`url(#${id}-frost)`} mask={`url(#${id}-in)`} />
    </>
  );
}

/** The cut's walls, lit from one side. */
function Walls({ id, box, side }: { id: string; box: Box; side: "l" | "r" }) {
  const b = big(box);
  return (
    <>
      <rect {...b} fill="#020202" opacity={0.3} mask={`url(#${id}-${side}-sh2)`} />
      <rect {...b} fill="#020202" opacity={0.38} mask={`url(#${id}-${side}-sh1)`} />
      <rect {...b} fill="#fff" opacity={0.55} mask={`url(#${id}-${side}-lit)`} />
      <rect {...b} fill="#fff" opacity={0.85} mask={`url(#${id}-${side}-edge)`} />
      <rect {...b} fill="#fff" opacity={0.2} mask={`url(#${id}-${side}-rim)`} />
    </>
  );
}

/** The whole cut: the floor, then the walls lit from each side (blended by CSS). */
function Cut({ id, viewBox, box, cut, shapes }: { id: string; viewBox: string; box: Box; cut: number; shapes: ReactNode }) {
  return (
    <>
      <svg viewBox={viewBox} className="eng-cut">
        <defs>
          <g id={id}>{shapes}</g>
        </defs>
        <Floor id={id} box={box} cut={cut} />
      </svg>
      <svg viewBox={viewBox} className="eng-cut eng-light eng-l">
        <Walls id={id} box={box} side="l" />
      </svg>
      <svg viewBox={viewBox} className="eng-cut eng-light eng-r">
        <Walls id={id} box={box} side="r" />
      </svg>
    </>
  );
}

export function NameEngraving() {
  const { glyphs, width, height } = nameLayout();
  const viewBox = `${-PAD} ${-PAD} ${width + 2 * PAD} ${height + 2 * PAD}`;
  return (
    <span className="eng-name" style={nameBoxVars()} aria-hidden="true">
      <Cut id="eng-name" viewBox={viewBox} box={[0, 0, width, height]} cut={0.036} shapes={<Glyphs glyphs={glyphs} />} />
    </span>
  );
}

export function MarkEngraving() {
  const { glyphs, ox, oy } = markLayout();
  return (
    <span className="eng-mark" aria-hidden="true">
      <Cut
        id="eng-mark"
        viewBox="-0.1 -0.1 2.2 2.2"
        box={[0, 0, 2, 2]}
        cut={0.04}
        shapes={
          <>
            {/* A fine ring (a band, by evenodd), then the letters. */}
            <path d="M1 0.02A0.98 0.98 0 1 1 1 1.98A0.98 0.98 0 1 1 1 0.02ZM1 0.1A0.9 0.9 0 1 0 1 1.9A0.9 0.9 0 1 0 1 0.1Z" fillRule="evenodd" />
            <g transform={`translate(${ox} ${oy}) scale(${MARK_LETTER})`}>
              <Glyphs glyphs={glyphs} />
            </g>
          </>
        }
      />
    </span>
  );
}
