import { EMAIL, GITHUB, LEETCODE, LINKEDIN, LOOKING, NAME, RESUME } from "@/data/site";
import { HostSaid } from "./HostSaid";
import { CopyEmail } from "./CopyEmail";
import "@/components/rooms/rooms.css";

// Set at build time in next.config.ts: the commit this page was built from.
const REV = process.env.NEXT_PUBLIC_REV || "local";
const BUILT = process.env.NEXT_PUBLIC_BUILT || "";

/** The end of the tour: the email first (mail it or copy it), the résumé
 *  second, quiet links. On wide screens he walks down into his column here
 *  and holds up his card; at the very bottom he waves you off. */
export default function Contact() {
  const [local, domain] = EMAIL.split("@");
  return (
    <footer id="contact" className="pg-contact" data-host-dark>
      {/* Sunset: the tour began at dawn on the first screen. A dithered sky,
          the sun going down behind him, a few clouds lit from below. */}
      <div className="ct-sky">
      <div className="ct-sun" aria-hidden="true" />
      <i className="ct-cloud ct-cloud-a" aria-hidden="true" />
      <i className="ct-cloud ct-cloud-b" aria-hidden="true" />
      <i className="ct-cloud ct-cloud-c" aria-hidden="true" />
      <div className="pg-wrap room-grid">
        <div className="pg-contact-main">
          <HostSaid spot="contact" />
          <h2>{LOOKING.ask}</h2>
          <p className="pg-contact-sub">{LOOKING.detail}</p>
          <a className="pg-email" href={`mailto:${EMAIL}`}>
            {local}
            <wbr />@{domain}
          </a>
          <p className="pg-actions">
            <a className="pg-btn pg-btn-light" href={`mailto:${EMAIL}`}>
              Email me
            </a>
            <a className="pg-btn pg-btn-ghost" href={RESUME} target="_blank" rel="noreferrer">
              Résumé
            </a>
          </p>
        </div>

        <aside className="room-lane contact-lane" data-host-lane aria-label="What Diwakar says">
          <div className="room-lane-inner">
            <div className="room-slot" data-held-slot>
              {/* His card, held up beside his head (shown once he's here). */}
              <div className="ct-card" data-held>
                <p className="ct-name">
                  <svg className="ct-mark" viewBox="0 0 64 64" aria-hidden="true">
                    <circle cx="32" cy="32" r="14" fill="none" stroke="#FF4F00" strokeWidth="4.5" />
                    <path d="M32 8v48M8 32h48" stroke="#FF4F00" strokeWidth="4.5" strokeLinecap="square" />
                  </svg>
                  {NAME}
                </p>
                <p className="ct-role">Software engineer · open to internships</p>
                <CopyEmail email={EMAIL} className="ct-email">
                  {EMAIL}
                </CopyEmail>
                <p className="ct-hint">Tap the email to copy it</p>
              </div>
            </div>
            <div className="room-host-row">
              <p className="host-bubble" aria-live="polite" />
              <div className="pg-spot" data-host-spot="contact" data-size="lane" data-host-stop />
            </div>
          </div>
        </aside>
      </div>
      </div>
      <div className="ct-ground">
      <div className="pg-wrap">
        <div className="pg-foot">
          <p>
            <a href={GITHUB} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={LINKEDIN} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href={LEETCODE} target="_blank" rel="noreferrer">
              LeetCode
            </a>
          </p>
          <p>
            © {BUILT.slice(0, 4) || "2026"} {NAME}, Delhi · build {REV}
          </p>
        </div>
      </div>
      </div>
    </footer>
  );
}
