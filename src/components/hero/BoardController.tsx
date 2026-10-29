"use client";

import { useEffect } from "react";
import { assemblyClock } from "./clock";
import { T } from "./timeline";

/*
 * The board's idle life: the pointer turns the board a degree or two and
 * shifts each part by its height (parallax), so the parts read as objects
 * standing on the board. Fine pointers only; nothing under reduced motion.
 * (The scroll handoff joins this later.)
 */
export default function BoardController() {
  // `?t=` freeze: pin every animation at that moment (the canvases read the
  // same frozen clock).
  useEffect(() => {
    const t = window.__asmFreeze;
    if (t == null) return;
    const pin = () =>
      document.getAnimations().forEach((a) => {
        a.pause();
        a.currentTime = t;
      });
    pin();
    const id = setTimeout(pin, 300); // parts that mount late (client-only)
    return () => clearTimeout(id);
  }, []);

  // When the opening has played out, end it: every intro-only layer goes
  // (and the memory it held), leaving the plain finished board.
  useEffect(() => {
    if (window.__asmFreeze != null) return;
    const t = assemblyClock();
    if (!Number.isFinite(t)) return;
    const end = () => {
      const d = document.documentElement;
      if (/\bplay\b/.test(d.dataset.intro ?? "")) d.dataset.intro = "done quiet";
    };
    const id = setTimeout(end, Math.max(0, T.end + 300 - t));
    return () => clearTimeout(id);
  }, []);

  // Links on the board (#work, #starweave…) scroll to their section without
  // leaving the #fragment in the address bar — so reloading from the top
  // plays the opening again instead of jumping back down to that section.
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hb");
    if (!hero) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      const target = a && document.getElementById(a.hash.slice(1));
      if (!target) return;
      e.preventDefault();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      // Move keyboard focus with the view, as following the link would.
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      history.replaceState(null, "", location.pathname + location.search);
    };
    hero.addEventListener("click", onClick);
    return () => hero.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const board = document.querySelector<HTMLElement>(".hb-board");
    if (!board) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let tx = 0, ty = 0, px = 0, py = 0, raf = 0;
    const frame = () => {
      raf = 0;
      px += (tx - px) * 0.08;
      py += (ty - py) * 0.08;
      board.style.setProperty("--px", px.toFixed(4));
      board.style.setProperty("--py", py.toFixed(4));
      if (Math.abs(tx - px) > 0.001 || Math.abs(ty - py) > 0.001) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
