"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useSpring, animate, type Variants } from "motion/react";
import { useHasFinePointer } from "@/lib/useHasFinePointer";
import { useHasMounted } from "@/lib/useHasMounted";
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
const FRAME_DEPTH_PX = 40; // resting translateZ — the forward plane
const FRAME_DEPTH_HOVER_PX = 64; // translateZ while hovered — floats further forward
const FRAME_HOVER_LIFT_PX = -10; // extra translateY while hovered
const FRAME_DEPTH_SPRING = { stiffness: 220, damping: 24, mass: 0.5 };
const COUNT_UP_DURATION = 1.2; // seconds

// Screen-life gleam — a light sweep across the browser frame each time the
// card re-enters view, making the screenshot feel like a live screen rather
// than a flat image.
//
// This replaced an earlier per-phone overlay (gleam + hero-number glow +
// sparkle) built for portrait phone PNGs, whose glow/sparkle were pinned to
// hand-measured percentage coordinates over each phone's own "hero number."
// These projects are desktop web apps with no single hero numeral to bloom
// behind, so those two beats had nothing to anchor to and were dropped;
// the gleam generalizes cleanly because it sweeps the whole frame and needs
// no per-image measurement at all. Don't reintroduce coordinate-pinned
// overlay beats here without an actual anchor to pin them to.
//
// A gentle ease-in-out, deliberately NOT the site's EASE_OUT — this overlay
// is the one intentional exception to "ease-out curves only" (see CLAUDE.md
// motion principles): the gleam should flow across and settle rather than
// snap out of a sharp deceleration curve.
const EASE_IN_OUT: [number, number, number, number] = [0.45, 0, 0.55, 1];
const GLEAM_DELAY = 0.15; // a beat after the card settles, not the instant it arrives
const GLEAM_DURATION = 2.4; // slow, luxurious pass
const GLEAM_OPACITY = 0.34;

// The card must be comfortably in view — not just its top edge crossing
// in — before its stat count-up and gleam replay. Shared by every card via
// `useReplayOnReentry`; doesn't affect the panel's own entrance-reveal
// viewport threshold.
const CARD_REPLAY_AMOUNT = 0.5;

// Every screenshot is captured at 1440x900 @2x and downscaled to 1600x1000,
// so one shared aspect ratio covers all of them — no per-image lock needed
// (contrast the old phone PNGs, which each had their own dimensions).
const SHOT_ASPECT = "aspect-[16/10]";

export interface Project {
  slug: string; // stable React key + anchor id
  image: string; // filename (no extension) in /public/projects/
  title: string;
  tagline: string; // one-line "what it is", sits under the title
  // Build year, rendered quietly beside the title. Undated work reads as
  // "unknown" to a reviewer, and unknowns get resolved pessimistically —
  // recency is the main signal a student portfolio has. Deliberately a
  // per-card year rather than a prose line like "all built this past year",
  // which would go stale the moment the year turns.
  year: string;
  stat: string; // supports thousands separators, e.g. "1,053"
  label: string;
  description: string;
  stack: string[];
  liveUrl: string;
  repoUrl: string;
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
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
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

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-2.92-.89-2.92-2.89 0-.86.31-1.56.82-2.11-.08-.2-.36-1 .08-2.08 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2 -.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.08.16 1.88.08 2.08.51.55.82 1.25.82 2.11 0 2.01-1.15 2.69-2.93 2.89.3.26.56.76.56 1.54 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.99 7.99 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

// The big stat number ticks up from 0 each time the card re-enters view
// (see `useReplayOnReentry`). Reduced motion shows the final value
// immediately, no animation, ever.
//
// SERVER-RENDERED VALUE — this must never be `0` in the HTML. These three
// figures (1,053 / 497 / 6) are the strongest evidence on the page, and
// crawlers and link-preview scrapers frequently don't run JavaScript at all,
// so a count-up that starts from 0 in the markup shows them zeroes where the
// numbers should be. `useHasMounted()` is false during SSR and on the
// hydrating render, so the real figure ships in the HTML; only once React has
// committed on the client does this fall back to the animation's starting 0.
//
// That server-value -> 0 handoff is invisible in practice: the hero is
// `min-h-screen`, so no project card is ever above the fold on load, and the
// swap happens well before anything scrolls into view. Don't "simplify" this
// back to a plain useState(0) — that's the bug this replaced.
//
// Thousands separators are supported: the source string may be "1,053", so
// the numeric target is parsed from digits alone and the separator is
// re-applied on output. Without this, parseInt("1,053") would stop at the
// comma and count up to 1.
//
// LAYOUT STABILITY — `tabular-nums` keeps every digit the same width, so the
// number doesn't shimmy internally as it counts (in a proportional face,
// changing one digit shifts every digit to its right).
//
// It deliberately does NOT reserve its final width, because the caller
// stacks this ABOVE its label rather than beside it, leaving the number
// alone on its line where a changing width has nothing to push. When they
// did share a row this was a real shipped bug — the growing number squeezed
// the label into wrapping and resized the card mid-count. Read the
// "animated number must reserve its final width" rule in CLAUDE.md before
// putting anything back on this line.
function StatCounter({
  stat,
  playToken,
  reduced,
}: {
  stat: string;
  playToken: number;
  reduced: boolean;
}) {
  const digits = stat.replace(/[^0-9]/g, "");
  const numeric = parseInt(digits, 10);
  const grouped = stat.includes(",");
  const suffix = stat.replace(/^[\d,]+/, ""); // e.g. the "%" in "60%", "" in "497"
  const [display, setDisplay] = useState(0);
  const mounted = useHasMounted();

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
  // Order matters. Reduced motion and the pre-hydration render both want the
  // true figure; only a mounted client that hasn't played yet shows 0.
  const shown = reduced || !mounted ? numeric : display;
  const format = (n: number) => (grouped ? n.toLocaleString("en-US") : String(n));

  return (
    <span className="tabular-nums">
      {format(shown)}
      {suffix}
    </span>
  );
}

// A plain framed screenshot — deliberately NO fake browser chrome.
//
// An earlier version wrapped each shot in a mock window: dark title bar,
// three traffic lights, an address pill showing the live domain. Three
// reasons it came out:
//
//  1. Double header. All three apps have their own nav bar at the top of the
//     screenshot, so the fake chrome stacked a second header above a real
//     one and the eye had to cross both to reach the product.
//  2. A frame has to read as not-content. The chrome was dark (#302C28) and
//     so are all three apps, so it merged with them instead of framing them.
//  3. The address pill showed a `*.vercel.app` subdomain. A custom domain
//     would be worth featuring; a free subdomain is not, and putting it in
//     large type draws the eye straight to it.
//
// The screenshots already carry their own app chrome, and the rounded corners
// plus drop shadow are enough to read as "a screen". The "this is really
// deployed" point is made by the Live demo link and once in the Projects
// intro — it does not need a third restatement in fake pixels.
function AppScreenshot({
  image,
  title,
  hovered,
  play,
}: {
  image: string;
  title: string;
  hovered: boolean;
  play: boolean;
}) {
  return (
    <div
      className={`relative ${SHOT_ASPECT} w-full overflow-hidden rounded-xl bg-[#12100E] ring-1 ring-black/10`}
      style={{
        boxShadow: hovered
          ? "0 32px 55px -18px rgba(32, 30, 27, 0.42)"
          : "0 20px 38px -16px rgba(32, 30, 27, 0.3)",
        transition: "box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <Image
        src={`/projects/${image}.png`}
        alt={`${title} — screenshot`}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover object-top"
      />
      <motion.div
        aria-hidden="true"
        initial={{ x: "-130%" }}
        animate={play ? { x: "170%" } : { x: "-130%" }}
        transition={{ duration: GLEAM_DURATION, delay: GLEAM_DELAY, ease: EASE_IN_OUT }}
        style={{
          position: "absolute",
          top: "-20%",
          left: 0,
          width: "45%",
          height: "140%",
          background:
            "linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.85) 50%, transparent 75%)",
          transform: "rotate(-16deg)",
          opacity: GLEAM_OPACITY,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
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
  // aurora's own colour would bleed through the panel and muddy its accent.
  const panelTint = `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, ${TINT_OPACITY_START}), rgba(${r}, ${g}, ${b}, ${TINT_OPACITY_END})), var(--color-cream)`;
  const deepAccent = darken(project.accentHex, TEXT_DARKEN_AMOUNT);

  const cardRef = useRef<HTMLElement>(null);

  // Single shared re-entry trigger for this card's stat count-up and gleam,
  // so both replay together rather than off two independent observers.
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
  const frameZ = useSpring(0, FRAME_DEPTH_SPRING);
  const frameY = useSpring(0, FRAME_DEPTH_SPRING);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!reduced) frameZ.set(FRAME_DEPTH_PX);
  }, [reduced, frameZ]);

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
    frameZ.set(FRAME_DEPTH_HOVER_PX);
    frameY.set(FRAME_HOVER_LIFT_PX);
  };

  const handlePointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setHovered(false);
    if (!interactive) return;
    frameZ.set(FRAME_DEPTH_PX);
    frameY.set(0);
  };

  const linkBase =
    "group inline-flex items-center gap-2 font-body text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-70";

  return (
    <div className="[perspective:1400px]">
      <motion.article
        ref={cardRef}
        id={project.slug}
        initial="hidden"
        whileInView="visible"
        // See CLAUDE.md: `initial`/`whileInView` resolves its hidden pose
        // against the pre-hydration `reduced === false` variants, and an
        // element that never intersects stays stuck there. `animate`
        // outranks `whileInView`, so this force-corrects it.
        animate={reduced ? "visible" : undefined}
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
          {/* The screenshot sits on a forward 3D plane (translateZ) inside
              the tilting panel, so it visibly floats above the tinted surface
              as the card tilts — that parallax is what sells the 3D. */}
          <motion.div
            variants={reveal(0.1, reduced)}
            className="w-full shrink-0 lg:w-[54%]"
          >
            <motion.div style={{ z: frameZ, y: frameY }}>
              <AppScreenshot
                image={project.image}
                title={project.title}
                hovered={hovered}
                play={playToken > 0}
              />
            </motion.div>
          </motion.div>

          <motion.div variants={reveal(0.2, reduced)} className="w-full lg:w-[46%]">
            {/* Year sits ABOVE the title as a small date eyebrow, not beside
                it. Baseline-aligned on the title's row with justify-between, it
                floated off to the far right with a dead gap between — reading
                as an orphaned number rather than a date. Putting it in the
                stack-chip row was worse still: it looked like a library
                alongside d3-force. */}
            <p className="font-body text-xs tracking-[0.18em] text-muted">
              {project.year}
            </p>
            <h3 className="mt-1.5 font-display text-2xl font-extrabold uppercase tracking-tight text-ink sm:text-3xl">
              {project.title}
            </h3>
            <p className="mt-1.5 font-body text-sm text-muted sm:text-base">
              {project.tagline}
            </p>

            {/* Stat STACKED over its label, not beside it. Beside it, the
                label only got the column width the number didn't use, so a
                four-digit stat squeezed it onto two lines and split "297 /
                artists" across the break. Stacked, the label always has the
                full column: one line on every card, at every width, with no
                per-card exception — the card spine stays identical across
                all three, which is the point of the spine. */}
            <div className="mt-7">
              <span
                className="block font-display text-5xl font-extrabold leading-none sm:text-6xl"
                style={{ color: deepAccent }}
              >
                <StatCounter stat={project.stat} playToken={playToken} reduced={reduced} />
              </span>
              <p className="mt-2.5 font-body text-xs uppercase tracking-wide text-muted sm:text-sm">
                {project.label}
              </p>
            </div>

            <p className="mt-6 max-w-md font-body text-base text-ink/80 sm:text-lg">
              {project.description}
            </p>

            {/* Stack chips — the same tactile-pill construction used in
                About's toolkit and Contact's links. */}
            <ul className="mt-6 flex flex-wrap gap-1.5">
              {project.stack.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border border-ink/10 bg-white/55 px-2.5 py-1 font-body text-[11px] text-ink/70 sm:text-xs"
                >
                  {tech}
                </li>
              ))}
            </ul>

            {/* Two real destinations, both external. The previous build
                pointed a single "Read more" at /projects/[slug], a route
                that never existed — every card 404'd. For shipped, publicly
                deployed apps the live demo IS the case study. */}
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkBase}
                style={{ color: deepAccent }}
              >
                Live demo
                <ArrowIcon />
              </a>
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkBase} text-muted`}
              >
                <GitHubIcon />
                Source
              </a>
            </div>
          </motion.div>
        </div>
      </motion.article>
    </div>
  );
}
