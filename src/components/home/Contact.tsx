import { AVAILABLE, EMAIL, GITHUB, LEETCODE, LINKEDIN, NAME, RESUME } from "@/data/site";
import { HostSaid, Lane } from "./HostSaid";

// Set at build time in next.config.ts: the commit this page was built from.
const REV = process.env.NEXT_PUBLIC_REV || "local";
const BUILT = process.env.NEXT_PUBLIC_BUILT || "";

/** The end of the tour: the email first, the résumé second, quiet links. */
export default function Contact() {
  const [local, domain] = EMAIL.split("@");
  return (
    <footer id="contact" className="pg-contact">
      <div className="pg-wrap">
        <Lane spot="contact">
          <HostSaid spot="contact" />
          <h2>{AVAILABLE}.</h2>
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
        </Lane>
      </div>
    </footer>
  );
}
