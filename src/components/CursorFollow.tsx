"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const FINE_POINTER_QUERY = "(pointer: fine)";

function subscribeFinePointer(callback: () => void) {
  const mediaQuery = window.matchMedia(FINE_POINTER_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getFinePointerSnapshot() {
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}

function getFinePointerServerSnapshot() {
  return false;
}

// Custom site-wide cursor accent — a four-point ink star plus a soft warm
// light-bloom, both riding ALONGSIDE the normal system cursor (not a
// replacement — see globals.css). Desktop/fine-pointer only. Mounted once
// in layout.tsx (same pattern as AmbientBackground) — it now has to read on
// EVERY section, hero and the light cream sections alike, not just the
// hero like the previous hero-bounded version.
//
// All tunable. Star: size/color/opacity/hover-scale/self-glow/spring.
const STAR_SIZE_PX = 44;
// Ink, not coral — coral nearly matches the hero's own coral gradient band
// (and gold/white vanish on the cream sections), so neither reads reliably
// everywhere. Ink is dark against every band of the hero (twilight/amber/
// coral all sit mid-lightness) AND against cream, where it's already the
// primary text color — the one color proven to contrast on both.
const STAR_COLOR = "#201E1B";
const STAR_OPACITY = 0.9;
const STAR_HOVER_SCALE = 1.35; // subtle scale-up over links/buttons/inputs
// The self-glow is warm gold, not ink — a dark glow around a dark star
// would add no contrast. This gives the dark star a soft warm halo instead,
// which also helps it stand out against the hero's darker twilight band.
const STAR_GLOW_COLOR = "#F5C542";
const STAR_GLOW_BLUR_PX = 6;
// Near-1:1 tracking — must read as the actual cursor, not a laggy trailing
// sparkle, so this spring is stiff/light.
const STAR_SPRING = { stiffness: 900, damping: 50, mass: 0.4 };
const HOVER_SCALE_SPRING = { stiffness: 300, damping: 20, mass: 0.5 };

// Glow: radius/opacity/color/spring.
const GLOW_RADIUS_PX = 70; // soft bloom radius (140px diameter)
const GLOW_OPACITY = 0.3;
const GLOW_COLOR_INNER_RGB = "245, 197, 66"; // gold, glow centre
const GLOW_COLOR_OUTER_RGB = "232, 147, 74"; // amber, glow edge
// Softer/heavier than the star's spring — lags a little behind it for a
// gentle comet feel, the opposite of the star's near-instant tracking.
const GLOW_SPRING = { stiffness: 40, damping: 30, mass: 1 };

const VISIBILITY_SPRING = { stiffness: 200, damping: 20 };

const STAR_PATH =
  "M28.2389 6.4541L28.4872 17.9121C28.6068 23.4275 33.0494 27.8701 38.5647 27.9896L50.0227 28.2379L38.5647 28.4863C33.0494 28.6058 28.6068 33.0484 28.4872 38.5638L28.2389 50.0218L27.9906 38.5638C27.871 33.0484 23.4285 28.6058 17.9131 28.4863L6.45508 28.2379L17.9131 27.9896C23.4285 27.8701 27.871 23.4275 27.9906 17.9121L28.2389 6.4541Z";

const INTERACTIVE_SELECTOR = "a, button, [role='button'], input, textarea, select, summary";

export default function CursorFollow() {
  const canHover = useSyncExternalStore(
    subscribeFinePointer,
    getFinePointerSnapshot,
    getFinePointerServerSnapshot
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hoveringInteractive, setHoveringInteractive] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const visible = useMotionValue(0);
  const hoverScale = useMotionValue(1);

  const starSpringX = useSpring(x, STAR_SPRING);
  const starSpringY = useSpring(y, STAR_SPRING);
  const starOpacitySpring = useSpring(visible, VISIBILITY_SPRING);
  const hoverScaleSpring = useSpring(hoverScale, HOVER_SCALE_SPRING);

  const glowSpringX = useSpring(x, GLOW_SPRING);
  const glowSpringY = useSpring(y, GLOW_SPRING);
  const glowOpacitySpring = useSpring(visible, VISIBILITY_SPRING);

  useEffect(() => {
    hoverScale.set(hoveringInteractive ? STAR_HOVER_SCALE : 1);
  }, [hoveringInteractive, hoverScale]);

  useEffect(() => {
    if (!canHover) return;

    const handleMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      visible.set(1);
      const target = e.target as HTMLElement | null;
      setHoveringInteractive(Boolean(target?.closest(INTERACTIVE_SELECTOR)));
    };
    const handleLeave = () => visible.set(0);

    document.addEventListener("mousemove", handleMove);
    document.documentElement.addEventListener("mouseleave", handleLeave);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
    };
  }, [canHover, x, y, visible]);

  if (!canHover) return null;

  // Reduced motion: position tracks 1:1 (no spring lag/smoothing at all,
  // on either the star or the glow) and the hover-scale snaps instead of
  // easing. Opacity fade for show/hide is a discrete state change rather
  // than continuous motion, so it's left springy either way — it's not the
  // kind of "lag" this guardrail is about.
  const starX = prefersReducedMotion ? x : starSpringX;
  const starY = prefersReducedMotion ? y : starSpringY;
  const starScale = prefersReducedMotion ? (hoveringInteractive ? STAR_HOVER_SCALE : 1) : hoverScaleSpring;
  const glowX = prefersReducedMotion ? x : glowSpringX;
  const glowY = prefersReducedMotion ? y : glowSpringY;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999]">
      {/* Warm light-bloom — trails slightly behind the star for a gentle
          comet feel. Plain alpha compositing, no mix-blend-mode: unlike the
          old hero-only version (which used mix-blend-mode: screen against
          the vivid gradient), this now has to read on the light cream
          sections too, and screen-blending a warm colour onto near-white
          washes it out almost entirely. Plain alpha is the same technique
          the site-wide aurora blooms use to stay visible on cream. */}
      <motion.div
        className="absolute left-0 top-0 rounded-full blur-2xl"
        style={{
          x: glowX,
          y: glowY,
          translateX: "-50%",
          translateY: "-50%",
          width: `${GLOW_RADIUS_PX * 2}px`,
          height: `${GLOW_RADIUS_PX * 2}px`,
          opacity: glowOpacitySpring,
          background: `radial-gradient(circle, rgba(${GLOW_COLOR_INNER_RGB}, ${GLOW_OPACITY}) 0%, rgba(${GLOW_COLOR_OUTER_RGB}, ${GLOW_OPACITY * 0.6}) 50%, transparent 75%)`,
        }}
      />

      {/* The star IS the cursor. */}
      <motion.svg
        viewBox="0 0 57 57"
        className="absolute left-0 top-0"
        style={{
          x: starX,
          y: starY,
          translateX: "-50%",
          translateY: "-50%",
          scale: starScale,
          width: STAR_SIZE_PX,
          height: STAR_SIZE_PX,
          opacity: starOpacitySpring,
          filter: `drop-shadow(0 0 ${STAR_GLOW_BLUR_PX}px ${STAR_GLOW_COLOR})`,
        }}
      >
        <path d={STAR_PATH} fill={STAR_COLOR} fillOpacity={STAR_OPACITY} />
      </motion.svg>
    </div>
  );
}
