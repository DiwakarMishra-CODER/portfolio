"use client";

import { useEffect, useRef } from "react";
import { LANDSCAPE } from "../board/spec";
import { PORTRAIT } from "../board/spec-phone";
import { assemblyClock } from "../clock";
import { T } from "../timeline";
import { HATCH, LID_PAD_X, MARK_D, MARK_LETTER, markLayout, nameLayout, type Placed, type Written } from "./glyphs";

/*
 * The laser engraving the name, the way a fibre-laser marker works: after
 * its red guide light has framed the job (CSS, .laser-guide), the beam comes
 * down from the optics above the frame and cuts in two passes — it traces
 * every letter's outline (a hairline, white-hot at the beam, cooling within
 * a fraction of a second to the frosted grey of the finished mark), then
 * rasters the fill so finely it reads as frost forming: a hot edge sweeping
 * down each letter. Then the small lines and the DM hallmark. A crisp star
 * where the beam lands, a few pale sparks, and a thin wisp of fume lifting
 * off the cut and drawn away by the extractor. The frosted mark hands over to
 * the engraving as the chip is set down (its group fades in CSS).
 *
 * Stateless: every frame is drawn from the opening's clock, so frozen `?t=`
 * frames match a live run. It stops drawing once everything has cooled, and
 * frees itself after the fade.
 */

const SIDE = 12; // mm of canvas around the lid, for sparks (more above, for the beam)
const RATE = 0.2; // sparks per ms of cutting
const FUME_RATE = 0.5; // fume puffs per ms of cutting: close enough to merge into a wisp
const FROST = "206,205,199"; // the finished mark's frosted grey (Engraving.tsx)

/** Age (ms since the beam passed) → colour, core alpha, glow strength. Hot
 *  only at the beam; frosted grey within a fraction of a second. */
const COOL: [number, string, number, number][] = [
  [0, "255,255,255", 1, 0.5],
  [30, "255,250,240", 1, 0.38],
  [70, "255,240,220", 0.95, 0.24],
  [130, "240,232,218", 0.9, 0.12],
  [210, "222,219,211", 0.86, 0.04],
  [300, FROST, 0.82, 0], // frosted: held from here on
];
const SETTLE = COOL[COOL.length - 1][0];
const bucketOf = (age: number) => {
  let b = 0;
  while (b < COOL.length - 1 && age >= COOL[b + 1][0]) b++;
  return b;
};

function hash(i: number) {
  let t = (i * 0x9e3779b1) >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** One job for the laser: contours to trace, and a fill to raster. */
type Job = {
  strokes: Written[];
  ox: number;
  oy: number;
  unit: number;
  line: number;
  fill: { glyphs: Placed[]; k: number; gx: number; gy: number; height: number; width: number; span: readonly [number, number]; pitch: number };
};

export default function NameLaser() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const clock0 = assemblyClock();
    if (!Number.isFinite(clock0) || clock0 > T.emberOut[1]) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const phone = window.matchMedia("(max-width: 699px)").matches;
    const S = phone ? PORTRAIT : LANDSCAPE;
    const cs = getComputedStyle(host);
    const mm = parseFloat(cs.getPropertyValue("--mm")) || 8;
    const zoom = parseFloat(cs.getPropertyValue("--mac-k")) || 2.5;
    const sp = 1 / zoom; // canvas px per screen px, while the chip is held up close
    const name = nameLayout(), mark = markLayout();
    const capH = S.NAME.capH * mm;

    // The close-up centres N (lid px, as Board.tsx's introCss) on the screen;
    // the beam comes down from just above the screen's top edge.
    const nb = { x: LID_PAD_X * mm, y: S.NAME.top * mm, w: name.width * capH, h: name.height * capH };
    const N = { x: phone ? nb.x + nb.w / 2 : host.offsetWidth / 2, y: nb.y + nb.h / 2 };
    const screenTop = N.y - (window.innerHeight / 2) * sp;
    const side = SIDE * mm;
    const top = Math.max(side, -screenTop + 40 * sp);
    const w = host.offsetWidth + 2 * side, h = host.offsetHeight + top + side;
    canvas.style.inset = "auto"; // the shorthand first: it would reset left/top
    Object.assign(canvas.style, { left: `${-side}px`, top: `${-top}px`, width: `${w}px`, height: `${h}px` });
    const k = Math.min(3, (window.devicePixelRatio || 1) * zoom);
    canvas.width = Math.round(w * k);
    canvas.height = Math.round(h * k);
    const optics = { x: side + N.x, y: top + screenTop - 30 * sp }; // out of frame, above

    const markUnit = (MARK_D / 2) * mm;
    const jobs: Job[] = [
      {
        strokes: name.strokes,
        ox: side + nb.x,
        oy: top + nb.y,
        unit: capH,
        line: Math.max(1, 0.012 * capH),
        fill: { glyphs: name.glyphs, k: 1, gx: 0, gy: 0, height: name.height, width: name.width, span: T.fill, pitch: HATCH },
      },
      {
        strokes: mark.strokes,
        ox: side + (S.U1_BODY.w - 1.6 - MARK_D) * mm,
        oy: top + 1.4 * mm,
        unit: markUnit,
        line: Math.max(0.8, 0.02 * markUnit),
        fill: { glyphs: mark.glyphs, k: MARK_LETTER, gx: mark.ox, gy: mark.oy, height: 2, width: 2, span: [T.mark[1] - 40, T.mark[1] + 30], pitch: 0.04 },
      },
    ];
    const px = (j: Job, x: number, y: number): [number, number] => [j.ox + x * j.unit, j.oy + y * j.unit];

    // The fill's raster, swept top to bottom: the letters drawn once, white,
    // into their own small canvas; each frame copies strips of it (no
    // per-frame clipping — that dropped frames on Retina screens).
    const fills = jobs.map((j) => {
      const f = j.fill;
      const shape = new Path2D();
      for (const g of f.glyphs) shape.addPath(new Path2D(g.d), new DOMMatrix().translate(f.gx, f.gy).scale(f.k).translate(g.x, g.y));
      const x0 = j.ox - j.unit * 0.1, top = j.oy - j.unit * 0.1;
      const bw = (f.width + 0.2) * j.unit, bh = (f.height + 0.2) * j.unit;
      const ink = document.createElement("canvas");
      ink.width = Math.ceil(bw * k);
      ink.height = Math.ceil(bh * k);
      const ic = ink.getContext("2d");
      if (ic) {
        ic.setTransform(k * j.unit, 0, 0, k * j.unit, (j.ox - x0) * k, (j.oy - top) * k);
        ic.fillStyle = "#fff";
        ic.fill(shape);
      }
      return { ink, x0, top, bw, bh, speed: (f.height * j.unit) / (f.span[1] - f.span[0]) }; // px per ms
    });
    /** Copy the strip [y0, y1) × [xa, xb) of a job's letters (canvas px). */
    const strip = (fl: (typeof fills)[number], y0: number, y1: number, xa = fl.x0, xb = fl.x0 + fl.bw) => {
      const a = Math.max(y0, fl.top), b = Math.min(y1, fl.top + fl.bh);
      if (b <= a || xb <= xa) return;
      ctx.drawImage(fl.ink, (xa - fl.x0) * k, (a - fl.top) * k, (xb - xa) * k, (b - a) * k, xa, a, xb - xa, b - a);
    };
    const HOT = 150; // ms the fill stays hot behind the sweep

    // The small lines' finer pass: a sweep across each (their heat is CSS).
    const lid = host.querySelector<HTMLElement>(".u1-lid");
    const smalls = [...host.querySelectorAll<HTMLElement>(".u1-burn .burn-ln")].map((el, i) => {
      const [a, b] = i === 0 ? T.small1 : T.small2;
      return { x: side + (lid?.offsetLeft ?? 0) + el.offsetLeft, y: top + (lid?.offsetTop ?? 0) + el.offsetTop + el.offsetHeight / 2, w: el.offsetWidth, a, d: b - a };
    });

    // Where the beam is at time t (null while it's blanked).
    const beamAt = (t: number): [number, number] | null => {
      for (const j of jobs) {
        for (const st of j.strokes) {
          if (t < st.start || t > st.at[st.at.length - 1]) continue;
          let i = 1;
          while (i < st.at.length - 1 && st.at[i] < t) i++;
          const u = (t - st.at[i - 1]) / (st.at[i] - st.at[i - 1] || 1);
          const [ax, ay] = px(j, ...st.pts[i - 1]), [bx, by] = px(j, ...st.pts[i]);
          return [ax + (bx - ax) * u, ay + (by - ay) * u];
        }
      }
      // A fill pass: the beam rasters back and forth across the current line.
      for (const j of jobs) {
        const f = j.fill;
        if (t < f.span[0] || t > f.span[1]) continue;
        const u = (t - f.span[0]) / (f.span[1] - f.span[0]);
        const row = u * (f.height / f.pitch), frac = row % 1, across = Math.floor(row) % 2 ? 1 - frac : frac;
        return [j.ox + across * f.width * j.unit, j.oy + u * f.height * j.unit];
      }
      for (const l of smalls) if (t >= l.a && t <= l.a + l.d) return [l.x + (l.w * (t - l.a)) / l.d, l.y];
      return null;
    };
    const beamEnd = Math.max(T.mark[1] + 30, T.small2[1]);

    // Sparks, precomputed from a seeded hash: born where the beam cuts.
    const sparks: { born: number; x: number; y: number; vx: number; vy: number; life: number; ember: boolean }[] = [];
    for (let tb = T.write[0], i = 0; tb < beamEnd; tb += 1 / RATE, i++) {
      const p = beamAt(tb);
      if (!p) continue;
      const r = hash(i + 1);
      const ang = r() * Math.PI * 2, speed = (10 + 65 * r() ** 3) * mm;
      sparks.push({ born: tb, x: p[0], y: p[1], vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 70 + 200 * r(), ember: false });
    }
    // Fume: puffs born at the cut, lifting and drawn off to the right by the
    // extractor, swelling and thinning as they go.
    const fume: { born: number; x: number; y: number; vx: number; vy: number; life: number; ph: number }[] = [];
    for (let tb = T.write[0], i = 0; tb < beamEnd; tb += 1 / FUME_RATE, i++) {
      const p = beamAt(tb);
      if (!p) continue;
      const r = hash(i + 7919);
      fume.push({ born: tb, x: p[0], y: p[1], vx: (4.5 + 2 * r()) * mm, vy: -(8 + 2.5 * r()) * mm, life: 320 + 160 * r(), ph: r() * 6.28 });
    }
    const puff = document.createElement("canvas");
    puff.width = puff.height = 64;
    const pc = puff.getContext("2d");
    if (pc) {
      const g = pc.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,246,232,1)");
      g.addColorStop(0.45, "rgba(255,240,222,0.45)");
      g.addColorStop(1, "rgba(255,236,214,0)");
      pc.fillStyle = g;
      pc.fillRect(0, 0, 64, 64);
    }
    const first = T.write[0];
    const last = Math.max(T.fill[1], ...jobs.flatMap((j) => j.strokes.map((st) => st.at[st.at.length - 1])));
    const settled = Math.max(last + SETTLE, Math.max(...jobs.map((j) => j.fill.span[1])) + HOT, beamEnd, ...sparks.map((s) => s.born + s.life), ...fume.map((q) => q.born + q.life)) + 20;
    const TAU = 0.12;
    const fly = (s: (typeof sparks)[number], age: number) => {
      const q = TAU * (1 - Math.exp(-age / 1000 / TAU));
      return [s.x + s.vx * q, s.y + s.vy * q];
    };

    let raf = 0, drewSettled = false;
    const draw = () => {
      raf = 0;
      const t = assemblyClock();
      const frozen = window.__asmFreeze != null;
      if (t > T.emberOut[1] + 100 && !frozen) {
        canvas.width = canvas.height = 0; // faded out: free it
        return;
      }
      if (t >= settled && drewSettled && !frozen) {
        raf = requestAnimationFrame(draw); // all cooled, nothing moving: keep the frame
        return;
      }
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (t >= first) {
        // 1 · The fill: frost forming behind a hot edge that sweeps down the
        // letters (the raster is too fine to see as lines), and the row the
        // beam is on right now, burning across.
        ctx.globalCompositeOperation = "source-over";
        jobs.forEach((j, ji) => {
          const f = fills[ji], sp0 = j.fill.span[0];
          if (t < sp0) return;
          const front = j.oy + (t - sp0) * f.speed, hot = HOT * f.speed;
          // Cooled: the frosted mark (white letters at the frost's strength).
          ctx.globalAlpha = 0.81;
          strip(f, f.top, front - hot);
          // Hot: rising to white at the edge, in thin slices.
          const SL = 6;
          for (let i = 0; i < SL; i++) {
            ctx.globalAlpha = 0.81 + (0.19 * (i + 1)) / SL;
            strip(f, front - hot + (hot * i) / SL, front - hot + (hot * (i + 1)) / SL);
          }
          // The row the beam is burning across right now.
          if (t <= j.fill.span[1]) {
            const beam = beamAt(t);
            if (beam) {
              const row = ((t - sp0) / (j.fill.span[1] - sp0)) * (j.fill.height / j.fill.pitch);
              const from = Math.floor(row) % 2 ? f.x0 + f.bw : f.x0;
              ctx.globalAlpha = 1;
              strip(f, front, front + j.fill.pitch * j.unit * 1.5, Math.min(from, beam[0]), Math.max(from, beam[0]));
            }
          }
          ctx.globalAlpha = 1;
        });

        // 2 · The contours: hairlines, in age buckets (glow, then core).
        const paths = jobs.map(() => COOL.map(() => new Path2D()));
        jobs.forEach((j, ji) => {
          for (const st of j.strokes) {
            if (st.start > t) continue;
            for (let i = 1; i < st.pts.length; i++) {
              const ta = st.at[i - 1], tb = st.at[i];
              if (ta > t) break;
              const [ax, ay] = px(j, ...st.pts[i - 1]);
              let [bx, by] = px(j, ...st.pts[i]);
              if (tb > t) {
                const u = (t - ta) / (tb - ta || 1);
                bx = ax + (bx - ax) * u;
                by = ay + (by - ay) * u;
              }
              const path = paths[ji][bucketOf(t - Math.min(tb, t))];
              path.moveTo(ax, ay);
              path.lineTo(bx, by);
            }
          }
        });
        // Cooled lines lie flat on the mark (no adding up where they cross
        // the frost); hot ones give light.
        const cooled = COOL.length - 1;
        ctx.globalCompositeOperation = "lighter";
        jobs.forEach((j, ji) =>
          COOL.forEach(([, rgb, , glow], b) => {
            if (!glow) return;
            ctx.strokeStyle = `rgba(${rgb},${glow})`;
            ctx.lineWidth = j.line * 4;
            ctx.stroke(paths[ji][b]);
          }),
        );
        jobs.forEach((j, ji) =>
          COOL.forEach(([, rgb, a], b) => {
            ctx.globalCompositeOperation = b === cooled ? "source-over" : "lighter";
            ctx.strokeStyle = `rgba(${rgb},${a})`;
            ctx.lineWidth = j.line;
            ctx.stroke(paths[ji][b]);
          }),
        );
        ctx.globalCompositeOperation = "lighter";

        // Fume, lit by the beam: a thin wisp lifting off the cut.
        for (const q of fume) {
          const age = t - q.born;
          if (age < 0 || age > q.life) continue;
          const u = age / q.life, s = age / 1000;
          const x = q.x + q.vx * s + Math.sin(q.ph + age / 70) * 0.25 * mm * u;
          const y = q.y + q.vy * s;
          const rad = (0.3 + 1.1 * u) * mm;
          ctx.globalAlpha = 0.07 * Math.sin(Math.PI * Math.min(1, u * 1.4 + 0.05)) * (1 - u * 0.6);
          ctx.drawImage(puff, x - rad, y - rad, 2 * rad, 2 * rad);
        }
        ctx.globalAlpha = 1;

        // 3 · The beam: a hairline from the optics above, a crisp star where it lands.
        const beam = beamAt(t);
        if (beam) {
          const [bx, by] = beam;
          const g = ctx.createLinearGradient(optics.x, optics.y, bx, by);
          g.addColorStop(0, "rgba(255,240,215,0)");
          g.addColorStop(0.55, "rgba(255,244,226,0.5)");
          g.addColorStop(1, "rgba(255,252,244,1)");
          for (const [lw, a] of [[12, 0.05], [4, 0.14], [1, 1]] as const) {
            ctx.globalAlpha = a;
            ctx.strokeStyle = lw < 2 ? g : "rgba(255,214,160,1)";
            ctx.lineWidth = lw * sp;
            ctx.beginPath();
            ctx.moveTo(optics.x, optics.y);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          // The landing point: a white core, a tight bloom, a thin four-point star.
          const R = 0.9 * mm;
          const bloom = ctx.createRadialGradient(bx, by, 0, bx, by, R);
          bloom.addColorStop(0, "rgba(255,255,255,1)");
          bloom.addColorStop(0.18, "rgba(255,246,228,0.7)");
          bloom.addColorStop(1, "rgba(255,190,110,0)");
          ctx.fillStyle = bloom;
          ctx.fillRect(bx - R, by - R, 2 * R, 2 * R);
          for (const [dx, dy, len] of [[1, 0, 5.5], [0, 1, 2.6]] as const) {
            const L = len * mm;
            const sg = ctx.createLinearGradient(bx - dx * L, by - dy * L, bx + dx * L, by + dy * L);
            sg.addColorStop(0, "rgba(255,240,220,0)");
            sg.addColorStop(0.5, "rgba(255,250,240,0.75)");
            sg.addColorStop(1, "rgba(255,240,220,0)");
            ctx.strokeStyle = sg;
            ctx.lineWidth = 1.2 * sp;
            ctx.beginPath();
            ctx.moveTo(bx - dx * L, by - dy * L);
            ctx.lineTo(bx + dx * L, by + dy * L);
            ctx.stroke();
          }
        }

        // Sparks.
        for (const s of sparks) {
          const age = t - s.born;
          if (age < 0 || age > s.life) continue;
          const u = age / s.life;
          const [x, y] = fly(s, age);
          const [qx, qy] = fly(s, Math.max(0, age - (s.ember ? 8 : 14)));
          const col = u < 0.3 ? "255,252,244" : u < 0.65 ? "255,238,208" : "255,214,170";
          ctx.strokeStyle = `rgba(${col},${(1 - u * u).toFixed(3)})`;
          ctx.lineWidth = (s.ember ? 0.24 : 0.15 * (1 - u) + 0.05) * mm;
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          ctx.lineTo(x + 0.01, y);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      if (t >= settled) drewSettled = true;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="name-laser" aria-hidden="true" />;
}
