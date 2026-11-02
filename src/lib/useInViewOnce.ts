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
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold, seen]);
  return seen;
}
