import { AVAILABLE, NAME, PROJECTS, RESUME, STATS } from "@/data/site";
import { HERO_LINE } from "@/data/copy";
import { HostSaid, HostSpot } from "./HostSaid";

/**
 * The first screen: who, what he wants, what he builds, what he's shipped,
 * in about 25 words. Everything else waits below; the host stands at right.
 * His record stands on the floor in front: three plaques, like a stage's.
 */
export default function Hero() {
  return (
    <header className="pg-hero" data-hero id="top">
      <div className="pg-glow pg-glow-dawn" aria-hidden="true" />
      {/* The floor he stands on: the page's grain, laid flat and running away to a horizon. */}
      <div className="pg-floor" aria-hidden="true" />
      <nav className="pg-wrap pg-topline" aria-label="Main">
        <a href="#top" className="pg-mark">
          {NAME}
        </a>
        <ul>
          <li>
            <a href="#work">Work</a>
          </li>
          <li>
            <a href="#about">About</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
        </ul>
      </nav>

      <div className="pg-wrap pg-hero-grid">
        <div className="pg-hero-text">
          <p className="pg-pill">
            <span aria-hidden="true" />
            {AVAILABLE}
          </p>
          <h1>{NAME}</h1>
          <p className="pg-hero-line">{HERO_LINE}</p>
          <p className="pg-actions">
            <a className="pg-btn pg-btn-solid" href="#work">
              See my work
            </a>
            <a className="pg-btn" href={RESUME} target="_blank" rel="noreferrer">
              Résumé
            </a>
          </p>
          {/* Proof, not another button: the two buttons above are the only asks. */}
          <p className="pg-shipped">
            Shipped: <span>{PROJECTS.map((p) => p.name).join(", ")}</span>
          </p>
        </div>
        <div className="pg-hero-host">
          <HostSaid spot="hero" tail="down" />
          <HostSpot spot="hero" size="hero" host />
          <button type="button" className="host-sound" data-host-sound aria-pressed="false">
            <span aria-hidden="true" />
            Sound off
          </button>
        </div>
      </div>

      <ul className="pg-wrap pg-plaques" aria-label="Record">
        {STATS.map((s) => {
          const body = (
            <>
              <span className="pg-plaque-k">{s.label}</span>
              <span className="pg-plaque-v">
                {s.value}
                {s.unit && <small>{s.unit}</small>}
                {s.href && <i aria-hidden="true">↗</i>}
              </span>
              <span className="pg-plaque-n">{s.note}</span>
            </>
          );
          return (
            <li key={s.label} className="pg-plaque">
              {s.href ? (
                <a href={s.href} target="_blank" rel="noreferrer">
                  {body}
                </a>
              ) : (
                <div>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </header>
  );
}
