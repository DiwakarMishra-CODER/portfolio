"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInViewOnce } from "@/lib/useInViewOnce";
import {
  TIER_LABEL,
  bestSourcedPath,
  buildAdjacency,
  fewestHopsPath,
  hopLink,
  type StarweaveData,
  type Trace,
} from "@/lib/machines/starweave";
import ArtistPicker from "./ArtistPicker";

// Suggested pairs: names a stranger knows. The first runs on its own when the
// machine scrolls into view — the inside is running before anyone touches it.
const PAIRS: [string, string][] = [
  ["Bob Dylan", "Radiohead"],
  ["Joni Mitchell", "Phoebe Bridgers"],
  ["David Bowie", "Tame Impala"],
  ["Kraftwerk", "Charli XCX"],
];

// Drawing timeline, ms: the search spreading, then the route drawn like a pen.
const SEARCH_MS = 1500;
const ROUTE_MS = 1000;
const MAP_ASPECT = 0.62;

type Result = {
  path: number[];
  trace: Trace;
  fewest: number[] | null;
  ms: number;
  run: number;
};

const host = (src: string) => {
  if (src.startsWith("print:")) return null;
  try {
    return new URL(src).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const trimQuote = (q: string, max = 260) =>
  q.length <= max ? q : `${q.slice(0, q.lastIndexOf(" ", max))} …`;

export default function StarweaveMachine() {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const near = useInViewOnce(rootRef, { rootMargin: "900px 0px" });
  const arrived = useInViewOnce(rootRef, { threshold: 0.35 });

  const [data, setData] = useState<StarweaveData | null>(null);
  const [failed, setFailed] = useState(false);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [clickStep, setClickStep] = useState<0 | 1>(0);
  const runCount = useRef(0);

  useEffect(() => {
    if (!near || data) return;
    fetch("/data/starweave.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setFailed(true));
  }, [near, data]);

  const adj = useMemo(() => (data ? buildAdjacency(data) : null), [data]);
  const names = useMemo(() => data?.artists.map((a) => a[1]) ?? [], [data]);
  const byName = useCallback((n: string) => names.indexOf(n), [names]);

  const run = useCallback(
    (a: number, b: number) => {
      if (!adj || a < 0 || b < 0 || a === b) return;
      // Time the real search, not the drawing: repeat it so the figure isn't
      // just the browser's timer resolution.
      const REPS = 40;
      let found = bestSourcedPath(adj, a, b);
      const t0 = performance.now();
      for (let i = 0; i < REPS; i++) found = bestSourcedPath(adj, a, b);
      const ms = (performance.now() - t0) / REPS;
      if (!found) {
        setResult(null);
        return;
      }
      const fewest = fewestHopsPath(adj, a, b);
      runCount.current += 1;
      setFrom(a);
      setTo(b);
      setResult({ path: found.path, trace: found.trace, fewest, ms, run: runCount.current });
    },
    [adj]
  );

  // Run the first pair by itself on arrival.
  useEffect(() => {
    if (arrived && adj && !result && runCount.current === 0) run(byName(PAIRS[0][0]), byName(PAIRS[0][1]));
  }, [arrived, adj, result, run, byName]);

  // ── Drawing ────────────────────────────────────────────────────────────
  const geom = useRef({ w: 0, h: 0, pts: [] as [number, number][] });
  const anim = useRef({ start: 0, raf: 0 });

  const project = useCallback(
    (w: number, h: number) => {
      if (!data) return [];
      const xs = data.artists.map((a) => a[2]);
      const ys = data.artists.map((a) => a[3]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const pad = Math.max(18, w * 0.035);
      const k = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / (maxY - minY));
      const ox = (w - (maxX - minX) * k) / 2;
      const oy = (h - (maxY - minY) * k) / 2;
      return data.artists.map((a) => [ox + (a[2] - minX) * k, oy + (a[3] - minY) * k] as [number, number]);
    },
    [data]
  );

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !data) return false;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      const { w, h, pts } = geom.current;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-martian") || "monospace";

      // Every link on the map, as one faint hairline path.
      ctx.beginPath();
      for (const [a, b] of data.links) {
        ctx.moveTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[b][0], pts[b][1]);
      }
      ctx.strokeStyle = "rgba(20,20,19,0.075)";
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Scene names, set just above each group so they never sit on a route label.
      ctx.font = `500 ${w < 600 ? 8 : 9.5}px ${mono}`;
      // Dimmed while a route is on the map: the route's names take priority.
      ctx.fillStyle = result ? "rgba(92,91,86,0.28)" : "rgba(92,91,86,0.7)";
      ctx.textAlign = "center";
      data.realms.forEach((label, r) => {
        if (r === 0 || w < 600) return; // roots sit in the middle; phones have no room
        const members = data.artists.map((a, i) => [a, i] as const).filter(([a]) => a[4] === r);
        const xsR = members.map(([, i]) => pts[i][0]).sort((a, b) => a - b);
        const ysR = members.map(([, i]) => pts[i][1]).sort((a, b) => a - b);
        const cx = xsR[Math.floor(xsR.length / 2)];
        // 8th-percentile top edge: ignores a stray outlier far above the group.
        const top = ysR[Math.floor(ysR.length * 0.08)];
        ctx.fillText(label.toUpperCase(), cx, Math.max(12, top - 10));
      });

      // Every artist.
      ctx.fillStyle = "rgba(20,20,19,0.5)";
      for (const [x, y] of pts) {
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }

      let animating = false;
      if (result) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const t = reduced ? Infinity : now - anim.current.start;
        animating = t < SEARCH_MS + ROUTE_MS + 200;

        // 1 — the search spreading out from the first artist, in the exact
        // order it settled them: cheapest evidence first.
        const n = result.trace.length;
        const shown = Math.min(n, Math.ceil((Math.min(t, SEARCH_MS) / SEARCH_MS) * n));
        // Once the route starts drawing, the search steps back so the route leads.
        const recede = 1 - 0.68 * Math.max(0, Math.min(1, (t - SEARCH_MS) / (ROUTE_MS * 0.6)));
        ctx.strokeStyle = `rgba(255,79,0,${(0.34 * recede).toFixed(3)})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (let i = 1; i < shown; i++) {
          const { node, parent } = result.trace[i];
          if (parent < 0) continue;
          ctx.moveTo(pts[parent][0], pts[parent][1]);
          ctx.lineTo(pts[node][0], pts[node][1]);
        }
        ctx.stroke();
        for (let i = 0; i < shown; i++) {
          const [x, y] = pts[result.trace[i].node];
          const fresh = shown - i;
          ctx.fillStyle = `rgba(255,79,0,${(0.35 + 0.65 * recede).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.8 + 0.5 * recede, 0, Math.PI * 2);
          ctx.fill();
          if (t < SEARCH_MS && fresh < 14) {
            ctx.strokeStyle = `rgba(255,79,0,${(0.5 * (1 - fresh / 14)).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 3 + fresh * 0.7, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // 2 — the fewest-steps route, dashed, for comparison (only if different).
        const route = result.path;
        const differs = result.fewest && result.fewest.join() !== route.join();
        if (differs && t > SEARCH_MS + ROUTE_MS * 0.7) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "rgba(92,91,86,0.9)";
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          result.fewest!.forEach((p, i) => (i ? ctx.lineTo(pts[p][0], pts[p][1]) : ctx.moveTo(pts[p][0], pts[p][1])));
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 3 — the best-sourced route, drawn at constant speed like a pen.
        const segs = route.slice(1).map((p, i) => Math.hypot(pts[p][0] - pts[route[i]][0], pts[p][1] - pts[route[i]][1]));
        const total = segs.reduce((s, v) => s + v, 0);
        let budget = Math.max(0, Math.min(1, (t - SEARCH_MS) / ROUTE_MS)) * total;
        ctx.strokeStyle = "#141413";
        ctx.lineWidth = 2.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pts[route[0]][0], pts[route[0]][1]);
        for (let i = 0; i < segs.length && budget > 0; i++) {
          const [ax, ay] = pts[route[i]];
          const [bx, by] = pts[route[i + 1]];
          const f = Math.min(1, budget / segs[i]);
          ctx.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
          budget -= segs[i];
        }
        ctx.stroke();

        // Stops and their names, once the pen has passed them.
        ctx.font = `600 ${w < 600 ? 9 : 10.5}px ${mono}`;
        ctx.textAlign = "left";
        let reached = Math.max(0, Math.min(1, (t - SEARCH_MS) / ROUTE_MS)) * total;
        route.forEach((p, i) => {
          if (i > 0) reached -= segs[i - 1];
          if (reached < -0.5) return;
          const [x, y] = pts[p];
          ctx.fillStyle = "#F7F6F2";
          ctx.strokeStyle = "#141413";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, 4.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          const label = data.artists[p][1];
          ctx.lineWidth = 4;
          ctx.strokeStyle = "rgba(247,246,242,0.92)";
          ctx.strokeText(label, x + 8, y - 7);
          ctx.fillStyle = "#141413";
          ctx.fillText(label, x + 8, y - 7);
        });
      }

      // Pointer: the artist under it.
      if (hover != null) {
        const [x, y] = pts[hover];
        ctx.strokeStyle = "#FF4F00";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = `600 10.5px ${mono}`;
        ctx.textAlign = x > w * 0.7 ? "right" : "left";
        const lx = x + (x > w * 0.7 ? -10 : 10);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(247,246,242,0.95)";
        ctx.strokeText(data.artists[hover][1], lx, y + 4);
        ctx.fillStyle = "#B83700";
        ctx.fillText(data.artists[hover][1], lx, y + 4);
      }
      return animating;
    },
    [data, result, hover]
  );

  // Size the canvas to its box, at device resolution.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !data) return;
    const size = () => {
      const w = wrap.clientWidth;
      const h = Math.round(w * MAP_ASPECT);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
      geom.current = { w, h, pts: project(w, h) };
      draw(performance.now());
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [data, project, draw]);

  // Animate a fresh run; otherwise redraw once per state change.
  useEffect(() => {
    if (!data) return;
    const a = anim.current;
    cancelAnimationFrame(a.raf);
    const loop = (now: number) => {
      if (draw(now)) a.raf = requestAnimationFrame(loop);
    };
    a.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(a.raf);
  }, [data, draw]);

  useEffect(() => {
    if (result) anim.current.start = performance.now();
  }, [result]);

  const nearest = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    let best = -1;
    let bd = 14 * 14;
    geom.current.pts.forEach(([px, py], i) => {
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best < 0 ? null : best;
  };

  // ── Result text ────────────────────────────────────────────────────────
  const hops = useMemo(() => {
    if (!result || !adj || !data) return [];
    return result.path.slice(1).map((v, i) => {
      const u = result.path[i];
      const e = hopLink(adj, u, v)!;
      const [influenced, influencer, tier, quote, src] = data.links[e.link];
      return { influenced, influencer, tier, quote, src };
    });
  }, [result, adj, data]);

  const summary = useMemo(() => {
    if (!result || !adj || !data || hops.length === 0) return null;
    const own = hops.filter((h) => h.tier === 0).length;
    const steps = `${hops.length} ${hops.length === 1 ? "step" : "steps"}.`;
    const quality =
      own === hops.length
        ? "Every one in the artists' own words."
        : `${own} in the artists' own words, ${hops.length - own} from ${hops.length - own === 1 ? "a weaker source" : "weaker sources"}.`;
    let compare = "Here the shortest route is also the best-documented one.";
    if (result.fewest && result.fewest.join() !== result.path.join()) {
      const tiers = result.fewest.slice(1).map((v, i) => data.links[hopLink(adj, result.fewest![i], v)!.link][2]);
      const weak = Math.max(...tiers);
      compare = `The shortest route is ${tiers.length} ${tiers.length === 1 ? "step" : "steps"}, but leans on ${weak === 1 ? "a secondhand report" : "a critic's comparison"}. The search walked around it.`;
    }
    return { steps, quality, compare };
  }, [result, adj, data, hops]);

  return (
    <div ref={rootRef} className="grid grid-cols-12 gap-x-[clamp(12px,1.7vw,24px)]">
      <div className="relative col-span-12 border-hairline p-[clamp(10px,1.4vw,20px)] min-[1000px]:col-span-8 min-[1000px]:border-r">
        <div ref={wrapRef} className="relative" data-part="Map · canvas, 945 links">
          {data ? (
            <canvas
              ref={canvasRef}
              className="block w-full cursor-crosshair touch-manipulation"
              role="img"
              aria-label="Starweave's map of 296 artists and 945 influence links, with the route drawn between the two artists picked."
              onPointerMove={(e) => setHover(nearest(e))}
              onPointerLeave={() => setHover(null)}
              onClick={(e) => {
                const hit = nearest(e);
                if (hit == null) return;
                if (clickStep === 0) {
                  setFrom(hit);
                  setTo(null);
                  setResult(null);
                  setClickStep(1);
                } else {
                  setClickStep(0);
                  run(from ?? hit, hit);
                }
              }}
            />
          ) : (
            <div className="grid aspect-[1/0.62] place-items-center">
              <p className="type-label text-graphite">{failed ? "The map didn't load — the live site has it." : "Loading the map…"}</p>
            </div>
          )}
        </div>
        <p className="type-label mt-2 text-graphite">
          {clickStep === 1 ? "Now click a second artist" : "Click any two points on the map, or pick below"}
        </p>
      </div>

      <div className="col-span-12 flex flex-col gap-5 p-[clamp(16px,2vw,28px)] min-[1000px]:col-span-4">
        <div className="grid grid-cols-2 gap-4 min-[1000px]:grid-cols-1">
          <ArtistPicker label="From" names={names} value={from} onChange={(i) => (to != null ? run(i, to) : setFrom(i))} />
          <ArtistPicker label="To" names={names} value={to} onChange={(i) => (from != null ? run(from, i) : setTo(i))} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PAIRS.map(([a, b]) => (
            <button
              key={a}
              type="button"
              disabled={!adj}
              onClick={() => run(byName(a), byName(b))}
              className="type-label border border-hairline px-2.5 py-1.5 text-ink transition-colors hover:border-ink disabled:opacity-40"
            >
              {a} → {b}
            </button>
          ))}
        </div>

        <div aria-live="polite" className="min-h-40">
          {summary && result && (
            <div key={result.run} className="rise-in">
              <p className="text-[19px] font-[650] leading-snug">
                {summary.steps} {summary.quality}
              </p>
              <p className="mt-2 text-[14.5px] leading-snug text-graphite">{summary.compare}</p>
              <p className="type-label mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-graphite">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-[2.5px] w-5 bg-ink" /> Best-sourced
                </span>
                {result.fewest && result.fewest.join() !== result.path.join() && (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-5 border-t-[1.5px] border-dashed border-graphite" /> Fewest steps
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* The route, step by step, with the evidence for each. */}
      {result && hops.length > 0 && data && (
        <ol key={result.run} className="col-span-12 grid border-t border-hairline min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">
          {hops.map((h, i) => {
            const site = host(h.src);
            return (
              <li
                key={i}
                className="rise-in border-b border-hairline p-[clamp(16px,2vw,28px)] min-[700px]:border-r"
                style={{ animationDelay: `${SEARCH_MS + (i + 1) * (ROUTE_MS / hops.length)}ms` }}
              >
                <p className="type-label text-graphite">
                  <span className="text-signal-ink">Step {i + 1}</span> · {TIER_LABEL[h.tier]}
                </p>
                <p className="mt-2 text-[16px] font-[650] leading-snug">
                  {data.artists[h.influencer][1]} shaped {data.artists[h.influenced][1]}.
                </p>
                <blockquote className="mt-2 text-[14px] leading-relaxed text-graphite">{trimQuote(h.quote)}</blockquote>
                <p className="type-label mt-3">
                  {site ? (
                    <a href={h.src} target="_blank" rel="noreferrer" className="text-ink underline decoration-hairline underline-offset-4 hover:text-signal-ink">
                      {site} ↗
                    </a>
                  ) : (
                    <span className="text-graphite">Book · {h.src.replace(/^print:/, "").split(",")[0]}</span>
                  )}
                </p>
              </li>
            );
          })}
          <li className="type-label flex items-end p-[clamp(16px,2vw,28px)] text-graphite">
            Searched {result.trace.length} of {data.artists.length} artists in {result.ms < 0.1 ? "under 0.1" : result.ms.toFixed(2)} ms — measured just now, in your browser.
          </li>
        </ol>
      )}
    </div>
  );
}
