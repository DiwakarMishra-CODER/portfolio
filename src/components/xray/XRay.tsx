"use client";

import { useEffect, useState } from "react";
import "./xray.css";

/*
 * X-ray mode. Press X (or the switch in the nav) and the site shows its
 * parts: every [data-part] element gets outlined and named, and a readout
 * reports what this page is costing right now, measured live.
 */

export const XRAY_EVENT = "dm-xray";

export function toggleXRay(force?: boolean) {
  const root = document.documentElement;
  const on = force ?? root.dataset.xray !== "on";
  if (on) root.dataset.xray = "on";
  else delete root.dataset.xray;
  window.dispatchEvent(new CustomEvent(XRAY_EVENT, { detail: on }));
}

export function useXRayOn() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener(XRAY_EVENT, sync);
    return () => window.removeEventListener(XRAY_EVENT, sync);
  }, []);
  return on;
}

type Readout = { fps: number; nodes: number; parts: number; js: number; page: number };

function measure(): Omit<Readout, "fps"> {
  const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const nav = performance.getEntriesByType("navigation") as PerformanceResourceTiming[];
  const own = [...nav, ...res].filter((e) => e.name.startsWith(location.origin));
  const sum = (list: PerformanceResourceTiming[]) => Math.round(list.reduce((s, e) => s + (e.transferSize || 0), 0) / 1024);
  return {
    nodes: document.getElementsByTagName("*").length,
    parts: document.querySelectorAll("[data-part]").length,
    js: sum(own.filter((e) => e.initiatorType === "script" || /\.js(\?|$)/.test(e.name))),
    page: sum(own),
  };
}

// The site's two motion curves, drawn as the graphs they are.
function Curve({ label, d }: { label: string; d: string }) {
  return (
    <figure className="flex items-center gap-2">
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden="true">
        <path d="M2 38H38M2 38V2" stroke="currentColor" strokeOpacity=".35" fill="none" />
        <path d={d} stroke="#FF4F00" strokeWidth="1.6" fill="none" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export default function XRay() {
  const on = useXRayOn();
  const [readout, setReadout] = useState<Readout | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "x" || e.key === "X") toggleXRay();
      if (e.key === "Escape") toggleXRay(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live frame rate while X-ray is on (a rAF counter over one-second windows).
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let frames = 0;
    let since = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - since >= 1000) {
        const fps = Math.round((frames * 1000) / (now - since));
        setReadout({ fps, ...measure() });
        frames = 0;
        since = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  if (!on) return null;
  return (
    <aside className="xray-hud type-label" aria-label="X-ray readout">
      <div className="flex items-center justify-between gap-6">
        <span className="text-signal">X-ray</span>
        <button type="button" onClick={() => toggleXRay(false)} className="text-film/70 hover:text-film">
          Close · X
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
        <dt className="text-film/55">Frame rate</dt>
        <dd className="text-right tabular-nums">{readout ? `${readout.fps} fps` : "…"}</dd>
        <dt className="text-film/55">Page so far</dt>
        <dd className="text-right tabular-nums">{readout ? `${readout.page.toLocaleString("en-US")} KB` : "…"}</dd>
        <dt className="text-film/55">Of it, scripts</dt>
        <dd className="text-right tabular-nums">{readout ? `${readout.js.toLocaleString("en-US")} KB` : "…"}</dd>
        <dt className="text-film/55">Elements</dt>
        <dd className="text-right tabular-nums">{readout ? readout.nodes.toLocaleString("en-US") : "…"}</dd>
        <dt className="text-film/55">Named parts</dt>
        <dd className="text-right tabular-nums">{readout ? readout.parts : "…"}</dd>
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-film/15 pt-3 text-film/80">
        <Curve label="Glide · camera" d="M2 38C25 38 15 2 38 2" />
        <Curve label="Land · parts" d="M2 38C9 38 2 2 38 2" />
      </div>
    </aside>
  );
}
