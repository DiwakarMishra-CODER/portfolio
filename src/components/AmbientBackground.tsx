"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// Site-wide ambient atmosphere, behind ALL content (fixed to the viewport,
// -z-10, so sections must stay transparent for it to show through — see
// CLAUDE.md's ambient-background gotcha). Two layers now do the real work:
//   1. Aurora  — three large, softly-blurred colour blooms. This is the
//                visible layer: big colour areas read even on cream, unlike
//                tiny particles or a faint glow (the previous version, which
//                measured as only ~1-2 RGB units off pure cream — see build
//                log). Each bloom drifts independently (own keyframe +
//                duration in globals.css) so they never pulse in sync.
//   2. Embers  — a handful of larger glowing particles riding on top of the
//                aurora as an accent, not the main event.
//   3. Grain   — a static (non-animated) noise texture for a filmic feel.
// The hero (GoldenHourSky/HeroEmbers) is untouched and fully opaque on top;
// this layer only ever shows through the transparent sections below it.
const AURORA_BLOOMS = [
  {
    // Amber, upper-left — bleeds off the top-left corner.
    colorRgb: "232, 147, 74",
    opacity: 0.45,
    sizeVh: 95,
    top: "-25%",
    left: "-15%",
    driftClass: "aurora-drift-a",
  },
  {
    // Coral, centre-right — the largest bloom, anchors the middle of the page.
    colorRgb: "228, 103, 79",
    opacity: 0.45,
    sizeVh: 100,
    top: "30%",
    left: "48%",
    driftClass: "aurora-drift-b",
  },
  {
    // Twilight, lower-left — a cooler touch, kept a shade fainter than the
    // two warm blooms so it reads as an accent, not a third equal voice.
    colorRgb: "107, 140, 174",
    opacity: 0.35,
    sizeVh: 80,
    top: "58%",
    left: "-8%",
    driftClass: "aurora-drift-c",
  },
];
const AURORA_BLUR_PX = 90; // heavy blur so each bloom reads as soft colour, not a disc

const EMBER_COUNT = 5;
const EMBER_BASE_OPACITY = 0.4; // bigger particles now carry the opacity fine on their own
const EMBER_MIN_SIZE = 6;
const EMBER_MAX_SIZE = 10;
const EMBER_GLOW = 16; // canvas shadowBlur, px — the soft halo around each ember
// Gold rather than the hero's cream-white: this layer is mostly seen over
// CREAM sections (Projects, About), where cream-colored embers would be
// invisible against a cream base. Still warm/golden-hour, just adapted for
// the background it actually sits on.
const EMBER_COLOR_RGB = "245, 197, 66";
const EMBER_RISE_DURATION_MIN_S = 35;
const EMBER_RISE_DURATION_MAX_S = 55;
const EMBER_SWAY_AMPLITUDE_MIN = 3;
const EMBER_SWAY_AMPLITUDE_MAX = 9;
const EMBER_SWAY_PERIOD_MIN_MS = 5000;
const EMBER_SWAY_PERIOD_MAX_MS = 9000;
const EMBER_PULSE_PERIOD_MIN_MS = 4000;
const EMBER_PULSE_PERIOD_MAX_MS = 7000;
const EMBER_STATIC_COUNT = 3; // faint scatter shown under prefers-reduced-motion

const GRAIN_OPACITY = 0.05;

interface Particle {
  xFrac: number;
  yFrac: number; // 0 = top, 1 = bottom — embers rise, so this decreases
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

function createParticle(): Particle {
  return {
    xFrac: Math.random(),
    yFrac: Math.random(),
    size: randomBetween(EMBER_MIN_SIZE, EMBER_MAX_SIZE),
    baseOpacity: EMBER_BASE_OPACITY * randomBetween(0.6, 1),
    durationMs:
      randomBetween(EMBER_RISE_DURATION_MIN_S, EMBER_RISE_DURATION_MAX_S) *
      1000,
    swayAmplitude: randomBetween(EMBER_SWAY_AMPLITUDE_MIN, EMBER_SWAY_AMPLITUDE_MAX),
    swayPeriodMs: randomBetween(EMBER_SWAY_PERIOD_MIN_MS, EMBER_SWAY_PERIOD_MAX_MS),
    swayPhase: Math.random() * Math.PI * 2,
    pulsePeriodMs: randomBetween(EMBER_PULSE_PERIOD_MIN_MS, EMBER_PULSE_PERIOD_MAX_MS),
    pulsePhase: Math.random() * Math.PI * 2,
  };
}

// A static (data-URI, no network request) fractal-noise tile for the grain
// layer — no image asset needed, and it's inherently non-animated.
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

function EmbersCanvas({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
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
      ctx.fillStyle = `rgba(${EMBER_COLOR_RGB}, ${opacity})`;
      ctx.shadowColor = `rgba(${EMBER_COLOR_RGB}, 0.9)`;
      ctx.shadowBlur = EMBER_GLOW;
      ctx.fill();
    };

    if (reducedMotion) {
      const staticParticles = Array.from({ length: EMBER_STATIC_COUNT }, createParticle);
      const drawStatic = () => {
        ctx.clearRect(0, 0, width, height);
        for (const p of staticParticles) {
          drawParticle(p, p.xFrac * width, p.yFrac * height, p.baseOpacity * 0.6);
        }
      };
      resize();
      drawStatic();
      window.addEventListener("resize", () => {
        resize();
        drawStatic();
      });
      return () => window.removeEventListener("resize", drawStatic);
    }

    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: EMBER_COUNT }, createParticle);

    let rafId: number | null = null;
    let lastTime: number | null = null;
    let elapsed = 0;

    const step = (time: number) => {
      if (lastTime === null) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;
      elapsed += dt;

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.yFrac -= dt / p.durationMs;
        if (p.yFrac < -0.05) {
          Object.assign(p, createParticle(), { yFrac: 1 + Math.random() * 0.05 });
        }

        const sway = Math.sin(elapsed / p.swayPeriodMs + p.swayPhase) * p.swayAmplitude;
        const pulse = 0.7 + 0.3 * Math.sin(elapsed / p.pulsePeriodMs + p.pulsePhase);

        drawParticle(p, p.xFrac * width + sway, p.yFrac * height, Math.max(p.baseOpacity * pulse, 0));
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
      if (document.visibilityState === "visible") start();
      else stop();
    };

    updateRunState();
    document.addEventListener("visibilitychange", updateRunState);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", updateRunState);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0" />;
}

export default function AmbientBackground() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-cream"
    >
      {/* Aurora — three large, independently-drifting warm colour blooms.
          transform-only animation (translate + scale via the .aurora-drift-*
          classes in globals.css), so this stays GPU-friendly and never
          triggers layout. Static (no drift) under prefers-reduced-motion via
          the same media query the hero's sky-glow already uses. */}
      {AURORA_BLOOMS.map((bloom) => (
        <div
          key={bloom.driftClass}
          className={`absolute rounded-full ${bloom.driftClass}`}
          style={{
            top: bloom.top,
            left: bloom.left,
            height: `${bloom.sizeVh}vh`,
            width: `${bloom.sizeVh}vh`,
            filter: `blur(${AURORA_BLUR_PX}px)`,
            background: `radial-gradient(circle, rgba(${bloom.colorRgb}, ${bloom.opacity}) 0%, transparent 70%)`,
          }}
        />
      ))}

      <EmbersCanvas reducedMotion={reducedMotion} />

      {/* Grain — static, no animation, no blend mode (keeps it from ever
          darkening the cream underneath). */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `url("${GRAIN_SVG}")`, opacity: GRAIN_OPACITY }}
      />
    </div>
  );
}
