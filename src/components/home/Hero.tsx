import { AVAILABLE, NAME, PROJECTS, RESUME, STATS } from "@/data/site";
import { HERO_LINE } from "@/data/copy";
import { HostSaid, HostSpot } from "./HostSaid";

/**
 * The first screen: who, what he wants, what he builds, what he's shipped,
 * in about 25 words. Everything else waits below; the host stands at right.
 * His record stands on the floor in front: three plaques, like a stage's.
 */
/** LeetCode's Knight title (contest rating 1850+), as an enamel badge: a
 *  green shield with a gold rim and a chess knight, and its name in gold.
 *  Drawn here (not LeetCode's artwork). */
function KnightBadge() {
  return (
    <span className="pg-knight">
      <svg viewBox="0 0 28 32" aria-hidden="true">
        <defs>
          <linearGradient id="kn-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7dc8a" />
            <stop offset="0.55" stopColor="#c99a3c" />
            <stop offset="1" stopColor="#8f6420" />
          </linearGradient>
          <linearGradient id="kn-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2f8a5f" />
            <stop offset="1" stopColor="#14533a" />
          </linearGradient>
        </defs>
        <path d="M14 1 L26 5 V15 C26 23 20.5 28.5 14 31 C7.5 28.5 2 23 2 15 V5 Z" fill="url(#kn-rim)" />
        <path d="M14 3.6 L23.6 6.8 V15 C23.6 21.6 19.3 26.2 14 28.4 C8.7 26.2 4.4 21.6 4.4 15 V6.8 Z" fill="url(#kn-face)" />
        {/* The knight: a horse's head on a plinth. */}
        <path
          d="M9.2 23.6 H18.8 V22 H17.4 V16.6 C17.4 12.2 15.4 9.2 12.6 8.6 L11.8 7 L10.9 8.9 C10.1 9.4 9.4 10.2 9 11.2 L8.1 13.4 C7.8 14.2 8.4 15 9.2 14.8 L11.2 14.2 C11.6 14.1 12 14.4 11.9 14.8 L10.6 17.4 C10.3 18 10.1 18.7 10.1 19.4 V22 H9.2 Z"
          fill="#fdf6e3"
        />
        <circle cx="11.6" cy="11.1" r="0.75" fill="#14533a" />
      </svg>
      <span>Knight</span>
    </span>
  );
}

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
            Shipped:{" "}
            {PROJECTS.map((p, k) => (
              <span key={p.id}>
                {k > 0 && " and "}
                <a href={`#${p.id}`}>{p.name}</a>, a {p.short}
              </span>
            ))}
            .
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
                {s.unit === "Knight" ? <KnightBadge /> : s.unit && <small>{s.unit}</small>}
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
