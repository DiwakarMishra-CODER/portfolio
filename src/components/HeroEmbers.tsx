"use client";

import { useEffect, useRef, type RefObject } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// Gotcha (testing only): Playwright's element .screenshot() on this canvas
// is not byte-stable between captures even when the rAF loop is genuinely
// paused — shadowBlur below introduces compositor/GPU noise. To assert
// "is this frame frozen", compare canvas.toDataURL() (via page.evaluate)
// instead of a screenshot diff.

// Tunable constants — kept together so this effect is easy to dial in.
const PARTICLE_COUNT = 15;
const FALL_DURATION_MIN_S = 25; // slowest full vertical crossing, seconds
const FALL_DURATION_MAX_S = 35; // fastest full vertical crossing, seconds
const BASE_OPACITY = 0.55; // max per-particle opacity
const GLOW = 11; // canvas shadowBlur, px
const COLOR_RGB = "244, 238, 228"; // warm cream/white, #F4EEE4 — reads as floating light/bokeh against the vivid sunset (was gold, which vanished on it)
const MIN_SIZE = 1.5;
const MAX_SIZE = 4;
const SWAY_AMPLITUDE_MIN = 4; // px
const SWAY_AMPLITUDE_MAX = 12; // px
const SWAY_PERIOD_MIN_MS = 4000;
const SWAY_PERIOD_MAX_MS = 8000;
const PULSE_PERIOD_MIN_MS = 3000;
const PULSE_PERIOD_MAX_MS = 6000;
const UPPER_BAND_FRACTION = 0.6; // particles concentrate in the upper 60% of the hero
const FAST_ZONE_MULTIPLIER = 4; // speed-up once a particle drifts below the upper band
const STATIC_PARTICLE_COUNT = 6; // faint scatter shown under prefers-reduced-motion

interface Particle {
  xFrac: number;
  yFrac: number; // 0 = top, 1 = bottom — particles fall, so this increases
  size: number;
  baseOpacity: number;
  durationMs: number;
  swayAmplitude: number;
  swayPeriodMs: number;
  swayPhase: number;
  pulsePeriodMs: number;
  pulsePhase: number;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Biased toward 0 (top) so particles concentrate near the warm glow and
// thin out naturally toward the bottom, rather than scattering evenly.
function biasedYFrac() {
  return Math.pow(Math.random(), 1.6);
}

function createParticle(): Particle {
  return {
    xFrac: Math.random(),
    yFrac: biasedYFrac(),
    size: randomBetween(MIN_SIZE, MAX_SIZE),
    baseOpacity: BASE_OPACITY * randomBetween(0.6, 1),
    durationMs: randomBetween(FALL_DURATION_MIN_S, FALL_DURATION_MAX_S) * 1000,
    swayAmplitude: randomBetween(SWAY_AMPLITUDE_MIN, SWAY_AMPLITUDE_MAX),
    swayPeriodMs: randomBetween(SWAY_PERIOD_MIN_MS, SWAY_PERIOD_MAX_MS),
    swayPhase: Math.random() * Math.PI * 2,
    pulsePeriodMs: randomBetween(PULSE_PERIOD_MIN_MS, PULSE_PERIOD_MAX_MS),
    pulsePhase: Math.random() * Math.PI * 2,
  };
}

// Particles linger in the upper band (where the light is) and cross the
// lower band quickly, so the visible distribution stays top-concentrated
// even though every particle cycles through the full height.
function speedMultiplier(yFrac: number) {
  const t = Math.min(
    Math.max((yFrac - (UPPER_BAND_FRACTION - 0.05)) / 0.3, 0),
    1
  );
  return 1 + t * (FAST_ZONE_MULTIPLIER - 1);
}

interface HeroEmbersProps {
  containerRef: RefObject<HTMLElement | null>;
}

/**
 * Drifting light embers — quiet, always-on ambience. Fall gently from the
 * warm glow at the top of the hero, lingering near it before fading away
 * lower down; never compete with the text. Single rAF loop, paused
 * off-screen or when the tab is hidden. Renders a faint static scatter (no
 * animation) under prefers-reduced-motion.
 */
export default function HeroEmbers({ containerRef }: HeroEmbersProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    // Arrow function expressions (not hoisted function declarations) so
    // TypeScript keeps narrowing container/canvas/ctx as non-null inside them.
    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawParticle = (p: Particle, x: number, y: number, opacity: number) => {
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLOR_RGB}, ${opacity})`;
      ctx.shadowColor = `rgba(${COLOR_RGB}, 0.9)`;
      ctx.shadowBlur = GLOW;
      ctx.fill();
    };

    if (reducedMotion) {
      const staticParticles = Array.from(
        { length: STATIC_PARTICLE_COUNT },
        createParticle
      );

      const drawStatic = () => {
        ctx.clearRect(0, 0, width, height);
        for (const p of staticParticles) {
          drawParticle(p, p.xFrac * width, p.yFrac * height, p.baseOpacity * 0.6);
        }
      };

      resize();
      drawStatic();
      const resizeObserver = new ResizeObserver(() => {
        resize();
        drawStatic();
      });
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const particles: Particle[] = Array.from(
      { length: PARTICLE_COUNT },
      createParticle
    );

    let rafId: number | null = null;
    let lastTime: number | null = null;
    let elapsed = 0;
    const intersecting = { current: false };

    const step = (time: number) => {
      if (lastTime === null) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;
      elapsed += dt;

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        const speed = speedMultiplier(p.yFrac);
        p.yFrac += (dt / p.durationMs) * speed;

        if (p.yFrac > 1.05) {
          Object.assign(p, createParticle(), { yFrac: -Math.random() * 0.05 });
        }

        const sway = Math.sin(elapsed / p.swayPeriodMs + p.swayPhase) * p.swayAmplitude;
        const pulse = 0.7 + 0.3 * Math.sin(elapsed / p.pulsePeriodMs + p.pulsePhase);

        const x = p.xFrac * width + sway;
        const y = p.yFrac * height;
        const opacity = Math.max(p.baseOpacity * pulse, 0);

        drawParticle(p, x, y, opacity);
      }

      rafId = requestAnimationFrame(step);
    };

    const start = () => {
      if (rafId === null) {
        lastTime = null;
        rafId = requestAnimationFrame(step);
      }
    };

    const stop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const updateRunState = () => {
      const shouldRun = intersecting.current && document.visibilityState === "visible";
      if (shouldRun) start();
      else stop();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        intersecting.current = entry.isIntersecting;
        updateRunState();
      },
      { threshold: 0 }
    );
    io.observe(container);
    document.addEventListener("visibilitychange", updateRunState);

    return () => {
      stop();
      resizeObserver.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", updateRunState);
    };
  }, [containerRef, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5]"
    />
  );
}
