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
          {/* The two asks, made to be pressed: the email in signal orange with
              the sun's warmth behind it (its envelope opens on hover), the
              resume in cream (its page lifts). */}
          <p className="pg-actions ct-asks">
            <a className="ct-ask ct-ask-mail" href={`mailto:${EMAIL}`}>
              <svg viewBox="0 0 28 22" aria-hidden="true">
                <rect x="1.5" y="3.5" width="25" height="17" rx="2.5" fill="#fff7ee" stroke="currentColor" strokeWidth="2" />
                <path d="M3 18.5 L11.5 11 M25 18.5 L16.5 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path className="ct-flap" d="M2.5 5 L14 13.2 L25.5 5" fill="#fff7ee" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              Email me
            </a>
            <a className="ct-ask ct-ask-cv" href={RESUME} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 22 26" aria-hidden="true">
                <path className="ct-page" d="M3 1.5 H14 L19.5 7 V24.5 H3 Z" fill="#fff" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M14 1.5 V7 H19.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M6.5 12 H15.5 M6.5 15.5 H15.5 M6.5 19 H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Resume
              <span className="ct-go" aria-hidden="true">
                ↗
              </span>
            </a>
          </p>
        </div>

        <aside className="room-lane contact-lane" data-host-lane aria-label="What Diwakar says">
          <div className="room-lane-inner">
            <div className="room-slot" data-held-slot>
              {/* His card, held up beside his head (shown once he's here). */}
              <div className="ct-card" data-held>
                <p className="ct-name">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="ct-mark" src="/icon.svg" alt="" width={22} height={22} />
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
