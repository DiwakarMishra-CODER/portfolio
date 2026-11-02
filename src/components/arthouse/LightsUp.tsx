import { label } from "./fonts";
import "./lightsup.css";

// The wall lights, in pairs from the outside in (x in %, its pair's turn).
const SCONCES = [
  [9, 0], [91, 0], [23, 1], [77, 1], [36, 2], [64, 2],
];
// The aisle's step lights, converging on the door (x in %, y in % of the floor).
const STEPS = [0, 1, 2, 3, 4].flatMap((i) => {
  const t = i / 4;
  return [
    [44 - t * 26, 8 + t * 80],
    [56 + t * 26, 8 + t * 80],
  ];
});

/**
 * After Arthouse Atlas, the house lights come up. The cinema's wall warms as
 * its lights come on in pairs; a green EXIT sign glows over a door with
 * daylight round its edges. The host gets up from his seat and walks out
 * (HostLayer's walk-out): down to the door, which swings open, and into the
 * light, which floods the screen and becomes the next section's page. A
 * sticky stage scrubbed by the scroll (CSS only); outside that support or
 * with reduced motion, the lit wall and the open door, fading to the page.
 */
export default function LightsUp() {
  return (
    <section className={`lu ${label.variable}`} data-lightsup aria-label="The house lights come up">
      <div className="lu-stage" aria-hidden="true">
        <div className="lu-warm" />
        {SCONCES.map(([x, k]) => (
          <i key={x} className="lu-sconce" style={{ left: `${x}%`, "--k": k } as React.CSSProperties} />
        ))}
        <div className="lu-floor">
          {STEPS.map(([x, y], i) => (
            <i key={i} style={{ left: `${x}%`, top: `${y}%`, scale: 0.6 + (y / 100) * 0.9 } as React.CSSProperties} />
          ))}
        </div>
        <div className="lu-spill" />
        <div className="lu-door" data-door>
          <div className="lu-day" />
          <div className="lu-leaf" />
          <p className="lu-exit">Exit</p>
        </div>
        <div className="lu-flood" />
        <div className="lu-grain" />
      </div>
    </section>
  );
}
