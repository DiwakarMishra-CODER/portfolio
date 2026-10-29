import type { CSSProperties, ReactNode } from "react";
import { LANDSCAPE as L } from "../board/spec";
import { PORTRAIT as P } from "../board/spec-phone";
import { place } from "./place";
import { T, at } from "../timeline";
import { arrivals } from "../board/power";
import { KNIGHT, LEETCODE } from "./icons";
import leetcode from "@/data/leetcode.json";

/*
 * The achievements, as the display parts a board would carry, each with its
 * meaning printed beside it in plain words: CGPA on a 7-segment LED display,
 * LeetCode on a 14-segment one (7-segment has no "+"), GRiD and CodeX on
 * small OLEDs. Displays are geometry, not fonts. The real values are text in
 * the HTML (screen-reader and crawler readable); the displays are aria-hidden.
 */

// ── Segments: hexagonal, in a 12 × 20 cell, upright for legibility. ───────
const H = (x1: number, x2: number, y: number) => `${x1},${y} ${x1 + 1},${y - 1} ${x2 - 1},${y - 1} ${x2},${y} ${x2 - 1},${y + 1} ${x1 + 1},${y + 1}`;
const V = (x: number, y1: number, y2: number) => `${x},${y1} ${x + 1},${y1 + 1} ${x + 1},${y2 - 1} ${x},${y2} ${x - 1},${y2 - 1} ${x - 1},${y1 + 1}`;
const SEG7: Record<string, string> = {
  a: H(2.3, 9.7, 1),
  b: V(10, 1.6, 9.4),
  c: V(10, 10.6, 18.4),
  d: H(2.3, 9.7, 19),
  e: V(2, 10.6, 18.4),
  f: V(2, 1.6, 9.4),
  g: H(2.3, 9.7, 10),
};
const SEG14: Record<string, string> = {
  a: SEG7.a, b: SEG7.b, c: SEG7.c, d: SEG7.d, e: SEG7.e, f: SEG7.f,
  g1: H(2.3, 5.8, 10),
  g2: H(6.2, 9.7, 10),
  i: V(6, 2.2, 9.2),
  l: V(6, 10.8, 17.8),
  // The plus: full-width bar, arms cut short so it never reads as a "t".
  pi: V(6, 4.4, 9.4),
  pl: V(6, 10.6, 15.6),
};
const DIGIT7: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg", " ": "",
};
const CHAR14: Record<string, string[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g1", "g2"],
  "*": ["a", "b", "c", "d", "e", "f", "g1", "g2", "i", "l"], // power-on self-test
  "+": ["g1", "g2", "pi", "pl"],
  " ": [],
};

function Cell({ lit, all, dot, x }: { lit: string[]; all: Record<string, string>; dot?: boolean; x: number }) {
  // Unlit segments: the standard set only (the plus arms only ever show lit).
  const keys = Object.keys(all).filter((k) => !(k.startsWith("p") && !lit.includes(k)));
  return (
    <g transform={`translate(${x + 1.5} 0)`}>
      {lit.map((k) => (
        <polygon key={`h${k}`} points={all[k]} className="seg-halo" />
      ))}
      {keys.map((k) => (
        <polygon key={k} points={all[k]} className={lit.includes(k) ? "seg-on" : "seg-off"} />
      ))}
      {dot !== undefined && <circle cx={12.6} cy={19} r={1.15} className={dot ? "seg-on" : "seg-off"} />}
    </g>
  );
}

function SevenSeg({ text }: { text: string }) {
  const cells: { ch: string; dot: boolean }[] = [];
  for (const ch of text) {
    if (ch === "." && cells.length) cells[cells.length - 1].dot = true;
    else cells.push({ ch, dot: false });
  }
  return (
    <svg viewBox={`-1 -1.8 ${cells.length * 15 + 2} 23.6`} aria-hidden="true">
      {cells.map((c, i) => (
        <Cell key={i} x={i * 15} all={SEG7} lit={[...(DIGIT7[c.ch] ?? "")]} dot={c.dot} />
      ))}
    </svg>
  );
}

function Alnum14({ text }: { text: string }) {
  return (
    <svg viewBox={`-1 -1.8 ${text.length * 15 + 2} 23.6`} aria-hidden="true">
      {[...text].map((ch, i) => (
        <Cell key={i} x={i * 15} all={SEG14} lit={CHAR14[ch] ?? []} />
      ))}
    </svg>
  );
}

// ── OLED: a 5 × 7 pixel font, pixels at 85% fill so the grid shows. ───────
const ROWS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  Y: ["10001", "10001", "10001", "01010", "00100", "00100", "00100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function Oled({ lines }: { lines: string[] }) {
  const cols = Math.max(...lines.map((l) => l.length)) * 6 - 1;
  const rows = lines.length * 8 - 1;
  const px: [number, number][] = [];
  lines.forEach((line, li) => {
    const off = Math.floor((cols + 1 - line.length * 6) / 2);
    [...line].forEach((ch, ci) => {
      (ROWS[ch] ?? ROWS[" "]).forEach((row, ry) => {
        [...row].forEach((bit, rx) => {
          if (bit === "1") px.push([off + ci * 6 + rx, li * 8 + ry]);
        });
      });
    });
  });
  return <Pixels cols={cols} rows={rows} px={px} />;
}

/** An OLED's lit pixels as one path (85% fill, so the grid shows) — one
 *  element per display, not one per pixel. */
function Pixels({ cols, rows, px }: { cols: number; rows: number; px: [number, number][] }) {
  const d = px.map(([x, y]) => `M${(x + 0.075).toFixed(3)} ${(y + 0.075).toFixed(3)}h.85v.85h-.85z`).join("");
  return (
    <svg viewBox={`-1 -1 ${cols + 2} ${rows + 2}`} aria-hidden="true">
      <path d={d} className="oled-px" />
    </svg>
  );
}

/** Deterministic per-pixel noise in [0, 1). */
function noise(seed: number, x: number, y: number) {
  let h = Math.imul(seed * 374761393 + x * 668265263 + y * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** An OLED's first frame at power-on: uninitialised RAM, random pixels. */
function OledNoise({ lines, seed }: { lines: string[]; seed: number }) {
  const cols = Math.max(...lines.map((l) => l.length)) * 6 - 1;
  const rows = lines.length * 8 - 1;
  const px: [number, number][] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (noise(seed, x, y) < 0.32) px.push([x, y]);
  return <Pixels cols={cols} rows={rows} px={px} />;
}

type Content = { title: string; note: string; value: string; face: ReactNode; led: boolean; off?: ReactNode; test: ReactNode; logo?: string; badge?: string };
// LeetCode, from his real profile (src/data/leetcode.json, scripts/data/leetcode.mjs):
// Knight is LeetCode's badge for a contest rating of 1850 or more.
const LC = { rating: leetcode.rating, solved: leetcode.solved.All, contests: leetcode.contests };
const KNIGHT_AT = 1850;
const CONTENT: Record<string, Content> = {
  cgpa: { title: "CGPA", note: "B.Tech CSE-AI\nout of 10", value: "9.43 out of 10", face: <SevenSeg text="9.43" />, led: true, off: <SevenSeg text="   " />, test: <SevenSeg text="8.8.8." /> },
  leetcode: {
    title: "LeetCode",
    logo: LEETCODE,
    badge: LC.rating >= KNIGHT_AT ? "Knight" : undefined,
    note: `Rating · ${LC.solved} solved`,
    value: `${LC.rating >= KNIGHT_AT ? "Knight, " : ""}${LC.rating} contest rating, ${LC.solved} problems solved`,
    face: <SevenSeg text={String(LC.rating)} />,
    led: true,
    off: <SevenSeg text={" ".repeat(String(LC.rating).length)} />,
    test: <SevenSeg text={"8.".repeat(String(LC.rating).length)} />,
  },
  grid: { title: "Flipkart GRiD 8.0", note: "National", value: "Semi-finalist", face: <Oled lines={["SEMI-", "FINALIST"]} />, led: false, test: <OledNoise lines={["SEMI-", "FINALIST"]} seed={3} /> },
  codex: { title: "CodeX Hackathon", note: "Award · MAIT", value: "Neighbourly Choice", face: <Oled lines={["NEIGHBOURLY", "CHOICE"]} />, led: false, test: <OledNoise lines={["NEIGHBOURLY", "CHOICE"]} seed={7} /> },
};

export default function Displays() {
  return (
    <>
      {L.ACH_SLOTS.map((slot, i) => {
        const c = CONTENT[slot.id];
        const q = P.ACH_SLOTS.find((s) => s.id === slot.id)!;
        return (
          <div key={slot.id}>
            <div className="part ach-label silkprint" style={place(slot.label, q.label)}>
              <p className="ach-title">
                {c.logo && (
                  <svg className="ach-logo" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={c.logo} />
                  </svg>
                )}
                {c.title}
              </p>
              {c.badge && (
                <p className="ach-badge">
                  <span className="ach-shield" aria-hidden="true">
                    <svg viewBox="0 0 24 28">
                      <defs>
                        <linearGradient id="kn-gold" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#fff1c4" />
                          <stop offset="0.45" stopColor="#f0c564" />
                          <stop offset="1" stopColor="#a8772a" />
                        </linearGradient>
                        <linearGradient id="kn-field" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#1f5a52" />
                          <stop offset="1" stopColor="#0c2a26" />
                        </linearGradient>
                      </defs>
                      <path d="M12 1.2 22.2 5v8.2c0 6.6-4.3 11.2-10.2 13.6C6.1 24.4 1.8 19.8 1.8 13.2V5Z" fill="url(#kn-field)" stroke="url(#kn-gold)" strokeWidth="1.7" strokeLinejoin="round" />
                      <g transform="translate(5 6.2) scale(0.58)" fill="url(#kn-gold)">
                        {KNIGHT.map((d, k) => (
                          <path key={k} d={d} />
                        ))}
                      </g>
                    </svg>
                    <i className="ach-shine" />
                  </span>
                  <span className="ach-rank">{c.badge}</span>
                </p>
              )}
              <p className="ach-note">
                {c.note.split("\n").map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <p className="sr-only">{c.value}</p>
            </div>
            <div className="part elev disp drop" style={place(slot.display, q.display, { "--hgt": c.led ? 3.2 : 2.4, ...at(T.displays + i * 60) })} data-part={`${c.title} display`}>
              <div className={`disp-face ${c.led ? "is-led" : "is-oled"}`}>
                {c.face}
                {/* Power-on: dark until current arrives, then a self-test frame. */}
                <span className="disp-boot" style={arrivals([`DSP.b${2 * i}`, `DSP.b${2 * i + 1}`], [`DSP.${slot.id}`]) as CSSProperties} aria-hidden="true">
                  <span className="boot-off">{c.off}</span>
                  <span className={c.led ? "boot-test" : "boot-test is-noise"}>{c.test}</span>
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
