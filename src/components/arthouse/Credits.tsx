import { ARTHOUSE as A, fmt } from "@/data/figures";

/**
 * How it works, laid out like a film's end credits (a plain label, then the
 * fact), rolling by as you scroll. The test results sit in the middle, each
 * with what it beat. Plain words only: no film-industry jargon.
 * Every figure is from figures.ts (the 2026-10-22 evaluation).
 */
export default function Credits({ live, source, builtWith }: { live: string; source: string; builtWith: string }) {
  const roles: [string, React.ReactNode][] = [
    ["Films", `${fmt(A.films)} art films, 1915 to 2025`],
    ["Directors · Movements", `${A.directors} · ${A.movements}`],
    ["The canon", `${A.lists} critics’ and festival lists in ${A.canonFamilies} families, ${fmt(A.canonCitations)} citations`],
    ["Recommender", "EASE (Steck, 2019), λ = 100, 50 neighbours a film"],
    ["Trained on", `MovieLens: ${fmt(A.ratings)} ratings by ${fmt(A.people)} people`],
    ["Tested on", `${fmt(A.testPeople)} people it never saw. The test was locked before it ran.`],
  ];
  const board: { what: string; big: string; pct: number; beat: string }[] = [
    { what: "found a film they went on to love in its 10 picks", big: "2 in 3", pct: A.laterLove, beat: `old engine ${A.oldLaterLove}% · most popular ${A.popLaterLove}%` },
    { what: "found the exact next film they loved", big: "1 in 3", pct: A.hitRate, beat: `random ${A.randomHitRate}% · old engine ${A.oldHitRate}% · most popular ${A.popHitRate}%` },
    { what: "Recall@20, the published test", big: `${A.recall20}%`, pct: A.recall20, beat: `most popular ${A.popRecall20}%` },
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
      <dl className="ah-roles">
        <div>
          <dt>Built with</dt>
          <dd>{builtWith}</dd>
        </div>
      </dl>
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
