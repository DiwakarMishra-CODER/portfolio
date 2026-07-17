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

const PROOF_ITEMS = [
  { value: "3+ years", caption: "in end-to-end product" },
  { value: "Top 5 of 120", caption: "Nextleap PM Fellowship" },
  { value: "Ownership Excellence", caption: "Award · Sunstone" },
];

interface Principle {
  title: string;
  copy: string;
  bg: string;
  border: string;
  dash: string;
  titleColor: string;
}

const PRINCIPLES: Principle[] = [
  {
    title: "Value that compounds",
    copy: "Start from real user needs, tie them to what grows the business.",
    bg: "linear-gradient(160deg, rgba(232,147,74,0.30), rgba(232,147,74,0.09))",
    border: "rgba(232,147,74,0.30)",
    dash: "#E8934A",
    titleColor: "#B96E2E",
  },
  {
    title: "Ship, measure, iterate",
    copy: "Fast MVPs, real data, A/B tests. Evidence steers the roadmap.",
    bg: "linear-gradient(160deg, rgba(228,103,79,0.30), rgba(228,103,79,0.09))",
    border: "rgba(228,103,79,0.30)",
    dash: "#E4674F",
    titleColor: "#C24A34",
  },
  {
    title: "Bring the team with you",
    copy: "Keeping design, engineering, and ops rowing the same way.",
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
  "Product Strategy",
  "A/B Testing",
  "Analytics",
  "Gamification",
  "User Research",
  "Figma",
  "SQL",
  "GTM",
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
              I build products that{" "}
              <span className="text-coral">earn their place</span>{" "}
              in people&rsquo;s lives.
            </h2>
            <p className="mt-5 max-w-[42ch] font-body text-[1.1rem] text-[#5F584D]">
              Product Manager with 3+ years of end-to-end ownership — turning
              user problems into products that move the business across
              growth, retention, and monetization.
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
                Off the clock — building AI side projects and learning in public.
              </p>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}
