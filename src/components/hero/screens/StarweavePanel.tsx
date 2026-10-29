"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import sky from "@/data/starweave-sky.json";
import { STARWEAVE } from "@/data/figures";
import { assemblyClock } from "../clock";
import { T } from "../timeline";

/*
 * Starweave's home map, rebuilt live from its real data in its own materials:
 * the 296 artists at their real map positions, drawn the way the live
 * ForceGraph draws them (cached glow sprites, influence-sized, FNV-phased
 * twinkle, the Velvet Underground's breathing halo), the scene names in its
 * marker, its ticket stub and its pocket player.
 *
 * Assembly: the stars fly in from a scattered cloud and the constellation
 * forms — the roots first, then outward — before the panel itself locks.
 */

type Sky = {
  realms: string[];
  stars: [number, number, string, number, number, number][];
  links: [number, number, number][];
  today: [string, string, string, string, string][];
};
const SKY = sky as unknown as Sky;

// Realm swatches (starweave lib/colors.ts REALM_COLORS), for the scene names.
const REALM_HEX = ["#E8C87A", "#5FD0C0", "#B85C2E", "#C77DD1", "#8CAA52", "#B02E2E", "#6B3FA0"];
const CREAM = [243, 227, 200];
// The live map's wallInk(): realm colour mixed 60% toward cream.
const wallInk = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${c.map((v, i) => Math.round(v * 0.4 + CREAM[i] * 0.6)).join(",")})`;
};
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");

// Boot timing (ms on the opening's clock), in step with the CSS.
const FORM_START = T.boot1 + 300;
const FORM_SPREAD = 650; // roots land first; the outermost stars this much later
const FORM_DUR = 820;
const LINKS_IN: [number, number] = [T.boot1 + 1150, T.boot1 + 1750];
const LABELS_IN = T.boot1 + 1300;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// ── Sprites, exactly as the live map builds them (128px, cached per colour).
const SPRITE = 128;
const haloCache = new Map<string, HTMLCanvasElement>();
const bulbCache = new Map<string, HTMLCanvasElement>();
function haloSprite(hex: string) {
  let s = haloCache.get(hex);
  if (s) return s;
  s = document.createElement("canvas");
  s.width = s.height = SPRITE;
  const g = s.getContext("2d")!;
  const r = SPRITE / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  const c = rgb(hex);
  for (const [stop, a] of [[0, 1], [0.12, 0.75], [0.3, 0.28], [0.6, 0.07], [1, 0]] as const) grad.addColorStop(stop, `rgba(${c},${a})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, SPRITE, SPRITE);
  haloCache.set(hex, s);
  return s;
}
function bulbSprite(hex: string) {
  let s = bulbCache.get(hex);
  if (s) return s;
  s = document.createElement("canvas");
  s.width = s.height = SPRITE;
  const g = s.getContext("2d")!;
  const r = SPRITE / 2;
  g.fillStyle = hex;
  g.beginPath();
  g.arc(r, r, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff4dc";
  g.beginPath();
  g.arc(r, r, r * 0.36, 0, Math.PI * 2);
  g.fill();
  bulbCache.set(hex, s);
  return s;
}

// ── Diwakar's picks, from Starweave's own data: My Bloody Valentine as
// today's link (Tame Impala's Kevin Parker on them — one whole sentence of a
// sourced quote), Cocteau Twins' "Cherry-coloured Funk" in the player, and
// both bands' stars lit on the map.
const TODAY = (() => {
  const t = SKY.today.find((q) => q[0] === "Tame Impala" && q[1] === "My Bloody Valentine") ?? SKY.today[0];
  const quote = t[2].split(/(?<=[.!?])\s+/).find((line) => line.includes("wall of sound")) ?? t[2];
  // The site's own name, not its blog subdomain ("latimesblogs.latimes.com" → "latimes.com").
  const parts = t[4].split(".");
  const domain = parts.length > 2 && parts.at(-2)!.length > 3 ? parts.slice(-2).join(".") : t[4];
  return { name: t[1], quote, caption: `${t[0]} on ${t[1]}`, url: t[3], domain };
})();
const NOW_PLAYING = { song: "Cherry-coloured Funk", artist: "Cocteau Twins", record: "Heaven or Las Vegas, 1990" };
const FAVOURITES = new Set([22, 26]); // Cocteau Twins, My Bloody Valentine (indices in Starweave's artist list)
const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
// The ticket's date stub is the visitor's local date, which the server can't
// know — so only the stub renders on the client.
const subscribe = () => () => {};
function useToday() {
  return useSyncExternalStore(
    subscribe,
    () => dayNumber(new Date()),
    () => -1
  );
}

export default function StarweavePanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const day = useToday();
  const date = day < 0 ? "" : new Date(day * 86_400_000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const marker = getComputedStyle(document.documentElement).getPropertyValue("--font-marker").trim() || "cursive";

    let w = 0, h = 0, dpr = 1;
    let pts: [number, number][] = [];
    let starts: [number, number][] = [];
    let delays: number[] = [];
    let k = 1;
    let backdrop: HTMLCanvasElement | null = null;
    let labels: { text: string; x: number; y: number; color: string }[] = [];

    const xs = SKY.stars.map((s) => s[0]);
    const ys = SKY.stars.map((s) => s[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);

    const layout = () => {
      const box = canvas.getBoundingClientRect();
      w = box.width;
      h = box.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // The map fills the panel under its nav strip, a little zoomed past the
      // edges the way the live overview sits (the outermost labels may crop).
      const top = 34 + 18, pad = 22;
      k = Math.min((w - 2 * pad) / (maxX - minX), (h - top - pad) / (maxY - minY)) * 1.06;
      const ox = w / 2 - ((minX + maxX) / 2) * k;
      const oy = top + (h - top - pad) / 2 - ((minY + maxY) / 2) * k;
      pts = SKY.stars.map(([x, y]) => [ox + x * k, oy + y * k]);
      const cx = ox, cy = oy; // map origin: the Velvet Underground sit near it
      const maxR = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
      const diag = Math.hypot(w, h);
      starts = SKY.stars.map(([, , , , , phase], i) => {
        const a = phase * Math.PI * 2 + i * 0.7;
        const R = diag * (0.55 + phase * 0.7);
        return [pts[i][0] + Math.cos(a) * R, pts[i][1] + Math.sin(a) * R];
      });
      delays = pts.map(([x, y]) => FORM_START + (Math.hypot(x - cx, y - cy) / maxR) * FORM_SPREAD);

      // Static layer: realm nebula + dust, prerendered once per size.
      backdrop = document.createElement("canvas");
      backdrop.width = canvas.width;
      backdrop.height = canvas.height;
      const b = backdrop.getContext("2d")!;
      b.scale(dpr, dpr);
      b.globalCompositeOperation = "lighter";
      SKY.stars.forEach(([, , color, , realm], i) => {
        const r = (realm === 0 ? 90 : 60) * k * 0.55;
        const g = b.createRadialGradient(pts[i][0], pts[i][1], 0, pts[i][0], pts[i][1], r);
        const a = realm === 0 ? 0.3 * 0.03 : 0.16 * 0.03;
        g.addColorStop(0, `rgba(${rgb(color)},${a})`);
        g.addColorStop(1, `rgba(${rgb(color)},0)`);
        b.fillStyle = g;
        b.fillRect(pts[i][0] - r, pts[i][1] - r, r * 2, r * 2);
      });
      b.globalCompositeOperation = "source-over";
      for (let i = 0; i < 450; i++) {
        const rx = ((i * 9301 + 49297) % 233280) / 233280;
        const ry = ((i * 4093 + 7919) % 104729) / 104729;
        b.fillStyle = `rgba(243,223,192,${0.06 + ((i * 13) % 27) / 100})`;
        b.beginPath();
        b.arc(rx * w, ry * h, 0.4 + ((i * 7) % 10) / 11, 0, Math.PI * 2);
        b.fill();
      }

      // Scene names: on the axis from the origin through each scene's centre,
      // 34 map-units past its furthest artist (the live map's placement).
      labels = SKY.realms
        .map((text, r) => {
          if (r === 0) return null;
          const members = SKY.stars.filter((s) => s[4] === r);
          const mx = members.reduce((s, m) => s + m[0], 0) / members.length;
          const my = members.reduce((s, m) => s + m[1], 0) / members.length;
          const len = Math.hypot(mx, my) || 1;
          const dx = mx / len, dy = my / len;
          const far = Math.max(...members.map((m) => m[0] * dx + m[1] * dy)) + 34;
          const x = Math.min(w - 70, Math.max(70, ox + dx * far * k));
          const y = Math.min(h - 26, Math.max(top + 14, oy + dy * far * k));
          return { text, x, y, color: wallInk(REALM_HEX[r]) };
        })
        .filter((l): l is NonNullable<typeof l> => l !== null);
    };

    let raf = 0;
    let visible = true;
    const draw = () => {
      raf = 0;
      const now = performance.now();
      const t = reduced ? Infinity : assemblyClock();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#1a1520";
      ctx.fillRect(0, 0, w, h);
      if (backdrop) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = clamp01((t - FORM_START) / 900);
        ctx.drawImage(backdrop, 0, 0);
        ctx.restore();
      }

      // Every link: flat hairlines, as at the live map's overview zoom.
      const linkA = clamp01((t - LINKS_IN[0]) / (LINKS_IN[1] - LINKS_IN[0]));
      if (linkA > 0) {
        for (const core of [0, 1]) {
          ctx.beginPath();
          for (const [a, b, c] of SKY.links) {
            if (c !== core) continue;
            ctx.moveTo(pts[a][0], pts[a][1]);
            ctx.lineTo(pts[b][0], pts[b][1]);
          }
          ctx.strokeStyle = core ? `rgba(236,222,200,${0.11 * linkA})` : `rgba(205,194,214,${0.055 * linkA})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // Stars.
      const s = Math.max(0.7, k * 0.9);
      SKY.stars.forEach(([, , color, score, realm, phase], i) => {
        const e = easeOut(clamp01((t - delays[i]) / FORM_DUR));
        if (e <= 0) return;
        const x = starts[i][0] + (pts[i][0] - starts[i][0]) * e;
        const y = starts[i][1] + (pts[i][1] - starts[i][1]) * e;
        const tw = reduced ? 0 : Math.sin((now / (3400 + phase * 2800) + phase) * Math.PI * 2);
        const sq = Math.sqrt(score);

        // A short comet tail while it's still flying in.
        if (e < 1) {
          const back = easeOut(clamp01((t - delays[i] - 90) / FORM_DUR));
          const bx = starts[i][0] + (pts[i][0] - starts[i][0]) * back;
          const by = starts[i][1] + (pts[i][1] - starts[i][1]) * back;
          ctx.strokeStyle = `rgba(${rgb(color)},${0.55 * (1 - e)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(x, y);
          ctx.stroke();
        }

        ctx.globalCompositeOperation = "lighter";
        if (FAVOURITES.has(i)) {
          // The two favourites: a slow, warm glow round each.
          const br = 0.5 + 0.5 * Math.sin((now / 3600 + i) * Math.PI * 2);
          const R = Math.max(22, 13 * s) * (1 + br * 0.1);
          const g = ctx.createRadialGradient(x, y, 0, x, y, R);
          g.addColorStop(0, `rgba(255,240,214,${0.55 * e})`);
          g.addColorStop(0.4, `rgba(${rgb(color)},${0.38 * e})`);
          g.addColorStop(1, `rgba(${rgb(color)},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x - R, y - R, R * 2, R * 2);
        }
        if (i === 0 && realm === 0) {
          // The Velvet Underground: the root everything lights out from.
          const br = 0.5 + 0.5 * Math.sin((now / 4200) * Math.PI * 2);
          const R = Math.max(34, 20 * s) * (1 + br * 0.12);
          const g = ctx.createRadialGradient(x, y, 0, x, y, R);
          g.addColorStop(0, `rgba(255,236,200,${0.7 * e})`);
          g.addColorStop(0.35, `rgba(${rgb(color)},${0.5 * e})`);
          g.addColorStop(1, `rgba(${rgb(color)},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x - R, y - R, R * 2, R * 2);
        }
        const haloR = (5.5 + sq * 1.2) * s * (1 + tw * 0.28);
        ctx.globalAlpha = Math.min(1, 0.72 * Math.min(1, 0.5 + sq * 0.065) * (1 + tw * 0.5)) * e;
        ctx.drawImage(haloSprite(color), x - haloR, y - haloR, haloR * 2, haloR * 2);
        ctx.globalCompositeOperation = "source-over";
        const coreR = Math.min(3.2, 1.3 + sq * 0.28) * s * (i === 0 ? 1.6 : 1);
        ctx.globalAlpha = Math.min(1, 0.9 * Math.min(1, 0.5 + sq * 0.12) * (1 + tw * 0.3)) * e;
        ctx.drawImage(bulbSprite(color), x - coreR, y - coreR, coreR * 2, coreR * 2);
        ctx.globalAlpha = 1;
      });

      // Scene names, written on left to right.
      ctx.font = `${Math.round(Math.min(16, Math.max(11, 13.5 * (w / 760))))}px ${marker}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      labels.forEach((l, i) => {
        const p = clamp01((t - LABELS_IN - i * 70) / 420);
        if (p <= 0) return;
        const tw = ctx.measureText(l.text).width;
        ctx.save();
        ctx.beginPath();
        ctx.rect(l.x - tw / 2 - 2, l.y - 14, (tw + 4) * p, 28);
        ctx.clip();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = l.color;
        ctx.fillText(l.text, l.x, l.y);
        ctx.restore();
      });

      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    layout();
    draw();
    const ro = new ResizeObserver(() => {
      layout();
      if (!raf) draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) draw();
    });
    io.observe(canvas);
    // Redraw once the marker font arrives, so the scene names use it.
    document.fonts?.ready.then(() => {
      if (!raf) draw();
    });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <a
      href="#starweave"
      className="p-sw"
      aria-label={`Starweave — an influence map of indie music, ${STARWEAVE.artists} artists and ${STARWEAVE.links} sourced links. Scroll to take it apart.`}
      data-part="01 · Starweave (live, from its real data)"
    >
      <canvas ref={canvasRef} className="sw-canvas" aria-hidden="true" />
      <div className="sw-grain" aria-hidden="true" />
      <div className="sw-bar" aria-hidden="true">
        <span className="sw-logo">Starweave</span>
        <span>Graph</span>
        <span>Browse</span>
        <span>Genres</span>
        <span className="max-[1100px]:hidden">Scenes</span>
        <span className="max-[1100px]:hidden">Mixtape</span>
      </div>

      <div className="sw-ticket once" aria-hidden="true">
        <span className="sw-tape once" />
        <span className="sw-stub">{date}</span>
        <p className="sw-eyebrow">Today&apos;s link</p>
        <p className="sw-name">{TODAY.name}</p>
        <p className="sw-quote">“{TODAY.quote}”</p>
        <p className="sw-caption">{TODAY.caption}</p>
        {TODAY.domain && (
          <span className="sw-source">
            <span>Source</span>
            <span>{TODAY.domain} ↗</span>
          </span>
        )}
      </div>

      <div className="sw-player once" aria-hidden="true">
        <svg className="sw-lead" viewBox="0 0 90 60">
          <path d="M24 60 C24 34 38 24 58 22 C74 20 84 14 96 4" />
        </svg>
        <div className="sw-lcd">
          <span className="sw-lcd-status">
            Playing
            <span className="sw-eq">
              <i />
              <i />
              <i />
              <i />
            </span>
          </span>
          <span className="sw-lcd-name">{NOW_PLAYING.song}</span>
          <span className="sw-lcd-ticker">
            <span>
              {[0, 1].map((k) => (
                <span key={k}>
                  {NOW_PLAYING.artist} · {NOW_PLAYING.record} · {STARWEAVE.artists} artists · {STARWEAVE.links} links, every one sourced ·&nbsp;
                </span>
              ))}
            </span>
          </span>
        </div>
        <div className="sw-wheel">
          <span>Menu</span>
          <b />
        </div>
      </div>
    </a>
  );
}
