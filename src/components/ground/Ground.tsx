"use client";

// The page's ground. One calm surface for the whole page: a fine pixel grain
// (CSS, on <html>, see globals.css), and this canvas over it, which draws only
// where light falls on that grain, as bigger, paler, warmer pixels:
//   - his pool of light and shadow on the floor, under him wherever he's thrown
//     (the shadow shrinks and fades as he rises; his glow is the hero's dawn light);
//   - a faint wake under the cursor that settles when the cursor stops.
// Light only ever makes the grain paler or warmer, so text on it never loses
// contrast. It draws only when something moved: nothing at all on a still page.
// Under reduced motion there's no wake, and the light only keeps its place.
import { useEffect, useRef } from "react";

const PITCH = 6; // px between grain dots (globals.css draws the same grid)
const FEET = 0.9; // his feet, as a share of his canvas height (engine framing)

// Light levels: from the grain dot, through cream, to a warm peach; dots grow.
const LIGHT = levels(8, (t) => ({
  size: 2 + t * 2.2,
  rgb: t < 0.3 ? mix([227, 214, 195], [253, 248, 240], t / 0.3) : mix([253, 248, 240], [255, 205, 164], (t - 0.3) / 0.7),
}));
// Shadow levels: the grain dot, darker and a little bigger.
const SHADE = levels(4, (t) => ({ size: 2 + t * 1.6, rgb: mix([227, 214, 195], [178, 160, 138], t) }));

export default function Ground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      request();
    };

    // The cursor's wake: where it is (smoothed), and how much it has moved lately.
    const wake = { x: 0, y: 0, tx: 0, ty: 0, energy: 0 };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const moved = wake.energy ? Math.hypot(e.clientX - wake.tx, e.clientY - wake.ty) : 0;
      if (!wake.energy) Object.assign(wake, { x: e.clientX, y: e.clientY });
      wake.tx = e.clientX;
      wake.ty = e.clientY;
      wake.energy = Math.min(1, Math.max(wake.energy, 0.02) + moved / 260);
      request();
    };

    type Ellipse = { x: number; y: number; rx: number; ry: number; a: number };
    const lights: Ellipse[] = [];
    const shades: Ellipse[] = [];

    // Where the host is now: his canvas once it's live (it moves when he's
    // thrown), his spot before that. His floor is his spot's.
    function host() {
      const spot = document.querySelector<HTMLElement>('[data-host-spot="hero"]');
      if (!spot || spot.classList.contains("is-empty")) return; // he's walked on to a room
      const s = spot.getBoundingClientRect();
      const b = (spot.classList.contains("is-live") && spot.querySelector(".host-canvas")?.getBoundingClientRect()) || s;
      if (b.bottom < -200 || b.top > h + 200) return;
      const lift = Math.max(0, s.bottom - b.bottom);
      const x = b.left + b.width / 2;
      const floor = s.top + s.height * FEET;
      lights.push({ x, y: floor, rx: b.width * 0.62, ry: b.width * 0.15, a: 0.95 / (1 + lift / 140) });
      const r = b.width * 0.2 * (1 + lift / 600);
      shades.push({ x, y: floor, rx: r, ry: r * 0.26, a: 1 / (1 + lift / 80) });
    }

    let raf = 0;
    let last = 0;
    function request() {
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function frame(now: number) {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      lights.length = 0;
      shades.length = 0;
      host();
      if (wake.energy > 0.01 && !still) {
        const k = 1 - Math.exp(-dt * 14);
        wake.x += (wake.tx - wake.x) * k;
        wake.y += (wake.ty - wake.y) * k;
        wake.energy *= Math.exp(-dt * 1.6);
        lights.push({ x: wake.x, y: wake.y, rx: 170, ry: 170, a: wake.energy * 0.6 });
        request();
      } else {
        wake.energy = 0;
        last = 0;
      }
      draw();
    }

    // One pass over the grain cells inside everything lit, bucketed by level
    // so each level is one colour.
    const buckets = [...LIGHT, ...SHADE].map(() => [] as number[]);
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const all = [...lights, ...shades];
      if (!all.length) return;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const e of all) {
        x0 = Math.min(x0, e.x - e.rx);
        y0 = Math.min(y0, e.y - e.ry);
        x1 = Math.max(x1, e.x + e.rx);
        y1 = Math.max(y1, e.y + e.ry);
      }
      // The grain scrolls with the page; this canvas doesn't.
      const ox = -window.scrollX % PITCH;
      const oy = -window.scrollY % PITCH;
      const c0 = Math.floor((Math.max(0, x0) - ox) / PITCH);
      const c1 = Math.ceil((Math.min(w, x1) - ox) / PITCH);
      const r0 = Math.floor((Math.max(0, y0) - oy) / PITCH);
      const r1 = Math.ceil((Math.min(h, y1) - oy) / PITCH);
      for (const b of buckets) b.length = 0;
      for (let r = r0; r <= r1; r++) {
        const y = oy + r * PITCH + PITCH / 2;
        for (let c = c0; c <= c1; c++) {
          const x = ox + c * PITCH + PITCH / 2;
          let light = 0;
          for (const e of lights) light += falloff(e, x, y);
          let shade = 0;
          for (const e of shades) shade = Math.max(shade, falloff(e, x, y));
          const v = shade > 0.12 ? -shade : Math.min(1, light) * (1 - shade * 4);
          if (v > 0.035) buckets[Math.min(LIGHT.length, Math.ceil(v * LIGHT.length)) - 1].push(x, y);
          else if (v < -0.12) buckets[LIGHT.length + Math.min(SHADE.length, Math.ceil(-v * SHADE.length)) - 1].push(x, y);
        }
      }
      [...LIGHT, ...SHADE].forEach((lv, i) => {
        const pts = buckets[i];
        if (!pts.length) return;
        // Whole device pixels, centred on the grain dot they replace.
        const s = Math.max(2, Math.round(lv.size * dpr));
        ctx!.fillStyle = lv.css;
        for (let j = 0; j < pts.length; j += 2) ctx!.fillRect(Math.round(pts[j] * dpr - s / 2), Math.round(pts[j + 1] * dpr - s / 2), s, s);
      });
    }

    const onHost = () => request();
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("hostmove", onHost);
    if (!still) window.addEventListener("pointermove", onPointer, { passive: true });
    // His spot can shift as fonts and images settle.
    const ro = new ResizeObserver(request);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", request);
      window.removeEventListener("hostmove", onHost);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return <canvas ref={ref} className="ground" aria-hidden="true" />;
}

/** 0 outside the ellipse, rising smoothly to `a` at its centre. */
function falloff(e: { x: number; y: number; rx: number; ry: number; a: number }, x: number, y: number) {
  const dx = (x - e.x) / e.rx;
  const dy = (y - e.y) / e.ry;
  const q = dx * dx + dy * dy;
  return q >= 1 ? 0 : e.a * (1 - q) * (1 - q);
}

function mix(a: number[], b: number[], t: number) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * Math.min(1, Math.max(0, t))));
}

function levels(n: number, at: (t: number) => { size: number; rgb: number[] }) {
  return Array.from({ length: n }, (_, i) => {
    const { size, rgb } = at((i + 1) / n);
    return { size, css: `rgb(${rgb.join(",")})` };
  });
}
