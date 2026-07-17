"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useSpring, animate, type Variants } from "motion/react";
import { useHasFinePointer } from "@/lib/useHasFinePointer";
import { useReplayOnReentry } from "@/lib/useReplayOnReentry";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// The panel's accent wash is a 135deg gradient (stronger at one corner,
// fading toward the other) rather than a flat tint — a flat 0.1 alpha read
// as invisible, plain grey. No manual color-mixing needed: the browser
// composites rgba(accent, alpha) over cream directly for both stops.
const TINT_OPACITY_START = 0.21;
const TINT_OPACITY_END = 0.1;
// How much darker the accent goes for text, so it stays readable on the
// light tinted panel instead of the pure (lighter-reading) accent hue.
const TEXT_DARKEN_AMOUNT = 0.32;

// Signature interaction tunables — cursor-tilt + layered depth + count-up.
// Kept subtle on purpose: this should read premium, not gimmicky.
const MAX_TILT_DEG = 6; // per-axis cap — higher reads cheap/nauseating
const TILT_SPRING = { stiffness: 150, damping: 20, mass: 0.6 }; // damped, never snaps
const PHONE_DEPTH_PX = 40; // resting translateZ — the forward plane
const PHONE_DEPTH_HOVER_PX = 64; // translateZ while hovered — floats further forward
const PHONE_HOVER_LIFT_PX = -10; // extra translateY while hovered
const PHONE_DEPTH_SPRING = { stiffness: 220, damping: 24, mass: 0.5 };
const COUNT_UP_DURATION = 1.2; // seconds

// Screen-life overlay — a phone screen "coming alive" once per card
// re-entry. Piloted on AI Resume, now also rolled out to Coins; the TIMING
// below (durations/delays/easing) is shared and identical across every
// phone that has this treatment — only each phone's own positions/colors
// (`ScreenLifeConfig`, further down) differ. When rolling this out to a
// new phone, don't retune the timing constants here — reuse them as-is,
// and only add a new position/color config.
//
// A gentle ease-in-out, deliberately NOT the site's EASE_OUT — this overlay
// is the one intentional exception to "ease-out curves only" (see CLAUDE.md
// motion principles): the gleam and glow should flow in and settle rather
// than snap out of a sharp deceleration curve.
const EASE_IN_OUT: [number, number, number, number] = [0.45, 0, 0.55, 1];

// Choreography — each beat arrives in sequence rather than all at once,
// which is what reads as a deliberate moment instead of a single flash.
// Delays are absolute seconds from `play` turning true, not fractions of
// another beat's duration, so each is independently tunable.
const GLEAM_DELAY = 0; // sweep starts first, immediately on scroll-in
const GLEAM_DURATION = 2.4; // slow, luxurious pass (up from 1.8s — still finished too quickly)
const GLEAM_OPACITY = 0.4;
const GLOW_DELAY = 0.7; // begins blooming as the gleam passes over the score
const GLOW_RISE_DURATION = 1.6; // time to reach full bloom
const GLOW_HOLD_DURATION = 0.35; // lingers at full before easing down — the peak shouldn't vanish instantly
const GLOW_SETTLE_DURATION = 0.75; // eases down to the resting glow
const GLOW_DURATION = GLOW_RISE_DURATION + GLOW_HOLD_DURATION + GLOW_SETTLE_DURATION; // total, derived
const GLOW_PEAK_OPACITY = 0.5;
const GLOW_REST_OPACITY = 0.26;
const SPARKLE_DELAY = 1.6; // twinkles last, once the glow has bloomed
const SPARKLE_DURATION = 1.1;

interface ScreenLifeArea {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

interface ScreenLifeConfig {
  aspectClass: string; // Tailwind aspect-ratio utility matching THIS phone's own PNG dimensions
  screenArea: ScreenLifeArea; // clips the gleam sweep to the screen, never the bezel
  glowArea: ScreenLifeArea; // centered behind whatever this phone's "hero number" is
  sparklePos: { xPct: number; yPct: number; sizePct: number };
  gleamColorRgb: string;
  glowColorRgb: string;
}

// PILOT — AI Resume Score. Coordinates measured directly against
// /public/projects/ai-resume.png's own pixel grid (1190×984) — see the
// "AI Resume screen-life overlay" note in CLAUDE.md for why the aspect-lock
// matters (without it, object-contain letterboxes and every percentage
// here drifts off target). Nudge these, don't re-derive from scratch.
const AI_RESUME_SCREEN_LIFE: ScreenLifeConfig = {
  aspectClass: "aspect-[1190/984]",
  screenArea: { xPct: 44, yPct: 17, widthPct: 49, heightPct: 78 },
  glowArea: { xPct: 56, yPct: 44, widthPct: 42, heightPct: 26 }, // "Resume Score / 100/100"
  sparklePos: { xPct: 70, yPct: 39, sizePct: 5 }, // just past the "100/100" numerals
  gleamColorRgb: "255, 255, 255",
  glowColorRgb: "107, 140, 174", // twilight
};

// Coins — gold/reward-energy gesture instead of resume's white/twilight
// pairing, per the explicit Coins brief. Coordinates measured against
// /public/projects/coins.png's own pixel grid (1280×998).
const COINS_SCREEN_LIFE: ScreenLifeConfig = {
  aspectClass: "aspect-[1280/998]",
  screenArea: { xPct: 41, yPct: 15, widthPct: 44, heightPct: 77 },
  glowArea: { xPct: 64, yPct: 40, widthPct: 34, heightPct: 22 }, // "7000 / worth ₹700"
  sparklePos: { xPct: 75, yPct: 34, sizePct: 5 }, // above the coin icon, below the SUNSTONE logo
  gleamColorRgb: "245, 197, 66", // gold — Coins' own gesture, not resume's white
  glowColorRgb: "245, 197, 66", // gold
};

// Keyed by `Project.image` (not `slug` — see the Project interface below).
const SCREEN_LIFE_BY_IMAGE: Record<string, ScreenLifeConfig> = {
  "ai-resume": AI_RESUME_SCREEN_LIFE,
  coins: COINS_SCREEN_LIFE,
};

// The card must be comfortably in view — not just its top edge crossing
// in — before its stat count-up and screen-life overlay (where present)
// replay. Shared by every card via `useReplayOnReentry` below; doesn't
// affect the panel's own entrance-reveal viewport threshold.
const CARD_REPLAY_AMOUNT = 0.5;

export interface Project {
  slug: string; // used for the /projects/[slug] case-study link
  image: string; // filename (no extension) in /public/projects/ — decoupled from slug
  title: string;
  stat: string;
  label: string;
  description: string;
  accentHex: string;
}

function reveal(delay: number, reduced: boolean): Variants {
  if (reduced) {
    return { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } };
  }
  return {
    hidden: { opacity: 0, y: 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay, ease: EASE_OUT },
    },
  };
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgbTuple(hex);
  const scale = 1 - amount;
  return `rgb(${Math.round(r * scale)}, ${Math.round(g * scale)}, ${Math.round(b * scale)})`;
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="transition-transform duration-300 group-hover:translate-x-1"
    >
      <path
        d="M2 8h11M8 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The big stat number ticks up from 0 each time the card re-enters view
// (see `useReplayOnReentry`) — paired with the (AI Resume) screen-life
// overlay, both driven by the same `playToken` so they arrive together on
// every replay, not just the first. Reduced motion shows the final value
// immediately, no animation, ever.
function StatCounter({
  stat,
  playToken,
  reduced,
}: {
  stat: string;
  playToken: number;
  reduced: boolean;
}) {
  const numeric = parseInt(stat, 10);
  const suffix = stat.slice(String(numeric).length);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // playToken === 0 means it has never played yet (or `reduced` is true,
    // in which case `useReplayOnReentry` never advances past 0 either).
    if (reduced || playToken === 0) return;
    const controls = animate(0, numeric, {
      duration: COUNT_UP_DURATION,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [playToken, reduced, numeric]);

  // Computed at render time (not via state) so it's correct immediately even
  // if `reduced` only resolves to its true client value after hydration —
  // `usePrefersReducedMotion` reports `false` on first paint by design, and a
  // useState initializer only runs once, so seeding state from `reduced`
  // directly would get stuck at 0 once it flips true post-hydration.
  const shown = reduced ? numeric : display;

  return (
    <>
      {shown}
      {suffix}
    </>
  );
}

// Makes a phone screen feel "alive" each time the card scrolls into view —
// a light gleam sweep, a soft glow blooming behind that phone's own "hero
// number," and a single sparkle, staggered into a short choreographed
// sequence (gleam → glow → sparkle) rather than firing all at once. Purely
// additive: nothing here renders text or numbers, so it can never duplicate
// what's baked into the screenshot. Positions and colors come from
// `config` (see `ScreenLifeConfig`/`SCREEN_LIFE_BY_IMAGE` above); the
// timing is shared and NOT parameterized — every phone with this treatment
// should feel identical in pace. The caller forces a fresh mount (via
// `key={playToken}`, the same shared token that drives the stat count-up —
// see `useReplayOnReentry`) each time the card re-enters view after a full
// exit, so `play` only ever needs to go from `false` (first mount, nothing
// played yet) to `true` (play once, rest at the final value). No loops,
// and no stale in-flight reverse-transition from a previous play to worry
// about.
function PhoneScreenLife({ play, config }: { play: boolean; config: ScreenLifeConfig }) {
  const { screenArea, glowArea, sparklePos, gleamColorRgb, glowColorRgb } = config;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* Screen gleam — a soft diagonal highlight sweeping once across the
          screen, clipped tightly to the screen area so it never spills onto
          the bezel. */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: `${screenArea.xPct}%`,
          top: `${screenArea.yPct}%`,
          width: `${screenArea.widthPct}%`,
          height: `${screenArea.heightPct}%`,
        }}
      >
        <motion.div
          initial={{ x: "-130%" }}
          animate={play ? { x: "170%" } : { x: "-130%" }}
          transition={{ duration: GLEAM_DURATION, delay: GLEAM_DELAY, ease: EASE_IN_OUT }}
          style={{
            position: "absolute",
            top: "-20%",
            left: 0,
            width: "45%",
            height: "140%",
            background: `linear-gradient(115deg, transparent 25%, rgba(${gleamColorRgb}, 0.85) 50%, transparent 75%)`,
            transform: "rotate(-16deg)",
            opacity: GLEAM_OPACITY,
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* Hero-number glow — blooms up once behind this phone's own "hero
          number" (the score, the balance, etc.), LINGERS at full for a beat
          (the `times` plateau below) so the peak doesn't vanish the instant
          it arrives, then settles to a calm resting glow rather than fading
          away entirely, as if it just locked in and stayed lit. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={
          play
            ? {
                opacity: [0, GLOW_PEAK_OPACITY, GLOW_PEAK_OPACITY, GLOW_REST_OPACITY],
                scale: [0.7, 1.08, 1.08, 1],
              }
            : { opacity: 0, scale: 0.7 }
        }
        transition={{
          duration: GLOW_DURATION,
          delay: GLOW_DELAY,
          ease: EASE_IN_OUT,
          times: [
            0,
            GLOW_RISE_DURATION / GLOW_DURATION,
            (GLOW_RISE_DURATION + GLOW_HOLD_DURATION) / GLOW_DURATION,
            1,
          ],
        }}
        style={{
          position: "absolute",
          left: `${glowArea.xPct}%`,
          top: `${glowArea.yPct}%`,
          width: `${glowArea.widthPct}%`,
          height: `${glowArea.heightPct}%`,
          x: "-50%",
          y: "-50%",
          background: `radial-gradient(circle, rgba(${glowColorRgb}, 0.9) 0%, transparent 70%)`,
          filter: "blur(18px)",
          mixBlendMode: "screen",
        }}
      />

      {/* Sparkle — a single tasteful twinkle near the hero number, reusing
          the same gold four-point star as CursorFollow.tsx's cursor
          sparkle. EASE_IN_OUT softens its fade in/out so it reads as a
          twinkle, not a pop. */}
      <motion.svg
        viewBox="0 0 18 18"
        initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
        animate={
          play
            ? { opacity: [0, 1, 0.85], scale: [0.3, 1.2, 1], rotate: [-20, 8, 0] }
            : { opacity: 0, scale: 0.3, rotate: -20 }
        }
        transition={{ duration: SPARKLE_DURATION, delay: SPARKLE_DELAY, ease: EASE_IN_OUT }}
        style={{
          position: "absolute",
          left: `${sparklePos.xPct}%`,
          top: `${sparklePos.yPct}%`,
          width: `${sparklePos.sizePct}%`,
          aspectRatio: 1,
          x: "-50%",
          y: "-50%",
        }}
      >
        <path
          d="M9 0C9 5 5 9 0 9C5 9 9 13 9 18C9 13 13 9 18 9C13 9 9 5 9 0Z"
          fill="var(--color-gold)"
        />
      </motion.svg>
    </div>
  );
}

export default function ProjectCard({
  project,
  reversed,
  reduced,
}: {
  project: Project;
  reversed: boolean;
  reduced: boolean;
}) {
  const finePointer = useHasFinePointer();
  const interactive = finePointer && !reduced;

  const [r, g, b] = hexToRgbTuple(project.accentHex);
  // Layered as an accent gradient OVER a solid cream backing (not just the
  // gradient alone) — the section behind this panel is transparent so the
  // site-wide aurora shows through, and without an opaque backing here the
  // aurora's own colour would bleed through the panel and muddy its accent
  // (e.g. a coral bloom washing out AI Resume Score's blue tint). The cream
  // backing keeps each panel reading as its own accent regardless of
  // whichever bloom happens to drift behind it.
  const panelTint = `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, ${TINT_OPACITY_START}), rgba(${r}, ${g}, ${b}, ${TINT_OPACITY_END})), var(--color-cream)`;
  const deepAccent = darken(project.accentHex, TEXT_DARKEN_AMOUNT);

  const cardRef = useRef<HTMLElement>(null);
  const screenLife = SCREEN_LIFE_BY_IMAGE[project.image];

  // Single shared re-entry trigger for this card's stat count-up and (where
  // present) screen-life overlay, so both replay together rather than off
  // two independent observers. See `useReplayOnReentry` for the full
  // "comfortably entered, only re-arms after a full exit" behavior.
  const playToken = useReplayOnReentry(cardRef, CARD_REPLAY_AMOUNT, reduced);

  const rotateX = useSpring(0, TILT_SPRING);
  const rotateY = useSpring(0, TILT_SPRING);
  // Seeded at 0 (the reduced-motion resting value) rather than gating the
  // initial value on `reduced` directly: usePrefersReducedMotion reports
  // `false` on first paint by design (hydration-safe), and a useSpring
  // initial value — like useState's — only applies once, so seeding from
  // `reduced` would get the resting depth stuck at 0 forever if the real
  // preference (resolved a moment later) turns out to be "no reduced
  // motion." The effect below corrects it once `reduced` settles.
  const phoneZ = useSpring(0, PHONE_DEPTH_SPRING);
  const phoneY = useSpring(0, PHONE_DEPTH_SPRING);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!reduced) phoneZ.set(PHONE_DEPTH_PX);
  }, [reduced, phoneZ]);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * MAX_TILT_DEG * 2);
    rotateX.set(-py * MAX_TILT_DEG * 2);
  };

  const handlePointerEnter = () => {
    if (!interactive) return;
    setHovered(true);
    phoneZ.set(PHONE_DEPTH_HOVER_PX);
    phoneY.set(PHONE_HOVER_LIFT_PX);
  };

  const handlePointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setHovered(false);
    if (!interactive) return;
    phoneZ.set(PHONE_DEPTH_PX);
    phoneY.set(0);
  };

  return (
    <div className="[perspective:1400px]">
      <motion.article
        ref={cardRef}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={reveal(0, reduced)}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className="rounded-3xl p-8 shadow-[0_20px_45px_-15px_rgba(32,30,27,0.18)] sm:p-10 lg:p-12"
        style={{
          background: panelTint,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className={`flex flex-col gap-10 sm:gap-12 lg:items-center lg:gap-16 ${
            reversed ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}
        >
          {/* Phones — pre-cut transparent PNGs, object-contain (never cropped
              or masked). Sit on a forward 3D plane (translateZ) inside the
              tilting panel, so they visibly float above the tinted surface
              as the card tilts — that parallax is what sells the 3D. A soft
              ink-toned drop-shadow (follows the phones' actual silhouette,
              not a bounding box) lifts them further, and deepens on hover. */}
          <motion.div
            variants={reveal(0.1, reduced)}
            className={`relative w-full shrink-0 lg:w-1/2 ${
              screenLife
                ? "flex h-72 items-center justify-center sm:h-80 lg:h-[26rem]"
                : "h-72 sm:h-80 lg:h-[26rem]"
            }`}
          >
            <motion.div
              style={{ z: phoneZ, y: phoneY }}
              className={
                screenLife ? `relative ${screenLife.aspectClass} h-full max-w-full` : "relative h-full w-full"
              }
            >
              <Image
                src={`/projects/${project.image}.png`}
                alt={`${project.title} preview`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain"
                style={{
                  filter: hovered
                    ? "drop-shadow(0 32px 50px rgba(32, 30, 27, 0.3))"
                    : "drop-shadow(0 20px 35px rgba(32, 30, 27, 0.2))",
                  transition: "filter 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
              {screenLife && (
                <PhoneScreenLife key={playToken} play={playToken > 0} config={screenLife} />
              )}
            </motion.div>
          </motion.div>

          <motion.div variants={reveal(0.2, reduced)} className="w-full lg:w-1/2">
            <span
              className="font-display text-6xl font-extrabold leading-none sm:text-7xl"
              style={{ color: deepAccent }}
            >
              <StatCounter stat={project.stat} playToken={playToken} reduced={reduced} />
            </span>
            <p className="mt-3 font-body text-sm uppercase tracking-wide text-muted">
              {project.label}
            </p>
            <p className="mt-6 max-w-md font-body text-base text-ink/80 sm:text-lg">
              {project.description}
            </p>
            <Link
              href={`/projects/${project.slug}`}
              className="group mt-8 inline-flex items-center gap-2 font-body text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-75"
              style={{ color: deepAccent }}
            >
              Read more
              <ArrowIcon />
            </Link>
          </motion.div>
        </div>
      </motion.article>
    </div>
  );
}
