"use client";

import { useEffect, useRef } from "react";
import { chamferPts, type Pt } from "../board/geom";
import { GROWTH, PULSES, type Pulse } from "../board/power";
import { LANDSCAPE, type Spec } from "../board/spec";
import { PORTRAIT } from "../board/spec-phone";
import { assemblyClock } from "../clock";

/*
 * The opening's moving copper, drawn on a canvas — `copper` (traces growing
 * out of the chip, under the mask) or `pulses` (current at power-on, above
 * it). A canvas redraws only these lines each frame; the same animation as
 * ~100 SVG paths with animated dashes made the browser repaint a board-sized
 * layer every frame, which stuttered on Retina laptops. Stateless (every
 * frame is drawn from the clock), so `?t=` frames match a live run; once its
 * window has passed it clears itself and frees the canvas.
 */

type Path = { pts: Pt[]; cum: number[]; width: number; start: number; dur: number; len: number };

function prepare(list: Pulse[]): Path[] {
  return list.map((p) => {
    const pts = chamferPts(p.pts, Math.max(0.3, p.width * 2));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, width: p.width, start: p.start, dur: p.dur, len: cum[cum.length - 1] };
  });
}

/** Trace the part of a path between lengths a and b (mm). */
function sub(ctx: CanvasRenderingContext2D, p: Path, a: number, b: number) {
  a = Math.max(0, a);
  b = Math.min(p.len, b);
  if (b <= a) return;
  const at = (l: number): Pt => {
    let i = 1;
    while (i < p.cum.length - 1 && p.cum[i] < l) i++;
    const s = (l - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1] || 1);
    return [p.pts[i - 1][0] + (p.pts[i][0] - p.pts[i - 1][0]) * s, p.pts[i - 1][1] + (p.pts[i][1] - p.pts[i - 1][1]) * s];
  };
  const [x0, y0] = at(a);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < p.cum.length - 1; i++) if (p.cum[i] > a && p.cum[i] < b) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
  const [x1, y1] = at(b);
  ctx.lineTo(x1, y1);
}

const TIP = 1.6; // mm of bright, fresh copper at a growing end
const PULSE = 8; // mm of light per current pulse

export default function BoardFx({ kind }: { kind: "copper" | "pulses" }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !Number.isFinite(assemblyClock())) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const phone = window.matchMedia("(max-width: 699px)").matches;
    const S: Spec = phone ? PORTRAIT : LANDSCAPE;
    const paths = prepare((kind === "copper" ? GROWTH : PULSES)[phone ? "p" : "l"]);
    const first = Math.min(...paths.map((p) => p.start));
    const last = Math.max(...paths.map((p) => p.start + p.dur));
    if (assemblyClock() > last) return;

    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    const k = Math.min(3, (window.devicePixelRatio || 1) * 1.06); // the board's small settle
    canvas.width = Math.round(w * k);
    canvas.height = Math.round(h * k);
    const mm = (w / S.BOARD.w) * k;

    let raf = 0;
    const draw = () => {
      raf = 0;
      const t = assemblyClock();
      if (t > last + 50) {
        canvas.width = canvas.height = 0; // done: free it
        return;
      }
      ctx.setTransform(mm, 0, 0, mm, 0, 0);
      ctx.clearRect(0, 0, S.BOARD.w, S.BOARD.h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (t >= first) {
        if (kind === "copper") {
          // Grown copper, then each growing end's bright tip.
          for (const p of paths) {
            const l = ((t - p.start) / p.dur) * p.len;
            if (l <= 0) continue;
            ctx.beginPath();
            sub(ctx, p, 0, l);
            ctx.strokeStyle = "#c9773f";
            ctx.lineWidth = p.width;
            ctx.stroke();
            if (l < p.len) {
              ctx.beginPath();
              sub(ctx, p, l - TIP, l);
              ctx.strokeStyle = "rgba(255, 225, 189, 0.9)";
              ctx.lineWidth = p.width + 0.2;
              ctx.stroke();
            }
          }
        } else {
          // Each pulse: a short glowing dash travelling its trace once.
          ctx.globalCompositeOperation = "lighter";
          for (const p of paths) {
            const u = (t - p.start) / Math.max(60, p.dur);
            if (u < 0 || u > 1) continue;
            const head = u * (p.len + PULSE);
            const fade = u > 0.92 ? (1 - u) / 0.08 : 1;
            ctx.beginPath();
            sub(ctx, p, head - PULSE, head);
            ctx.strokeStyle = `rgba(255, 112, 30, ${0.55 * fade})`;
            ctx.lineWidth = p.width + 1.6;
            ctx.stroke();
            ctx.strokeStyle = `rgba(255, 242, 216, ${fade})`;
            ctx.lineWidth = Math.max(0.34, p.width * 1.1);
            ctx.stroke();
          }
          ctx.globalCompositeOperation = "source-over";
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [kind]);

  return <canvas ref={ref} className={`hb-layer hb-fx-${kind}`} aria-hidden="true" />;
}
