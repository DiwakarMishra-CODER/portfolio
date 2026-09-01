"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion, type Variants } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Bento grid — replaces the earlier stacked layout. Everything fits in
// roughly one view; presence comes from tile size/position + warm tint
// depth, not from a long scroll. Every tile shares the same "crafted" base
// treatment (radius, hairline border, layered shadow, top-sheen) via the
// `.bento-tile` class in globals.css — only each tile's own background
// gradient/border color (its warm "family member") varies, passed here as
// plain string constants (same pattern as ProjectCard's `panelTint`).
// All tints are deliberately WARM (no cool blue/purple, unlike Projects'
// per-card accents) so the grid reads as one golden-hour family; separation
// comes from tint shade + border + depth, not hue temperature.

const STATEMENT_BG = "linear-gradient(145deg, #FCF7EE, #F8ECDB 62%, #F6E6D2)";

const PROOF_BG = "linear-gradient(160deg, rgba(217,138,90,0.28), rgba(217,138,90,0.09))";
const PROOF_BORDER = "rgba(217,138,90,0.30)";
const PROOF_LABEL_COLOR = "#A85E2E";
const PROOF_VALUE_COLOR = "#4A3322";
const PROOF_CAPTION_COLOR = "#6E5D4C";

// Must match the resume in public/ exactly — a reviewer who opens both will
// cross-check, and the site claiming more than the CV can defend is worse
// than either number alone. LeetCode rating is deliberately "1800+" rather
// than a precise figure: contest ratings move, and a hardcoded peak goes
// stale silently.
//
// TWO CLAIMS WERE DELIBERATELY WEAKENED HERE — do not "restore" them:
//  • CGPA carries NO ranking. It said "top of the CSE-AI branch"; the real
//    position is somewhere in the top few and isn't confirmed. 9.43/10 is
//    excellent unaided, and an unverifiable rank next to a verifiable number
//    puts doubt on the number too.
//  • CodeX is "Neighbourly Choice", not "Winner". It's a named award at the
//    hackathon, not the overall first place, and "Winner" alone read as the
//    latter. A reviewer who checks the linked certificate would find the
//    weaker claim — which is exactly the wrong thing to be caught doing.
const PROOF_ITEMS = [
  { value: "9.43 / 10", caption: "CGPA · B.Tech CSE-AI" },
  { value: "1800+", caption: "LeetCode contest rating · 350+ solved" },
  { value: "Semi-Finalist", caption: "Flipkart GRiD 8.0 — national" },
  { value: "Neighbourly Choice", caption: "Award · CodeX Hackathon, MAIT" },
];

interface Principle {
  title: string;
  copy: string;
  bg: string;
  border: string;
  dash: string;
  titleColor: string;
}

// One tile per project (Starweave / Arthouse Atlas / CareerSaarthi), each a
// human-readable idea rather than an aphorism or a paragraph. Kept to ~18
// words on purpose: the hard numbers live in the project cards, so these
// stay short and the row renders even. A denser draft pushed this row to 7
// lines at 1024px, which fights the bento's "fits in one view" goal.
//
// Tile 1 used to be "Show your sources", which restated the Starweave card's
// own provenance stats ~200px away. It now carries the genre-map layout work
// — the second-strongest engineering result in the portfolio, which appeared
// nowhere on the site at all.
//
// The technique names are stated outright, same reasoning as "Dijkstra" in
// the Starweave card: a named technique is a SKIPPABLE credential, not
// comprehension-blocking jargon. Note the ORDER — outcome first ("packs 53
// timelines into the fewest rows"), techniques as a trailing list. That way a
// non-technical reader has the point before the jargon arrives and can stop
// reading; putting the algorithm names first would block the sentence for
// them. This costs one line at 1024px versus an unnamed version, which is
// worth it: naming Starweave keeps the tile legible out of order (like the
// other two, which name their own project) and the full technique names are
// the credential. Keep the British "colouring" to match the résumé.
//
// That kills a duplication and fills a real gap in one move. Deliberately a
// SWAP, not a fourth tile: the row is 3 x col-span-4 = 12 exactly, so a
// fourth would force col-span-3 and re-wrap every tile — a layout change to
// solve a copy problem.
const PRINCIPLES: Principle[] = [
  {
    title: "Layout is an algorithm",
    copy: "Starweave's genre map packs 53 timelines into the fewest rows — heavy-path decomposition, greedy interval colouring, no labels colliding.",
    bg: "linear-gradient(160deg, rgba(232,147,74,0.30), rgba(232,147,74,0.09))",
    border: "rgba(232,147,74,0.30)",
    dash: "#E8934A",
    titleColor: "#B96E2E",
  },
  {
    // This used to restate the Arthouse project card almost verbatim
    // ("497 films kept from a much longer list... trimmed whenever something
    // too mainstream slipped in" — same sentence, ~200px away). Same fix as
    // tile 1: give the tile a new angle instead of the card's own stat. The
    // angle here is his own framing — no single critics' list or festival
    // canon has the full picture, so the value isn't just cutting, it's
    // merging sources that don't agree.
    title: "Curate by cutting",
    copy: "Critics' polls and festival canons don't agree on one list. Arthouse Atlas merges them, then cuts what's too mainstream.",
    bg: "linear-gradient(160deg, rgba(228,103,79,0.30), rgba(228,103,79,0.09))",
    border: "rgba(228,103,79,0.30)",
    dash: "#E4674F",
    titleColor: "#C24A34",
  },
  {
    title: "Plan for the API failing",
    copy: "Rate limits, dead APIs, blank screens. A cache absorbs the first; fallbacks cover the rest.",
    bg: "linear-gradient(160deg, rgba(224,130,104,0.30), rgba(224,130,104,0.09))",
    border: "rgba(224,130,104,0.30)",
    dash: "#E08268",
    titleColor: "#B5583C",
  },
];

const TOOLKIT_BG = "linear-gradient(160deg, rgba(217,142,107,0.26), rgba(217,142,107,0.08))";
const TOOLKIT_BORDER = "rgba(217,142,107,0.28)";
const TOOLKIT_LABEL_COLOR = "#A85E38";
const TOOLKIT_CHIP_CLASS =
  "inline-flex items-center rounded-full border border-[rgba(168,94,56,0.20)] bg-[rgba(255,255,255,0.72)] px-3.5 py-1.5 font-body text-xs text-[#5A4436] sm:text-sm";
const SKILLS = [
  "C++",
  "TypeScript",
  "JavaScript",
  "SQL",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "MongoDB",
  "PostgreSQL/Supabase",
  "Tailwind CSS",
  "Canvas API",
  "D3/d3-force",
  "LLM Integration",
  "Git · CI",
];

const HUMAN_BG = "linear-gradient(120deg, rgba(245,197,66,0.18), rgba(232,147,74,0.06))";
const HUMAN_BORDER = "rgba(245,197,66,0.26)";
const HUMAN_TEXT_COLOR = "#7A6636";

function reveal(delay: number, reduced: boolean): Variants {
  if (reduced) {
    return { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } };
  }
  return {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay, ease: EASE_OUT },
    },
  };
}

// Shared tile shell — every tile gets the same reveal mechanics (gentle
// per-tile stagger via `delay`) and the same `.bento-tile` base look;
// `className` only ever carries this tile's grid placement (col/row span),
// `style` only its own background/border color.
function Tile({
  children,
  className,
  style,
  delay,
  reduced,
}: {
  children: ReactNode;
  className: string;
  style?: CSSProperties;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      // `usePrefersReducedMotion` reports `false` on the very first client
      // render by design (hydration-safe), correcting a moment later. For
      // tiles below the fold that never intersect (whileInView never
      // fires), the `initial="hidden"` pose gets stuck at whatever
      // `reveal()` resolved to at THAT first render — i.e. the real
      // (opacity:0) hidden state, even after `reduced` corrects to true and
      // `reveal(delay, true)` starts returning an identical hidden/visible.
      // Forcing `animate="visible"` once reduced is true overrides the
      // stuck whileInView gesture (animate outranks whileInView in Framer's
      // priority order) so every tile snaps to its final, fully-visible
      // state regardless of scroll position.
      animate={reduced ? "visible" : undefined}
      viewport={{ once: true, amount: 0.3 }}
      variants={reveal(delay, reduced)}
      className={`bento-tile ${className}`}
      style={style}
    >
      {children}
    </motion.div>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path d="M9 0C9 5 5 9 0 9C5 9 9 13 9 18C9 13 13 9 18 9C13 9 9 5 9 0Z" fill="var(--color-gold)" />
    </svg>
  );
}

export default function About() {
  const reduced = usePrefersReducedMotion();

  return (
    <section id="about" className="relative px-6 py-20 sm:px-10 sm:py-24">
      <div className="mx-auto max-w-[1210px]">
        <motion.p
          initial="hidden"
          whileInView="visible"
          // See CLAUDE.md: `initial`/`whileInView` resolves its hidden pose
          // against the pre-hydration `reduced === false` variants, and an
          // element that never intersects stays stuck there. `animate`
          // outranks `whileInView`, so this force-corrects it.
          animate={reduced ? "visible" : undefined}
          viewport={{ once: true, amount: 0.6 }}
          variants={reveal(0, reduced)}
          className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#8A8175]"
        >
          About
        </motion.p>

        <div className="mt-8 grid grid-cols-12 gap-[15px] sm:mt-10">
          {/* Statement — the big anchor. No photo (the hero already owns the
              face); the type itself is the visual weight here. */}
          <Tile
            className="col-span-12 min-[820px]:col-span-8 min-[820px]:row-span-2"
            style={{ background: STATEMENT_BG }}
            delay={0.05}
            reduced={reduced}
          >
            <h2 className="font-display font-extrabold leading-none tracking-[-0.025em] text-ink text-[clamp(2.1rem,3.9vw,3.7rem)]">
              I pick problems that need{" "}
              <span className="text-coral">more than a database</span>.
            </h2>
            <p className="mt-5 max-w-[42ch] font-body text-[1.1rem] text-[#5F584D]">
              B.Tech CSE-AI at Maharaja Agrasen Institute of Technology in
              Delhi, graduating 2028. Every project here comes down to a
              scoring system — how much a citation is worth, how much a click
              is worth, how much a good answer is worth. All three show their
              working rather than asking you to take it on faith.
            </p>
          </Tile>

          {/* Proof — tall, top-right. */}
          <Tile
            className="col-span-12 min-[820px]:col-span-4 min-[820px]:row-span-2"
            style={{ background: PROOF_BG, borderColor: PROOF_BORDER }}
            delay={0.1}
            reduced={reduced}
          >
            <p
              className="font-body text-xs font-bold uppercase tracking-[0.28em]"
              style={{ color: PROOF_LABEL_COLOR }}
            >
              Proof
            </p>
            <div className="mt-6 flex flex-col gap-5">
              {PROOF_ITEMS.map((item) => (
                <div key={item.value}>
                  <p
                    className="font-display text-xl font-bold leading-tight sm:text-2xl"
                    style={{ color: PROOF_VALUE_COLOR }}
                  >
                    {item.value}
                  </p>
                  <p className="mt-1 font-body text-sm" style={{ color: PROOF_CAPTION_COLOR }}>
                    {item.caption}
                  </p>
                </div>
              ))}
            </div>
          </Tile>

          {/* Three principle tiles — middle row. */}
          {PRINCIPLES.map((principle, index) => (
            <Tile
              key={principle.title}
              className="col-span-12 min-[820px]:col-span-4"
              style={{ background: principle.bg, borderColor: principle.border }}
              delay={0.16 + index * 0.06}
              reduced={reduced}
            >
              <div className="h-1 w-[30px] rounded-full" style={{ backgroundColor: principle.dash }} />
              <p
                className="mt-4 font-display text-xl font-bold leading-tight sm:text-2xl"
                style={{ color: principle.titleColor }}
              >
                {principle.title}
              </p>
              <p className="mt-3 font-body text-sm text-[#574F45] sm:text-base">{principle.copy}</p>
            </Tile>
          ))}

          {/* Toolkit — bottom-left. */}
          <Tile
            className="col-span-12 min-[820px]:col-span-8"
            style={{ background: TOOLKIT_BG, borderColor: TOOLKIT_BORDER }}
            delay={0.34}
            reduced={reduced}
          >
            <p
              className="font-body text-xs font-bold uppercase tracking-[0.28em]"
              style={{ color: TOOLKIT_LABEL_COLOR }}
            >
              Toolkit
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {SKILLS.map((skill) => (
                <span key={skill} className={TOOLKIT_CHIP_CLASS}>
                  {skill}
                </span>
              ))}
            </div>
          </Tile>

          {/* Human note — bottom-right, deliberately small/quiet, a
              footnote rather than a headline. */}
          <Tile
            className="col-span-12 min-[820px]:col-span-4"
            style={{ background: HUMAN_BG, borderColor: HUMAN_BORDER }}
            delay={0.4}
            reduced={reduced}
          >
            <div className="flex h-full items-center gap-2">
              <SparkleIcon />
              <p className="font-body text-[13.5px] font-medium" style={{ color: HUMAN_TEXT_COLOR }}>
                Starweave and Arthouse Atlas both came out of the same
                sleepless night.
              </p>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}
