"use client";

import { useSyncExternalStore } from "react";

const FINE_POINTER_QUERY = "(pointer: fine)";

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia(FINE_POINTER_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * Hydration-safe fine-pointer (mouse/trackpad, not touch) check — same
 * useSyncExternalStore pattern as usePrefersReducedMotion, so cursor-driven
 * effects (tilt, hover parallax) stay off on touch devices without a
 * hydration mismatch.
 */
export function useHasFinePointer() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
