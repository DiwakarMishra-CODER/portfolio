import { serif, label } from "./fonts";
import "./lightsdown.css";

// The last of Starweave's stars, where they go out one by one.
const STARS = [
  [8, 14], [17, 31], [26, 9], [34, 24], [43, 12], [51, 33], [59, 7], [66, 22], [74, 13], [81, 29], [89, 10], [94, 25], [12, 40], [70, 38],
];

/**
 * Between Starweave and Arthouse Atlas, the lights go down. Starweave's last
 * stars go out like house lights; the host walks down to a vintage film
 * projector (3D, from his engine) carrying the reel, and loads it (HostLayer's
 * walk-in). As you scroll he cranks it, the
 * reels turn, the lamp comes on, and the beam (drawn by HostLayer from the
 * projector's real lens to the screen) lights the screen, where the title
 * flickers on like an old print. A sticky stage for about a screen of
 * scrolling; scroll-driven CSS for the light and the title. Outside that
 * support, or with reduced motion: the lit screen with its title.
 */
export default function LightsDown() {
  return (
    <section className={`ld ${serif.variable} ${label.variable}`} aria-label="The lights go down for Arthouse Atlas">
      <div className="ld-stage" data-host-lane>
        <div className="ld-stars" aria-hidden="true">
          {STARS.map(([x, y], k) => (
            <i key={k} style={{ left: `${x}%`, top: `${y}%`, "--a": `${4 + k * 4}%` } as React.CSSProperties} />
          ))}
        </div>
        <div className="ld-beam" aria-hidden="true">
          <div className="ld-dust" />
        </div>
        <div className="ld-screen">
          <div className="ld-light" aria-hidden="true" />
          <div className="ld-grain" aria-hidden="true" />
          {/* The flash when he's swept into the screen. */}
          <div className="ld-flash" aria-hidden="true" />
          <div className="ld-title">
            <p>Diwakar Mishra presents</p>
            <p className="ld-title-name">Arthouse Atlas</p>
          </div>
        </div>
        {/* He stands here at the projector. While he's at it his engine draws
            both; otherwise the still of it stands here (rendered by the same
            engine, same framing): empty until he brings the reel. */}
        <p className="host-bubble ld-bubble" aria-live="polite" />
        <div className="pg-spot ld-spot" data-host-spot="lightsdown" data-size="projector" data-host-stop aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="host-poster ld-prop" src="/host/projector-empty.webp" alt="" width={880} height={734} />
        </div>
      </div>
    </section>
  );
}
