import { ARTHOUSE as A, fmt } from "@/data/figures";

/**
 * How it works, laid out like a film's end credits (a plain label, then the
 * fact), rolling by as you scroll. The test results sit in the middle, each
 * with what it beat. Plain words only: no film-industry jargon.
 * Every figure is from figures.ts (the 2026-10-22 evaluation).
 */
export default function Credits({ live, source }: { live: string; source: string }) {
  const roles: [string, React.ReactNode][] = [
    ["Films", `${fmt(A.films)} art films, 1915 to 2025`],
    ["Directors · Movements", `${A.directors} · ${A.movements}`],
    ["The canon", `Ranked by ${A.lists} lists from critics, filmmakers and festivals: ${fmt(A.canonCitations)} mentions in all`],
    [
      "Recommender",
      <>
        Learns which films the same people love
        <small>EASE (Steck, 2019) · λ = 100 · 50 neighbours a film</small>
      </>,
    ],
    ["Trained on", `MovieLens: ${fmt(A.ratings)} ratings by ${fmt(A.people)} people`],
    ["Tested on", `${fmt(A.testPeople)} people it never saw. The test was written down before it ran, so it couldn’t be tuned to pass.`],
  ];
  const board: { what: string; big: string; pct: number; beat: string }[] = [
    { what: "found a film they went on to love in its 10 picks", big: "2 in 3", pct: A.laterLove, beat: `the site’s first engine ${A.oldLaterLove}% · just the most popular films ${A.popLaterLove}%` },
    { what: "found the exact next film they loved", big: "1 in 3", pct: A.hitRate, beat: `random picks ${A.randomHitRate}% · first engine ${A.oldHitRate}% · just the most popular films ${A.popHitRate}%` },
    { what: "of the films people went on to love were in its top 20 picks", big: `${A.recall20}%`, pct: A.recall20, beat: `just the most popular films ${A.popRecall20}% · “Recall@20”, the standard research measure` },
  ];
  return (
    <div className="ah-credits" data-part="Arthouse · end credits">
      <p className="ah-credits-open">How it works</p>
      <p className="ah-credits-title">What’s inside, and how well it works</p>
      <dl className="ah-roles">
        {roles.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="ah-board">
        <p className="ah-board-k">How well it works · tested on {fmt(A.testPeople)} people</p>
        {board.map((r) => (
          <div key={r.what} className="ah-board-row">
            <p className="ah-board-big">
              {r.big}
              {r.big.endsWith("%") ? null : <small>{r.pct}%</small>}
            </p>
            <p className="ah-board-what">
              {r.what}
              <span>{r.beat}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="ah-credits-links">
        <a href={live} target="_blank" rel="noreferrer">
          Open Arthouse Atlas ↗
        </a>
        <a href={source} target="_blank" rel="noreferrer">
          Read the code ↗
        </a>
        <a href={`${source}/blob/main/backend/data/recs/EVALUATION.md`} target="_blank" rel="noreferrer">
          Read the evaluation ↗
        </a>
      </p>
    </div>
  );
}
