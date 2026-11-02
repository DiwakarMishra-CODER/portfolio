"use client";

// "How it works", as the back of Starweave's record sleeve: the track list
// is always on show (each track one plain line about the inside), and each
// track opens its liner notes in place: where the proof comes from, the route
// finder (Starweave's real search, live), and the tests that guard it.
import { useState } from "react";
import StarweaveMachine from "@/components/work/StarweaveMachine";
import { STARWEAVE as S, fmt } from "@/data/figures";

type Track = "proof" | "route" | "tests";

export default function HowItWorks({ source, tests, builtWith }: { source: string; tests: { cases: number; files: number }; builtWith: string }) {
  const [open, setOpen] = useState<Track | null>(null);
  const critic = S.links - S.firstPerson - S.reported;

  const tracks: { id: Track; title: string; verb: string; notes: React.ReactNode }[] = [
    {
      id: "proof",
      title: `${fmt(S.links)} links, every one with a source`,
      verb: "Read",
      notes: (
        <>
          <p>No link goes on the map without a quote and where it came from. The quote says how strong the proof is:</p>
          <div className="hiw-bar" role="img" aria-label={`${S.firstPerson} in the artist's own words, ${S.reported} reported by a publication, ${critic} a critic's comparison`}>
            <span style={{ flex: S.firstPerson }} />
            <span style={{ flex: S.reported }} />
            <span style={{ flex: critic }} />
          </div>
          <dl className="hiw-legend">
            <div>
              <dt>{fmt(S.firstPerson)}</dt>
              <dd>in the artist’s own words</dd>
            </div>
            <div>
              <dt>{S.reported}</dt>
              <dd>reported by a publication</dd>
            </div>
            <div>
              <dt>{critic}</dt>
              <dd>a critic’s comparison</dd>
            </div>
          </dl>
          <p>
            From {S.sites} different websites and 10 print sources. {S.denials} times an artist denied an influence: those links are never drawn.
          </p>
        </>
      ),
    },
    {
      id: "route",
      title: "Connect any two artists by the strongest proof",
      verb: "Play",
      notes: (
        <>
          <p>Starweave’s own route finder, running here on its real map. Weaker proof costs more, so it walks around a secondhand claim to keep every step in the artists’ own words.</p>
          <div className="machine-sheet" data-machine="starweave">
            <StarweaveMachine />
          </div>
        </>
      ),
    },
    {
      id: "tests",
      title: `${tests.cases} tests run every time the code changes`,
      verb: "Read",
      notes: (
        <>
          <p>
            {tests.cases} checks in {tests.files} files run on every change, before the site rebuilds. A few of them:
          </p>
          <ul className="hiw-checks">
            <li>A link that points at an artist who isn’t on the map stops the build.</li>
            <li>The route finder never loops, and still connects two artists when the influence ran the other way.</li>
            <li>Influence scores only count real influence links, so the most-cited artists come out on top.</li>
          </ul>
          <a className="hiw-more" href={`${source}/tree/main/tests`} target="_blank" rel="noreferrer">
            Read the tests ↗
          </a>
        </>
      ),
    },
  ];

  return (
    <div className="hiw" data-part="Starweave · how it works">
      <header className="hiw-head">
        <h3>How it works</h3>
        <span>Side B</span>
      </header>
      <ol className="hiw-tracks">
        {tracks.map((t, k) => (
          <li key={t.id} className={open === t.id ? "is-open" : undefined}>
            <button type="button" className="hiw-track" aria-expanded={open === t.id} aria-controls={`hiw-${t.id}`} onClick={() => {
                const opening = open !== t.id;
                setOpen(opening ? t.id : null);
                if (opening && t.id === "route") window.dispatchEvent(new CustomEvent("host:react", { detail: { kind: "route" } }));
              }}>
              <span className="hiw-no">B{k + 1}</span>
              <span className="hiw-title">{t.title}</span>
              <span className="hiw-dots" aria-hidden="true" />
              <span className="hiw-verb">
                {open === t.id ? "Close" : t.verb} <span aria-hidden="true">{open === t.id ? "▴" : "▸"}</span>
              </span>
            </button>
            {open === t.id && (
              <div id={`hiw-${t.id}`} className="hiw-notes">
                {t.notes}
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="hiw-credits">Built with {builtWith}.</p>
    </div>
  );
}
