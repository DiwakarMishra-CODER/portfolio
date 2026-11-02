// The audience behind a double bill, drawn as a cinema's seats in a raked
// fan of rows. Every seat stands for a share of the MovieLens people who
// loved your film (phase 1: all lit); then the share of them who also loved
// its partner stays lit in gold and the rest go dark (phase 2). Which seats
// are gold is spread by a fixed shuffle per film, so it reads as a crowd.
const ROWS = 10;
type Seat = { x: number; y: number; w: number; r: number; row: number };
const seats: Seat[] = [];
for (let row = 0; row < ROWS; row++) {
  const n = 18 + row * 3;
  const R = 430 + row * 31;
  for (let k = 0; k < n; k++) {
    const t = -0.56 + (1.12 * (k + 0.5)) / n;
    // Rounded, so the server and the browser print the same numbers.
    const q = (v: number) => Math.round(v * 10) / 10;
    seats.push({ x: q(500 + R * Math.sin(t)), y: q(-330 + R * Math.cos(t)), w: q(11 + row * 0.9), r: q((-t * 180) / Math.PI), row });
  }
}
export const SEATS = seats.length;

/** Seat indices in a fixed order per film (so the gold ones are spread). */
function order(seed: number) {
  let s = (seed % 2147483646) + 1;
  const idx = seats.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export default function Auditorium({ phase, gold, seed }: { phase: 0 | 1 | 2; gold: number; seed: number }) {
  const lit = new Set(order(seed).slice(0, Math.round(gold * SEATS)));
  return (
    <svg className="ah-seats" viewBox="0 70 1000 360" data-phase={phase} aria-hidden="true">
      {seats.map((s, i) => (
        <rect
          key={i}
          className={lit.has(i) ? "g" : undefined}
          x={(s.x - s.w / 2).toFixed(1)}
          y={(s.y - s.w * 0.45).toFixed(1)}
          width={s.w}
          height={(s.w * 0.9).toFixed(1)}
          rx={(s.w * 0.28).toFixed(1)}
          transform={`rotate(${s.r} ${s.x} ${s.y})`}
          style={{ "--d": `${s.row * 45 + (i % 7) * 12}ms` } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}
