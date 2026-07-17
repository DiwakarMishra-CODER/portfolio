"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useInView } from "motion/react";

/**
 * A "play token" that starts at 0 and increments each time `ref` enters
 * view (at `amount`) after having fully left the viewport since the last
 * play — in either scroll direction. Consumers key their replay off this
 * token: a `useEffect` with `playToken` as a dependency (e.g. a count-up
 * that restarts from 0), or a `key={playToken}` remount (e.g. an overlay
 * that needs a clean `initial` state each time). Never advances past 0
 * while `reduced` is true, so anything driven by it stays static.
 *
 * Two separate `useInView` checks, not one: `entered` uses the caller's
 * `amount` (how "comfortably in view" it needs to be before firing);
 * `fullyExited` uses `amount: 0`, which IntersectionObserver only reports
 * as not-intersecting once zero pixels remain visible — that's the "has it
 * completely left" signal that re-arms the next play, distinct from
 * "entered." An armed ref (not state) carries this across renders without
 * itself causing one.
 */
export function useReplayOnReentry(
  ref: RefObject<Element | null>,
  amount: number,
  reduced: boolean
) {
  const entered = useInView(ref, { amount });
  const fullyExited = !useInView(ref, { amount: 0 });
  const [playToken, setPlayToken] = useState(0);
  const armedRef = useRef(true);

  useEffect(() => {
    if (fullyExited) {
      armedRef.current = true;
      return;
    }
    if (reduced) return;
    if (entered && armedRef.current) {
      armedRef.current = false;
      setPlayToken((n) => n + 1);
    }
  }, [entered, fullyExited, reduced]);

  return playToken;
}
