"use client";

import { useSyncExternalStore } from "react";

// Never fires — "have we mounted" is a one-way transition, not a subscription.
// React still requires a subscribe function, so this returns a no-op unsubscribe.
function subscribe() {
  return () => {};
}

/**
 * Hydration-safe "are we running on the client yet" check — same
 * `useSyncExternalStore` pattern as `usePrefersReducedMotion` and
 * `useHasFinePointer`, so it can never cause a hydration mismatch.
 *
 * Returns `false` during SSR and on the hydrating render, then `true` once
 * React has committed on the client.
 *
 * Use this to render a *meaningful* value server-side for something that is
 * otherwise only correct after JS runs — content that must exist in the HTML
 * for crawlers and link-preview scrapers, which frequently don't execute
 * JavaScript at all. `StatCounter` uses it so the real figures ship in the
 * markup instead of the count-up animation's starting `0`.
 *
 * NOT for gating client-only APIs (`window`, `matchMedia`) — those get their
 * own dedicated hook so the snapshot stays a real subscription.
 */
export function useHasMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true, // client
    () => false // server
  );
}
