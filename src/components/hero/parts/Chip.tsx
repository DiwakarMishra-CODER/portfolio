import type { CSSProperties, ReactNode } from "react";
import { HERO_EYEBROW, HERO_LINE } from "@/data/copy";
import { LANDSCAPE as L } from "../board/spec";
import { PORTRAIT as P } from "../board/spec-phone";
import { T } from "../timeline";
import { place } from "./place";
import { MarkEngraving, NameEngraving, nameBoxVars } from "../name/Engraving";
import NameLaser from "../name/NameLaser";

/** U1 — the processor everything on the board is wired to. Its body sits on
 *  300 gull-wing legs (`legs`, an image layer); the name is engraved into it
 *  in a single-line hand (name/glyphs.ts), with a DM maker's mark. During the
 *  opening the chip is held up to the camera while a laser writes the name,
 *  then set down onto the board — so it lives in its own group (`.u1-group`,
 *  below the darkness; the laser's light above it). Only the chip is ever
 *  magnified: zooming the whole board dropped frames on Retina screens. */
export default function Chip({ legs }: { legs: ReactNode }) {
  return (
    <>
      <div className="u1-group">
        {legs}
        <div className="part elev u1" style={place(L.U1_BODY, P.U1_BODY, { "--hgt": 2.4 })} data-part="The processor (your name is engraved on it)">
          <div className="u1-lid">
            <span className="u1-pin1" aria-hidden="true" />
            <MarkEngraving />
            <h1 className="u1-name">
              <span className="sr-only">Diwakar Mishra</span>
              <NameEngraving />
            </h1>
            <p className="u1-meta">{HERO_EYEBROW}</p>
            <p className="u1-line">{HERO_LINE}</p>
          </div>
        </div>
      </div>
      <div className="u1-burn-group">
        <Burn />
      </div>
    </>
  );
}

// ── The opening: the laser at work ────────────────────────────────────────

/** Heat leaving the small lines: ms behind the beam → colour. Finer, faster
 *  passes than the name, so they cool straight to the marking's grey. */
const COOLING: [number, string][] = [
  [0, "#ffffff"],
  [40, "#fff0c8"],
  [110, "#ffc27a"],
  [220, "#d8b48e"],
  [340, "#a6a59f"],
];
const COOL = COOLING[COOLING.length - 1][0];

/*
 * A small line as a moving heat map: the text is clipped to a wide gradient
 * that slides with the beam, so each letter appears white-hot the moment the
 * beam passes and cools on its own clock. (Positions are fractions of the
 * line's own width, so the font size never matters.)
 */
function heat([a, b]: readonly [number, number]): CSSProperties {
  const d = b - a;
  const k = (d + COOL) / d; // head travel, in line widths
  const m = k + 1.2; // gradient width: 1.1 ahead of the head, 0.1 spare behind
  const h = (k + 0.1) / m; // the head's place in the gradient
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  const stops = COOLING.map(([ms, col]) => `${col} ${pct(h - ms / d / m)}`).reverse();
  return {
    "--heat": `linear-gradient(90deg, ${COOLING[COOLING.length - 1][1]} 0%, ${stops.join(", ")}, rgba(255, 255, 255, 0) ${pct(h + 0.002)})`,
    "--bw": pct(m),
    "--bp0": pct((h * m + 0.04) / (m - 1)), // head just left of the line: nothing shows yet
    "--bp1": pct(0.1 / (m - 1)),
    "--ba": `${a}ms`,
    "--bd": `${Math.round(k * d)}ms`,
  } as CSSProperties;
}

/** The laser's light, above the opening's darkness (hot metal gives its own
 *  light): the canvas that writes the name and mark, the ignition point, and
 *  hot copies of the small lines. Same box and layout as the lid; shown only
 *  while the opening plays. */
function Burn() {
  return (
    <div className="part u1-burn" style={place(L.U1_BODY, P.U1_BODY, { "--hgt": 2.4 })} aria-hidden="true">
      <div className="u1-lid is-burn">
        {/* Holds the name's place, so the small lines sit where the lid's do. */}
        <span className="eng-name eng-space" style={nameBoxVars()} />
        <p className="u1-meta">
          <span className="burn-ln" style={heat(T.small1)}>
            {HERO_EYEBROW}
          </span>
        </p>
        <p className="u1-line">
          <span className="burn-ln" style={heat(T.small2)}>
            {HERO_LINE}
          </span>
        </p>
      </div>
      {/* The laser's red guide light, framing the job before the beam fires. */}
      <span className="laser-guide" style={nameBoxVars()} />
      <NameLaser />
    </div>
  );
}
