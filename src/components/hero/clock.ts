// The opening sequence's one clock, shared by the canvases and the controller.
//
// Zero is the moment the page's CSS animations started — read from a 0×0
// sentinel animation — not navigation start: on a slow load the two differ by
// hundreds of ms, and the canvases must stay in step with the CSS.
// <html data-intro> says what's playing (set before first paint, layout.tsx):
// "play" (full), "play short" (slow arrival: power-on only), "done…" (skipped)
// or absent (reduced motion, no JS) — anything but "play" means the finished
// board, which the clock reports as Infinity. A `?t=` freeze pins it.
import { SHORT_SHIFT } from "./timeline";

declare global {
  interface Window {
    __asmFreeze?: number;
  }
}

let zero: number | null = null;

function cssZero(): number | null {
  if (zero != null) return zero;
  const sentinel = document.getAnimations().find((a) => (a as CSSAnimation).animationName === "hb-sentinel");
  if (!sentinel) return null;
  const start = sentinel.startTime;
  if (typeof start === "number") return (zero = start);
  // Pending: created but not yet given its start time (it starts on the next
  // frame) — so the opening is at its very beginning. Don't cache.
  return performance.now();
}

export function assemblyClock(): number {
  if (typeof window === "undefined") return Infinity;
  if (window.__asmFreeze != null) return window.__asmFreeze;
  const mode = document.documentElement.dataset.intro ?? "";
  if (!/\bplay\b/.test(mode)) return Infinity;
  const z = cssZero();
  if (z == null) return Infinity;
  return performance.now() - z + (/\bshort\b/.test(mode) ? SHORT_SHIFT : 0);
}
