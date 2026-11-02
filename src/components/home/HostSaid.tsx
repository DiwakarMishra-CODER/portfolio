import { STORY, type Spot } from "@/data/host-lines";

/**
 * What the host says in a section, printed as part of the page: a speech
 * bubble whose tail points at his spot. Real text, so it reads with JS off,
 * for crawlers, and for anyone who never notices the character.
 */
export function HostSaid({ spot, tail = "right" }: { spot: Spot; tail?: "right" | "down" }) {
  return (
    <figure className="pg-said" data-host-said={spot} data-tail={tail} aria-label="Diwakar says">
      <blockquote>
        {STORY[spot].map((line) => (
          <p key={line}>{line}</p>
        ))}
      </blockquote>
      {/* Where his quick reactions appear while you play with him (then the line above comes back). */}
      <span className="host-quip" aria-hidden="true" />
    </figure>
  );
}

/** Where the host stands in a section. Empty space the layout reserves, so
 *  he can never sit on text; HostLayer reads these to place him. With `host`,
 *  he's here from the start: a still (the poster) and something to poke. */
export function HostSpot({ spot, size = "lane", host = false }: { spot: Spot; size?: "hero" | "lane"; host?: boolean }) {
  if (!host) return <div className="pg-spot" data-host-spot={spot} data-size={size} aria-hidden="true" />;
  return (
    <div className="pg-spot" data-host-spot={spot} data-size={size} data-host-stop>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="host-poster" src="/host/poster.webp" alt="" width={340} height={420} />
      <button type="button" className="host-hit" aria-label="Poke the pixel version of Diwakar" />
    </div>
  );
}

/** A section's content beside the host's lane (desktop) or alone (narrower). */
export function Lane({ spot, children }: { spot: Spot; children: React.ReactNode }) {
  return (
    <div className="pg-lane">
      <div className="pg-lane-main">{children}</div>
      <div className="pg-lane-side">
        <HostSpot spot={spot} />
      </div>
    </div>
  );
}
