// Board geometry in millimetres. Everything on the board is drawn from these
// helpers so the routing obeys real rules: 45° bends only, buses that stay
// parallel through every bend, silkscreen in a real stroke font.
import { GLYPHS, SPACE_HALF } from "./hershey-data";

export type Pt = [number, number];
export type Rect = { x: number; y: number; w: number; h: number };

const f = (n: number) => (Math.round(n * 100) / 100).toString();

// ── Silkscreen text (Hershey Simplex strokes) ──────────────────────────────

/** Stroke-font text as an SVG path. `y` is the baseline; `h` the cap height (mm). */
export function silk(text: string, x: number, y: number, h: number, anchor: "start" | "middle" | "end" = "start", track = 0.08): string {
  const s = h / 21;
  const width = textWidth(text, h, track);
  let cx = anchor === "start" ? x : anchor === "middle" ? x - width / 2 : x - width;
  let d = "";
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch];
    if (!g) {
      cx += (2 * SPACE_HALF + 0) * s + track * h;
      continue;
    }
    const [path, half] = g;
    for (const seg of path.split("M").filter(Boolean)) {
      const pts = seg.replace(/L/g, " ").trim().split(/\s+/).map((p) => p.split(",").map(Number));
      pts.forEach(([gx, gy], i) => {
        d += `${i ? "L" : "M"}${f(cx + gx * s)} ${f(y + (gy - 22) * s)}`;
      });
    }
    cx += 2 * half * s + track * h;
  }
  return d;
}

export function textWidth(text: string, h: number, track = 0.08) {
  const s = h / 21;
  let w = 0;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch];
    w += (g ? 2 * g[1] : 2 * SPACE_HALF) * s + track * h;
  }
  return w - track * h;
}

// ── Routing ────────────────────────────────────────────────────────────────

/** A polyline as a path with every corner chamfered (cut `c` mm back along
 *  both legs). Waypoints are authored at 0°/45°/90°; chamfering a 90° corner
 *  turns it into two 45° bends, as real routing does. */
export function chamfered(pts: Pt[], c: number): string {
  return chamferPts(pts, c).map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join("");
}

/** The chamfered polyline's points (as drawn), for code that draws it itself. */
export function chamferPts(pts: Pt[], c: number): Pt[] {
  if (pts.length < 2) return [];
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], [cx, cy] = pts[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by);
    const k = Math.min(c, l1 / 2, l2 / 2);
    const turn = Math.abs(((ax - bx) * (cx - bx) + (ay - by) * (cy - by)) / (l1 * l2));
    // A 135° corner (already a 45° bend) needs no chamfer; a 90° one does.
    if (turn > 0.99 || turn < 0.5) {
      out.push([bx - ((bx - ax) / l1) * k, by - ((by - ay) / l1) * k], [bx + ((cx - bx) / l2) * k, by + ((cy - by) / l2) * k]);
    } else {
      out.push([bx, by]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Offset a polyline sideways by `off` mm using miter joins — so every line
 *  of a bus stays exactly parallel to the centreline through 45° bends. */
export function offset(pts: Pt[], off: number): Pt[] {
  const n = pts.length;
  const normal = (a: Pt, b: Pt): Pt => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  return pts.map((p, i) => {
    if (i === 0) {
      const nn = normal(p, pts[1]);
      return [p[0] + nn[0] * off, p[1] + nn[1] * off];
    }
    if (i === n - 1) {
      const nn = normal(pts[i - 1], p);
      return [p[0] + nn[0] * off, p[1] + nn[1] * off];
    }
    const n1 = normal(pts[i - 1], p), n2 = normal(p, pts[i + 1]);
    const mx = n1[0] + n2[0], my = n1[1] + n2[1];
    const ml = Math.hypot(mx, my) || 1;
    const cos = (n1[0] * mx + n1[1] * my) / ml;
    const k = off / (cos || 1);
    return [p[0] + (mx / ml) * k, p[1] + (my / ml) * k];
  });
}

/** A bus: `n` parallel lines at `pitch`, centred on the centreline. Line 0 is
 *  on the left of the direction of travel. */
export function bus(center: Pt[], n: number, pitch: number): Pt[][] {
  return Array.from({ length: n }, (_, i) => offset(center, (i - (n - 1) / 2) * pitch));
}

/** Polyline length (for constant-speed current pulses and length matching). */
export function lengthOf(pts: Pt[]) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

// ── Design-rule check (dev only) ───────────────────────────────────────────

const segDist = (p: Pt, q: Pt, r: Pt, s: Pt) => {
  const d = (a: Pt, b: Pt, c: Pt) => {
    const vx = c[0] - b[0], vy = c[1] - b[1];
    const t = Math.max(0, Math.min(1, ((a[0] - b[0]) * vx + (a[1] - b[1]) * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(a[0] - b[0] - t * vx, a[1] - b[1] - t * vy);
  };
  const cross = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inter = Math.sign(cross(p, q, r)) !== Math.sign(cross(p, q, s)) && Math.sign(cross(r, s, p)) !== Math.sign(cross(r, s, q));
  return inter ? 0 : Math.min(d(p, r, s), d(q, r, s), d(r, p, q), d(s, p, q));
};

export type Trace = { net: string; pts: Pt[]; width: number };

/** Trace-to-trace clearance between different nets, and traces against part
 *  keep-outs (a trace may only enter a part it terminates on). */
export function drc(traces: Trace[], keepouts: (Rect & { id: string; nets?: string[] })[], clearance = 0.15): string[] {
  const errors: string[] = [];
  const segs = traces.flatMap((t) => t.pts.slice(1).map((p, i) => ({ net: t.net, a: t.pts[i], b: p, w: t.width })));
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i], o = segs[j];
      if (s.net === o.net) continue;
      const gap = segDist(s.a, s.b, o.a, o.b) - (s.w + o.w) / 2;
      if (gap < clearance - 1e-6) errors.push(`clearance ${gap.toFixed(3)}mm between ${s.net} and ${o.net} near ${s.a.map((v) => v.toFixed(1))}`);
    }
  }
  for (const k of keepouts) {
    for (const s of segs) {
      if (k.nets?.some((n) => s.net.startsWith(n))) continue;
      const inside = (p: Pt) => p[0] > k.x && p[0] < k.x + k.w && p[1] > k.y && p[1] < k.y + k.h;
      for (let t = 0; t <= 1; t += 0.05) {
        const p: Pt = [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t];
        if (inside(p)) {
          errors.push(`${s.net} crosses ${k.id} at ${p.map((v) => v.toFixed(1))}`);
          break;
        }
      }
    }
  }
  return errors;
}

export const rect = (r: Rect, extra = "") =>
  `<rect x="${f(r.x)}" y="${f(r.y)}" width="${f(r.w)}" height="${f(r.h)}"${extra}/>`;
export { f as fmt };
