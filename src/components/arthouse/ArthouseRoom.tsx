import data from "../../../public/data/arthouse.json";
import type { ArthouseData } from "@/lib/machines/arthouse";
import { PROJECTS } from "@/data/site";
import { ARTHOUSE as A, fmt } from "@/data/figures";
import { HostSaid } from "@/components/home/HostSaid";
import { serif, label } from "./fonts";
import DoubleBill, { type ShelfFilm } from "./DoubleBill";
import Credits from "./Credits";
import { ProductShot } from "@/components/rooms/ProductShot";
import "@/components/rooms/rooms.css";
import "./arthouse.css";

const d = data as unknown as ArthouseData;
const p = PROJECTS.find((x) => x.id === "arthouse")!;

/**
 * Arthouse Atlas's room, in the site's own language: projected black, a
 * warm projector white, one gold for what you press. One line says what it
 * is and one says how well it works; then you try it (tap a film you love,
 * get the one to watch next, and see the real people behind it); then how
 * it works, laid out like end credits. The host stands in his column and holds up the
 * ticket.
 */
export default function ArthouseRoom({ n }: { n: number }) {
  const shelf: ShelfFilm[] = d.shelf.map((id) => {
    const [title, year, , still] = d.films[id];
    return { id, title, year, still };
  });
  return (
    <section id="arthouse" className={`ah-room ${serif.variable} ${label.variable}`} aria-labelledby="arthouse-title" data-host-dark>
      <div className="pg-wrap room-grid">
        <div className="ah-main">
          <p className="ah-kicker">
            Project {n}, {p.year}
          </p>
          <h2 id="arthouse-title">{p.name}</h2>
          {/* The front: what it is, the real site being used, where to open it. */}
          <p className="ah-line">{p.line} Tell it a film you loved; it picks your next.</p>
          <p className="room-spec">
            {fmt(A.films)} films, ranked by {A.lists} critics’ lists · {p.parts.find((x) => x.k === "Built with")?.v}
          </p>
          <p className="room-actions">
            <a href={p.live} target="_blank" rel="noreferrer">
              Open Arthouse Atlas ↗
            </a>
            <a href={p.source} target="_blank" rel="noreferrer">
              Read the code ↗
            </a>
          </p>
          <ProductShot id="arthouse" url={p.live} {...p.footage} />
          <p className="ah-proof">
            For <b>2 in 3</b> people, a film they went on to love was in its 10 picks.
            <span>
              Tested on {fmt(A.testPeople)} people it never saw ({A.laterLove}%, against {A.oldLaterLove}% for the old engine).
            </span>
          </p>
          <div className="ah-said">
            <HostSaid spot="arthouse" />
            <div className="pg-spot ah-spot-inline" data-host-spot="arthouse" data-size="inline" data-host-stop aria-hidden="true" />
          </div>

          {/* Then the inside: the same model, in your hands. */}
          <div className="room-try">
            <h3>Try it here</h3>
            <p>The live site’s own recommender, running in this page on its real data.</p>
          </div>
          <div data-host-cue="arthouse:strip">
            <DoubleBill shelf={shelf} live={p.live} />
          </div>

          <div data-host-cue="arthouse:credits">
            <Credits live={p.live} source={p.source} builtWith={p.parts.find((x) => x.k === "Built with")?.v ?? ""} />
          </div>
        </div>

        <aside className="room-lane" data-host-lane aria-label="What Diwakar says">
          <div className="room-lane-inner">
            <div className="room-slot" data-held-slot />
            <div className="room-host-row">
              <p className="host-bubble" aria-live="polite" />
              <div className="pg-spot" data-host-spot="arthouse" data-size="lane" data-host-stop />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
