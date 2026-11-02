import Image from "next/image";
import { NAME, STUDY, TOOLKIT } from "@/data/site";
import { HostSaid, Lane } from "./HostSaid";

/** The real person behind the character: photo, what he cares about, tools. */
export default function About() {
  return (
    <section id="about" className="pg-about" aria-labelledby="about-title">
      <div className="pg-wrap">
        <Lane spot="about">
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
        </Lane>
      </div>
    </section>
  );
}
