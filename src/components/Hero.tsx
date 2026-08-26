"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, type Variants } from "motion/react";
import GoldenHourSky from "./GoldenHourSky";
import HeroEmbers from "./HeroEmbers";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const navLinks = [
  { href: "#projects", label: "Projects" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

// The hero cut-out figure is OPTIONAL and currently off.
//
// Set this to the path of a transparent-background PNG in /public (a real
// alpha channel — not a checkerboard baked into opaque pixels, which has
// been mistakenly supplied before) and the figure returns to the
// bottom-right of the scene, with the type composing around it exactly as
// before. While it's null the hero runs as a type-only composition: the
// text column widens and centers itself, which reads as deliberate rather
// than as a layout with a hole in it.
//
// Recommended source: a portrait roughly 896x1152, cut out at the
// shoulders/waist, shot or cropped so the subject faces slightly LEFT —
// the warm grade and rim-light below assume the light comes from the
// upper-right (see GoldenHourSky.tsx's sun-glow).
const PORTRAIT_SRC: string | null = null;

// The cut-out's source photo is neutral/studio-lit; the scene is a warm
// sunset. This is what integrates the figure into the light — tune the
// whole effect from this one dial. Three layers, all masked to the
// silhouette via the PNG's own alpha channel:
//  1. CUTOUT_FILTER — a baseline warm nudge on the whole image.
//  2. CUTOUT_WARM_GRADE (soft-light) — warm on the side facing the sun-glow
//     (upper-right, see GoldenHourSky.tsx), cooling toward the shadow side.
//  3. CUTOUT_RIM_LIGHT (screen) — a brighter, tighter highlight on the
//     sun-facing edge, so it reads as lit from a direction, not just tinted.
const CUTOUT_GRADE_STRENGTH = 1; // multiplier for the warm/cool grade + rim-light intensity — dial here
const CUTOUT_FILTER =
  "sepia(0.18) saturate(1.15) hue-rotate(-6deg) brightness(1.04) contrast(1.03)";
const CUTOUT_WARM_GRADE = `linear-gradient(220deg, rgba(245, 197, 66, ${
  0.6 * CUTOUT_GRADE_STRENGTH
}) 0%, rgba(232, 147, 74, ${
  0.35 * CUTOUT_GRADE_STRENGTH
}) 35%, transparent 60%, rgba(107, 140, 174, ${
  0.22 * CUTOUT_GRADE_STRENGTH
}) 100%)`;
const CUTOUT_RIM_LIGHT = `linear-gradient(205deg, rgba(255, 240, 205, ${
  0.7 * CUTOUT_GRADE_STRENGTH
}) 0%, transparent 25%)`;

function riseIn(delay: number, reduced: boolean, distance = 28): Variants {
  if (reduced) {
    return { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } };
  }
  return {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay, ease: EASE_OUT },
    },
  };
}

// The cut-out figure: source image + warm-grade + rim-light overlays, each
// masked to the silhouette (via the same PNG's alpha channel) so every wash
// lands only on the subject, never as a rectangle over the transparent
// background. Renders nothing when PORTRAIT_SRC is null.
function CutoutFigure({ className }: { className?: string }) {
  if (!PORTRAIT_SRC) return null;

  const maskStyle = {
    maskImage: `url(${PORTRAIT_SRC})`,
    maskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskImage: `url(${PORTRAIT_SRC})`,
    WebkitMaskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
  } as const;

  return (
    <div className={`relative ${className ?? ""}`}>
      <Image
        src={PORTRAIT_SRC}
        alt="Diwakar Mishra"
        width={896}
        height={1152}
        priority
        className="h-full w-auto object-contain"
        style={{ filter: CUTOUT_FILTER }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: CUTOUT_WARM_GRADE,
          mixBlendMode: "soft-light",
          ...maskStyle,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: CUTOUT_RIM_LIGHT,
          mixBlendMode: "screen",
          ...maskStyle,
        }}
      />
    </div>
  );
}

export default function Hero() {
  const reduced = usePrefersReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  // Minimal scroll-spy: highlights the nav link for whichever section
  // (#projects, #about, #contact) is currently most in view. Sections that
  // don't exist yet are simply skipped.
  useEffect(() => {
    const sections = navLinks
      .map((link) => document.getElementById(link.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (mostVisible) {
          setActiveHash(`#${mostVisible.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen flex-col overflow-hidden"
    >
      <GoldenHourSky />
      <HeroEmbers containerRef={heroRef} />

      {/* Nav — above the cut-out figure so it's never occluded */}
      <nav className="relative z-30 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
        <a
          href="#top"
          className="hero-text-glow font-display text-2xl tracking-wide text-cream"
          aria-label="Diwakar Mishra, home"
        >
          dm
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 font-body text-sm font-medium tracking-wide text-cream sm:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`hero-text-glow transition-colors hover:text-gold ${
                  activeHash === link.href ? "text-gold" : ""
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="flex flex-col gap-1.5 p-2 sm:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span
            className={`block h-0.5 w-6 bg-cream transition-transform ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-cream transition-opacity ${
              menuOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-cream transition-transform ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile menu panel — a dark scrim here is fine (it's a purpose-built
          dropdown overlay, not the persistent hero backdrop the "no heavy
          scrims" rule is about), and it's what makes the cream links legible. */}
      {menuOpen && (
        <ul
          id="mobile-menu"
          className="relative z-30 flex flex-col items-center gap-4 bg-ink/85 pb-8 font-body text-base font-medium text-cream backdrop-blur-sm sm:hidden"
        >
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`transition-colors hover:text-gold ${
                  activeHash === link.href ? "text-gold" : ""
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* Mobile composition: simple stacked flow, no overlap with the type —
          legibility first. With a figure it's top-aligned and the figure is
          anchored to the bottom edge via mt-auto; with no figure the whole
          column centers vertically instead, otherwise the type clings to the
          top and leaves most of the screen as empty gradient. */}
      <div
        className={`relative z-10 flex flex-1 flex-col items-center px-6 pb-0 text-center sm:hidden ${
          PORTRAIT_SRC ? "pt-6" : "justify-center pb-16"
        }`}
      >
        <motion.p
          initial="hidden"
          animate="visible"
          variants={riseIn(0, reduced)}
          className="hero-text-glow font-display text-sm font-bold uppercase tracking-[0.4em] text-cream"
        >
          Diwakar Mishra
        </motion.p>
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={riseIn(0.1, reduced)}
          className="hero-heading-shadow mt-4 font-display text-[8.4vw] font-extrabold uppercase leading-[0.85] tracking-tight text-cream"
        >
          Software
        </motion.h1>
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={riseIn(0.22, reduced)}
          className="hero-heading-shadow font-display text-[8.4vw] font-extrabold uppercase leading-[0.85] tracking-tight text-cream"
        >
          Engineer
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="visible"
          variants={riseIn(0.35, reduced)}
          className="hero-text-glow mt-4 max-w-xs font-body text-base text-cream/90"
        >
          I build complete products — data model, algorithm, interface.
        </motion.p>

        {PORTRAIT_SRC && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={riseIn(0.5, reduced, 40)}
            className="relative mt-auto"
          >
            <CutoutFigure className="h-[34vh] max-h-72" />
          </motion.div>
        )}
      </div>

      {/* Desktop composition: a "stage" capped at max-w-[1600px] — close to
          (or equal to) the actual viewport width for typical laptop/desktop
          sizes (≤1600px), so "% from the edge" below reads as intended for
          the common case. Beyond 1600px the relationship between the type
          and the figure simply freezes (stops scaling) rather than drifting
          apart — the figure's width is driven by a fixed vh height (not a
          width percentage), so there's no way to keep type/figure
          perfectly proportional at literally every width; capping is what
          keeps "she kisses the type" true across the realistic range
          instead of only at one test width. */}
      <div className="relative mx-auto hidden w-full max-w-[1600px] flex-1 sm:block">
        {/* Eyebrow → PRODUCT → MANAGER → tagline: ONE left-aligned,
            vertically centered column, so it reads as a single intentional
            cluster rather than scattered pieces with dead space around them. */}
        {/* Column width/inset depends on whether the figure is present: with
            a cut-out it stays a left-aligned 64% so the type composes against
            her; with no figure it widens and centers, so the hero reads as a
            deliberate type-only composition rather than one with dead space
            on the right where a figure used to be.
            "SOFTWARE"/"ENGINEER" are 8 characters against the previous
            build's 7 ("PRODUCT"/"MANAGER"), so the xl display size steps
            down 9.25rem -> 8.5rem to keep both words on one line — see
            CLAUDE.md's note on re-measuring rendered text width. */}
        <div
          className={`absolute inset-y-0 z-10 flex flex-col justify-center text-left ${
            PORTRAIT_SRC ? "left-[6%] w-[64%]" : "left-[6%] right-[6%] w-auto"
          }`}
        >
          <motion.p
            initial="hidden"
            animate="visible"
            variants={riseIn(0, reduced)}
            className="hero-text-glow font-display text-base font-bold uppercase tracking-[0.4em] text-cream sm:text-xl lg:text-2xl"
          >
            Diwakar Mishra
          </motion.p>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={riseIn(0.1, reduced)}
            className="hero-heading-shadow mt-3 font-display text-[2.125rem] font-extrabold uppercase leading-[0.82] tracking-tight text-cream sm:text-[3rem] lg:text-[5rem] xl:text-[8.5rem]"
          >
            Software
          </motion.h1>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={riseIn(0.25, reduced)}
            className="hero-heading-shadow font-display text-[2.125rem] font-extrabold uppercase leading-[0.82] tracking-tight text-cream sm:text-[3rem] lg:text-[5rem] xl:text-[8.5rem]"
          >
            Engineer
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={riseIn(0.55, reduced)}
            className="hero-text-glow mt-6 max-w-xl font-body text-base text-cream/90 sm:text-lg"
          >
            I build complete products — data model, algorithm, interface.
          </motion.p>
        </div>

        {/* Grounding glow + cut-out figure. Both are gated on PORTRAIT_SRC:
            the glow exists specifically to ground the figure against the
            bottom edge, so on its own it would just be an unexplained warm
            smudge in the corner. */}
        {PORTRAIT_SRC && (
          <>
            {/* Warm ambient light where the figure meets the bottom — not a
                literal shadow (there's no ground plane in this scene). */}
            <div
              aria-hidden="true"
              className="absolute bottom-0 right-[2%] z-[9] h-24 w-[34%] rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(245, 197, 66, 0.35) 0%, transparent 70%)",
              }}
            />

            {/* Bottom-right, flush to the hero's bottom edge, in front of the
                type (z-20 > z-10) so only the tail end of "ENGINEER" tucks
                behind the shoulder/hair by design. */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={riseIn(0.4, reduced, 40)}
              className="absolute bottom-0 right-[5%] z-20"
            >
              <CutoutFigure className="h-[70vh] lg:h-[74vh]" />
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}
