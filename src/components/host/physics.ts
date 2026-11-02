// Picking the host up and tossing him: plain screen-space physics, in CSS
// pixels relative to his spot (x right, y down; y = 0 is his spot's floor).
// While held he springs after the pointer; let go, he flies with the
// pointer's last speed, falls, bounces softly off the screen's sides, lands.

export type Body = { x: number; y: number; vx: number; vy: number };
export type Bounds = { left: number; right: number; top: number; floor: number };

const OMEGA = 18;
const ZETA = 0.7;
const GRAVITY = 2600;
const AIR_DRAG = 0.6;
const BOUNCE = 0.35;

/** Held: a damped spring towards (tx, ty). */
export function follow(b: Body, tx: number, ty: number, dt: number) {
  const ax = OMEGA * OMEGA * (tx - b.x) - 2 * ZETA * OMEGA * b.vx;
  const ay = OMEGA * OMEGA * (ty - b.y) - 2 * ZETA * OMEGA * b.vy;
  b.vx += ax * dt;
  b.vy += ay * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

/** Thrown: one step of flight. Returns the landing speed once he's down. */
export function fly(b: Body, dt: number, k: Bounds): number | null {
  b.vy += GRAVITY * dt;
  const drag = Math.exp(-AIR_DRAG * dt);
  b.vx *= drag;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.x < k.left) {
    b.x = k.left;
    b.vx = -b.vx * BOUNCE;
  } else if (b.x > k.right) {
    b.x = k.right;
    b.vx = -b.vx * BOUNCE;
  }
  if (b.y < k.top) {
    b.y = k.top;
    b.vy = 0;
  }
  if (b.y >= k.floor) {
    const speed = Math.hypot(b.vx, b.vy);
    b.y = k.floor;
    b.vx = 0;
    b.vy = 0;
    return speed;
  }
  return null;
}

/** The pointer's speed over its last ~80 ms, from timestamped samples. */
export function release(samples: { t: number; x: number; y: number }[]) {
  const last = samples[samples.length - 1];
  const first = samples.find((s) => last.t - s.t <= 80) ?? last;
  const dt = (last.t - first.t) / 1000;
  if (dt <= 0) return { vx: 0, vy: 0 };
  const cap = 3200;
  const clamp = (v: number) => Math.max(-cap, Math.min(cap, v));
  return { vx: clamp((last.x - first.x) / dt), vy: clamp((last.y - first.y) / dt) };
}
