import Image from "next/image";
import { NAME, STUDY, TOOLKIT } from "@/data/site";
import { HostSaid } from "./HostSaid";
import "@/components/rooms/rooms.css";

/** The real person behind the character: photo, what he cares about, tools.
 *  On wide screens he stands in his own column beside it (he walks in here
 *  out of the cinema), his bubble at his side like in the rooms. */
export default function About() {
  return (
    <section id="about" className="pg-about" aria-labelledby="about-title">
      {/* Daylight, out of the cinema: sun through a window across the sand,
          and the floor he stands on. */}
      <div className="ab-light" aria-hidden="true" />
      <div className="ab-glow" aria-hidden="true" />
      <div className="pg-floor ab-floor" aria-hidden="true" />
      <div className="pg-wrap room-grid">
        <div className="pg-about-grid">
          <div className="pg-photo">
            <Image src="/diwakar-mishra-cutout.png" alt={NAME} width={462} height={442} sizes="(min-width: 900px) 360px, 70vw" />
          </div>
          <div>
            <HostSaid spot="about" />
            <h2 id="about-title">I pick problems that need more than a database.</h2>
            <p className="pg-about-text">
              {STUDY} Both projects come down to a scoring system: how much a source is worth, how much a film you loved is worth. Both show
              their working.
            </p>
            <h3 className="pg-small-head">Works in</h3>
            <ul className="pg-toolkit">
              {TOOLKIT.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="room-lane about-lane" data-host-lane aria-label="What Diwakar says">
          <div className="room-host-row">
            <p className="host-bubble" aria-live="polite" />
            <div className="pg-spot" data-host-spot="about" data-size="lane" data-host-stop />
          </div>
        </aside>
      </div>
    </section>
  );
}
