"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Flips to true the first time `ref` comes within `rootMargin` of the
 * viewport (or is `threshold` visible), then stops observing. Used to fetch a
 * machine's data just before it's needed, and to run its demo once on arrival.
 */
export function useInViewOnce(
  ref: RefObject<Element | null>,
  { rootMargin = "0px", threshold = 0 }: { rootMargin?: string; threshold?: number } = {}
) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    let io: IntersectionObserver | null = null;
    const stop = afterOpening(() => {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setSeen(true);
            io?.disconnect();
          }
        },
        { rootMargin, threshold }
      );
      io.observe(el);
    });
    return () => {
      stop();
      io?.disconnect();
    };
  }, [ref, rootMargin, threshold, seen]);
  return seen;
}

/** Run `cb` once the hero's opening is over (or at once if it isn't playing),
 *  so nothing below the hero loads or parses data while the opening animates.
 *  Returns a cancel function. */
function afterOpening(cb: () => void) {
  const d = document.documentElement;
  const playing = () => /\bplay\b/.test(d.dataset.intro ?? "");
  if (!playing()) {
    cb();
    return () => {};
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    mo.disconnect();
    clearTimeout(id);
    cb();
  };
  const mo = new MutationObserver(() => !playing() && go());
  mo.observe(d, { attributes: true, attributeFilter: ["data-intro"] });
  const id = setTimeout(go, 8000); // never wait longer than the opening can last
  return () => {
    done = true;
    mo.disconnect();
    clearTimeout(id);
  };
}
