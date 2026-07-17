"use client";

import type { CSSProperties } from "react";
import { motion, type Variants } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const EMAIL = "kumarishweta.email@gmail.com";
const [EMAIL_LOCAL, EMAIL_DOMAIN] = EMAIL.split("@").map((part, i) => (i === 0 ? part + "@" : part));
const LINKEDIN_URL = "https://www.linkedin.com/in/arshwetakumari/";
const GITHUB_URL = "https://github.com/Shwetakmishra";
const RESUME_URL = "/Shweta-Kumari-Resume.pdf";

// Email CTA colors — tunables. Set as CSS custom properties on the anchor
// (see `.email-cta`/`.email-cta:hover` in globals.css) rather than plain
// inline styles, specifically so the HOVER state can differ: an inline
// `style` color can't respond to `:hover`, but a custom property consumed
// by a stylesheet rule can. currentColor (the underline span, and the
// hover text-shadow) tracks whichever of these is live automatically.
const EMAIL_COLOR = "#7A2E1E"; // deep warm brown — rich and confident, not the previous muddy olive
const EMAIL_HOVER_COLOR = "#E4674F"; // coral, matches --color-coral

// The visual bookend to the hero's sunrise: cream at the top (continuous
// with whatever calm section precedes this one) deepening into a warm
// amber/coral glow toward the bottom — "sun setting on a bright horizon,"
// deliberately paler than the hero's full-saturation Vivid Sky. Like the
// hero, this section keeps its own opaque background rather than the
// shared ambient aurora (see AmbientBackground.tsx) — aurora is for the
// calm sections in between; hero and this closing section are the two
// deliberate, dedicated-atmosphere bookends. Never goes dark.
const SUNSET_GRADIENT = "linear-gradient(to bottom, #F4EEE4 0%, #F3DDBE 55%, #EFBEA0 100%)";

// Living sunset — tunables for the drifting warmth layered over the static
// gradient above (see .sunset-glow-drift / .sunset-bloom-drift-a/b in
// globals.css for the actual transform-only drift animation, reusing the
// aurora's technique). Large/blurred/warm on purpose — reads as atmosphere,
// not a mesh-gradient effect — but these base opacities were raised from
// their first pass (0.35/0.28/0.26), which combined with the aurora-level
// drift ranges read as essentially static. Durations/ranges live in
// globals.css alongside the aurora's; edit there.
const SUN_GLOW_OPACITY = 0.5;
const SUN_GLOW_SIZE_VH = 55;
const SUN_GLOW_COLOR_RGB = "245, 197, 66"; // gold
const SUNSET_BLOOM_SIZE_VH = 68;
const SUNSET_BLOOM_AMBER_OPACITY = 0.4;
const SUNSET_BLOOM_CORAL_OPACITY = 0.38;

// Tactile pill chips for the secondary links — semi-transparent white over
// the sunset, a warm border pulled from EMAIL_COLOR (#7A2E1E) at low alpha,
// backdrop-blur for a bit of glass. Lift + more-opaque bg + soft warm
// shadow on hover.
const LINK_PILL_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-[rgba(122,46,30,0.16)] bg-[rgba(255,255,255,0.5)] px-5 py-[11px] font-body text-sm font-medium text-ink/80 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.75)] hover:text-ink hover:shadow-[0_10px_24px_-8px_rgba(122,46,30,0.35)]";

function reveal(delay: number, reduced: boolean): Variants {
  if (reduced) {
    return { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } };
  }
  return {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay, ease: EASE_OUT },
    },
  };
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.4 9.4 0 0 1 2.5-.34c.85 0 1.71.11 2.5.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.02 10.02 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
    </svg>
  );
}

export default function Contact() {
  const reduced = usePrefersReducedMotion();

  return (
    <section
      id="contact"
      className="relative overflow-hidden px-6 pb-10 pt-28 sm:px-10 sm:pt-36"
      style={{ background: SUNSET_GRADIENT }}
    >
      {/* Living sunset — two large, soft, heavily-blurred warm blooms drift
          slowly behind the static gradient (offset durations so they never
          sync), plus a low "sun" glow that drifts side to side and gently
          pulses. Same transform-only technique as the site-wide aurora
          (AmbientBackground.tsx), just tuned warmer/slower for the finale.
          A quiet bookend detail, not a second focal point — kept low-
          opacity throughout so text stays legible as it drifts. */}
      <div
        aria-hidden="true"
        className="sunset-bloom-drift-a pointer-events-none absolute -left-[12%] top-[8%] rounded-full blur-3xl"
        style={{
          height: `${SUNSET_BLOOM_SIZE_VH}vh`,
          width: `${SUNSET_BLOOM_SIZE_VH}vh`,
          background: `radial-gradient(circle, rgba(232, 147, 74, ${SUNSET_BLOOM_AMBER_OPACITY}) 0%, transparent 70%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="sunset-bloom-drift-b pointer-events-none absolute -right-[10%] top-[35%] rounded-full blur-3xl"
        style={{
          height: `${SUNSET_BLOOM_SIZE_VH}vh`,
          width: `${SUNSET_BLOOM_SIZE_VH}vh`,
          background: `radial-gradient(circle, rgba(228, 103, 79, ${SUNSET_BLOOM_CORAL_OPACITY}) 0%, transparent 70%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="sunset-glow-drift pointer-events-none absolute left-1/2 top-[60%] rounded-full blur-3xl"
        style={{
          height: `${SUN_GLOW_SIZE_VH}vh`,
          width: `${SUN_GLOW_SIZE_VH}vh`,
          background: `radial-gradient(circle, rgba(${SUN_GLOW_COLOR_RGB}, ${SUN_GLOW_OPACITY}) 0%, transparent 70%)`,
        }}
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={reveal(0, reduced)}
          className="font-display text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl"
        >
          Let&rsquo;s build something people love.
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={reveal(0.1, reduced)}
          className="mt-6 max-w-md font-body text-base text-muted sm:text-lg"
        >
          Open to product roles and good conversations. Reach out anytime.
        </motion.p>

        <motion.a
          href={`mailto:${EMAIL}`}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={reveal(0.2, reduced)}
          className="email-cta group relative mt-10 inline-block break-words font-display text-xl font-bold sm:text-2xl md:text-3xl lg:text-4xl"
          style={
            {
              "--email-color": EMAIL_COLOR,
              "--email-hover-color": EMAIL_HOVER_COLOR,
            } as CSSProperties
          }
        >
          {/* A preferred break point right before the @ — without it,
              break-words/break-all pick an arbitrary mid-word split (e.g.
              "gmail.co" / "m") on narrow screens. <wbr> is only used if
              actually needed to avoid overflow. */}
          {EMAIL_LOCAL}
          <wbr />
          {EMAIL_DOMAIN}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-1 h-[2px] origin-left scale-x-0 bg-current transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
          />
        </motion.a>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={reveal(0.3, reduced)}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className={LINK_PILL_CLASS}>
            <LinkedInIcon />
            LinkedIn
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={LINK_PILL_CLASS}>
            <GithubIcon />
            GitHub
          </a>
          <a href={RESUME_URL} download target="_blank" rel="noopener noreferrer" className={LINK_PILL_CLASS}>
            <DownloadIcon />
            Download CV
          </a>
        </motion.div>
      </div>

      {/* Slim footer bar — the functional baseline, not a design moment:
          static (no scroll-reveal), muted, low-key. */}
      <div className="relative mx-auto mt-24 flex max-w-6xl flex-col items-center gap-4 border-t border-ink/10 pt-6 font-body text-xs text-muted sm:mt-32 sm:flex-row sm:justify-between sm:gap-0">
        <p>© 2026 Shweta Kumari</p>
        <nav className="flex items-center gap-4">
          <a href="#projects" className="transition-colors hover:text-ink">
            Projects
          </a>
          <a href="#about" className="transition-colors hover:text-ink">
            About
          </a>
          <a href="#contact" className="transition-colors hover:text-ink">
            Contact
          </a>
        </nav>
        <a href="#top" className="transition-colors hover:text-ink">
          Back to top ↑
        </a>
      </div>
    </section>
  );
}
