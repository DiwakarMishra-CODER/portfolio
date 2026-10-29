/*
 * Has the Starweave screen lifted off the hero board yet? The lift-off itself
 * is CSS (scroll-driven, rig.css); this only tells the JS that cares — the
 * two live copies of the screen (only one draws at a time) and the pointer
 * tilt (the lifted copy stops following the pointer).
 *
 * The hand-off runs only where its CSS does: scroll-driven animations
 * supported, motion allowed, a desktop-sized window, the opening over.
 */

const GATE = "(prefers-reduced-motion: no-preference) and (min-width: 700px) and (min-height: 600px)";

let handoff = false;
let lifted = false;
let started = false;
const subs = new Set<() => void>();

function check() {
  const on =
    CSS.supports("animation-timeline: scroll()") &&
    CSS.supports("animation-range: 0px 1px") &&
    window.matchMedia(GATE).matches &&
    !/\bplay\b/.test(document.documentElement.dataset.intro ?? "");
  const up = on && window.scrollY >= 1;
  if (on === handoff && up === lifted) return;
  handoff = on;
  lifted = up;
  subs.forEach((f) => f());
}

/** Is the scroll hand-off active on this screen? */
export const handoffOn = () => handoff;
/** Has the screen left the board (the page is scrolled past its top)? */
export const isLifted = () => lifted;

export function onLift(fn: () => void) {
  if (!started) {
    started = true;
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    new MutationObserver(check).observe(document.documentElement, { attributes: true, attributeFilter: ["data-intro"] });
    check();
  }
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
