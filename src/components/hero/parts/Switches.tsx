import { LANDSCAPE as L } from "../board/spec";
import { PORTRAIT as P } from "../board/spec-phone";
import { place } from "./place";
import { T, at } from "../timeline";

/** The nav, as 6 mm tactile switches — real links, pressed down on click. */
export default function Switches() {
  return (
    <nav aria-label="Main">
      {L.SWITCHES.map((s, i) => {
        const q = P.SWITCHES[i];
        const external = s.href.endsWith(".pdf");
        return (
          <a
            key={s.ref}
            href={s.href}
            className="part elev sw drop"
            style={place({ x: s.x, y: s.y, w: L.SW_SIZE, h: L.SW_SIZE }, { x: q.x, y: q.y, w: P.SW_SIZE, h: P.SW_SIZE }, { "--hgt": 4, "--hint-i": i, ...at(T.switches + i * 45) })}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
            data-part={`${s.ref} · ${s.label}`}
          >
            <span className="sw-body" aria-hidden="true" />
            <span className="sw-cap" aria-hidden="true" />
            <span className="sw-label hb-caption">
              {s.label}
              <svg className="sw-arrow" viewBox="0 0 12 12" aria-hidden="true">
                {external ? <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" /> : <path d="M6 2.5v7M3 6.5l3 3 3-3" />}
              </svg>
            </span>
          </a>
        );
      })}
    </nav>
  );
}
