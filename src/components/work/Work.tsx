import Teardown from "./Teardown";
import StarweaveMachine from "./StarweaveMachine";
import ArthouseMachine from "./ArthouseMachine";
import { ARTHOUSE as A, STARWEAVE as S, fmt } from "@/data/figures";

// Every figure here is the canonical one in CLAUDE.md (Starweave's
// 2026-10-26 source pass, Arthouse's 2026-10-22 evaluation). The Test bench
// re-checks the Starweave counts live against the shipped data.
export default function Work() {
  return (
    <section id="work" className="film-surface relative px-[var(--gutter)] pb-32 pt-28" aria-labelledby="work-title">
      <div className="mx-auto max-w-[1312px]">
        <p className="type-label text-graphite">
          <span className="text-signal-ink">Work</span>&nbsp; Two products, taken apart
        </p>
        <h2 id="work-title" className="mt-5 max-w-[16ch] text-[clamp(30px,3.6vw,54px)] font-[750] leading-[1.02] [font-variation-settings:'wdth'_112]">
          Both are live sites. Scroll, and each cover lifts off.
        </h2>
        <p className="mt-5 max-w-[46ch] text-[clamp(16px,1.3vw,19px)] leading-snug text-graphite">
          Underneath, the real algorithm runs on the real data. Try it.
        </p>

        <div className="mt-24 space-y-36">
          <Teardown
            id="starweave"
            n="01"
            name="Starweave"
            year="2026"
            line="An influence map of indie music. Every link has a source."
            live="https://starweaves.vercel.app/"
            source="https://github.com/DiwakarMishra-CODER/starweave"
            cover={{ src: "/work/starweave-map.png", alt: "Starweave's live map: 296 artists as points of light, grouped by scene, with today's record and the pocket player" }}
            machineTitle="Connect two artists"
            machineNote="The route finder from the live site, on its real map. Weaker evidence costs more, so it walks around a secondhand claim."
            facts={[
              { value: fmt(S.artists), label: "artists" },
              { value: fmt(S.links), label: "influence links" },
              { value: fmt(S.sourced), label: "with a named source" },
              { value: fmt(S.firstPerson), label: "in the artist's own words" },
              { value: fmt(S.sites), label: "source sites" },
              { value: fmt(S.denials), label: "denials on record" },
            ]}
            sources="Every link says where the claim came from: an interview, a feature, a page in a book. A script re-opens each source to check the sentence is still there. Denials are kept too, so a myth can't sneak back in."
            parts={[
              { k: "Built with", v: "Next.js 16, React 19, TypeScript, Canvas, Web Audio" },
              { k: "Inside", v: "Weighted route search (Dijkstra), map layout solved at build time, genre roads by heavy-path decomposition" },
              { k: "Checks", v: "A source ledger the build refuses to ship if it doesn't match the map" },
              { k: "Tests", v: "173 cases in 22 files, run on every push" },
            ]}
          >
            <StarweaveMachine />
          </Teardown>

          <Teardown
            id="arthouse"
            n="02"
            name="Arthouse Atlas"
            year="2026"
            line="A film recommender for people new to arthouse cinema."
            live="https://arthouse-atlas.vercel.app/"
            source="https://github.com/DiwakarMishra-CODER/Arthouse-Atlas"
            cover={{ src: "/work/arthouse-persona.jpg", alt: "Arthouse Atlas playing the opening titles of Bergman's Persona over the film's own frames" }}
            machineTitle="Pick three films"
            machineNote="The live site's own recommender. Each film you pick votes for the films its fans loved, learned from 32 million ratings."
            facts={[
              { value: fmt(A.films), label: "films" },
              { value: fmt(A.directors), label: "directors" },
              { value: fmt(A.movements), label: "movements" },
              { value: fmt(A.lists), label: "critics' and festival lists" },
              { value: fmt(A.ratings), label: "ratings it learned from" },
              { value: `${A.hitRate}%`, label: `found their next favourite in its top 10 (old engine: ${A.oldHitRate}%)` },
            ]}
            sources="The recommender learns from MovieLens: 32,000,204 ratings by 200,948 people. It was tested on 11,090 people it never saw, and the test was fixed before it ran."
            parts={[
              { k: "Built with", v: "React 19, Vite, Node and Express, MongoDB, Framer Motion, D3" },
              { k: "Inside", v: "EASE recommender (λ = 100), a canon score across 20 lists, a daily film that never repeats a decade, country or director within four days" },
              { k: "Tests", v: "96 backend and 11 frontend cases" },
              { k: "Runs on", v: "Vercel, Render and MongoDB Atlas" },
            ]}
          >
            <ArthouseMachine />
          </Teardown>
        </div>
      </div>
    </section>
  );
}
