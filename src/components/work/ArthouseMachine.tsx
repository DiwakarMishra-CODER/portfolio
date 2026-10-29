"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInViewOnce } from "@/lib/useInViewOnce";
import { rankCandidates, stillUrl, type ArthouseData, type Ranked } from "@/lib/machines/arthouse";

// The machine runs on arrival with three picks a stranger would recognise.
const FIRST_PICKS = ["The Godfather", "Spirited Away", "In the Mood for Love"];
const SHOW = 6;
// Each film's votes land in turn: film one's parts, then two's, then three's.
const VOTE_STAGGER = 380;
const ROW_STAGGER = 45;

type Run = { picks: number[]; ranked: Ranked[]; ms: number; scored: number; run: number };

export default function ArthouseMachine() {
  const rootRef = useRef<HTMLDivElement>(null);
  const near = useInViewOnce(rootRef, { rootMargin: "900px 0px" });
  const arrived = useInViewOnce(rootRef, { threshold: 0.35 });
  const [data, setData] = useState<ArthouseData | null>(null);
  const [failed, setFailed] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [result, setResult] = useState<Run | null>(null);
  const runCount = useRef(0);

  useEffect(() => {
    if (!near || data) return;
    fetch("/data/arthouse.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setFailed(true));
  }, [near, data]);

  const score = useCallback(
    (next: number[]) => {
      if (!data || next.length < 3) {
        setResult(null);
        return;
      }
      const REPS = 60;
      let ranked = rankCandidates(data, next, SHOW);
      const t0 = performance.now();
      for (let i = 0; i < REPS; i++) ranked = rankCandidates(data, next, SHOW);
      const ms = (performance.now() - t0) / REPS;
      const scored = new Set(next.flatMap((id) => data.neighbours[id].map(([n]) => n)).filter((n) => !next.includes(n))).size;
      runCount.current += 1;
      setResult({ picks: next, ranked, ms, scored, run: runCount.current });
    },
    [data]
  );

  useEffect(() => {
    if (!arrived || !data || runCount.current > 0) return;
    const first = FIRST_PICKS.map((t) => data.shelf.find((id) => data.films[id][0] === t)).filter((x): x is number => x != null);
    setPicks(first);
    score(first);
  }, [arrived, data, score]);

  const toggle = (id: number) => {
    const has = picks.includes(id);
    // A fourth pick replaces the oldest, so the machine is never stuck "full".
    const next = has ? picks.filter((p) => p !== id) : [...picks, id].slice(-3);
    setPicks(next);
    score(next);
  };

  const top = result?.ranked[0];
  const max = result?.ranked[0]?.score ?? 1;
  const reason = useMemo(() => {
    if (!data || !top) return null;
    const seed = top.because;
    const both = data.both[seed]?.[top.tmdbId];
    const loved = data.loved[seed];
    if (!both || !loved) return null;
    return { seed: data.films[seed][0], both, loved };
  }, [data, top]);

  return (
    <div ref={rootRef} className="grid grid-cols-12 gap-x-[clamp(12px,1.7vw,24px)]">
      {/* The shelf */}
      <div className="relative col-span-12 border-hairline p-[clamp(14px,1.8vw,24px)] min-[1000px]:col-span-7 min-[1000px]:border-r" data-part="Shelf · 18 films">
        <p className="type-label text-graphite">
          Pick three films you love · <span className="text-ink">{picks.length}/3</span>
        </p>
        {data ? (
          <ul className="mt-4 grid grid-cols-3 gap-2.5 min-[560px]:grid-cols-4 min-[1000px]:grid-cols-6">
            {data.shelf.map((id) => {
              const [title, year] = data.films[id];
              const k = picks.indexOf(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-pressed={k >= 0}
                    className="group block w-full text-left"
                  >
                    <span className={`relative block aspect-video overflow-hidden rounded-[2px] bg-ink ${k >= 0 ? "ring-2 ring-signal ring-offset-2 ring-offset-sheet" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- TMDB stills, served by TMDB's own image CDN */}
                      <img
                        src={stillUrl(data.films[id][3])}
                        alt=""
                        loading="lazy"
                        className={`size-full object-cover ${k >= 0 ? "" : "opacity-75 saturate-[0.55] group-hover:opacity-100 group-hover:saturate-100"}`}
                      />
                      {k >= 0 && (
                        <span className={`hatch-${k} absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full border border-ink text-[10px] font-bold ${k === 0 ? "text-film" : "bg-sheet text-ink"}`}>
                          <span className={k === 0 ? "" : "rounded-full bg-sheet px-[3px]"}>{k + 1}</span>
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block text-[12.5px] font-[600] leading-tight">{title}</span>
                    <span className="type-label block text-[9.5px] text-graphite">{year}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="type-label mt-6 text-graphite">{failed ? "The shelf didn't load — the live site has it." : "Loading the shelf…"}</p>
        )}
        <div className="mt-8 grid gap-4 border-t border-hairline pt-5 text-[13.5px] leading-snug text-graphite min-[560px]:grid-cols-3">
          <p>
            <span className="type-label block text-ink">How it scores</span>
            Every film keeps its 50 strongest links to other films, learned from what the same people loved.
          </p>
          <p>
            <span className="type-label block text-ink">Your three picks</span>
            Each one votes for its links, weighted by how strong they are. Votes add up.
          </p>
          <p>
            <span className="type-label block text-ink">Reading a bar</span>
            Length is the score. Each pattern is one of your picks: the share it gave.
          </p>
        </div>
      </div>

      {/* The votes */}
      <div className="relative col-span-12 p-[clamp(14px,1.8vw,24px)] min-[1000px]:col-span-5" aria-live="polite" data-part="Votes · rankCandidates()">
        {!result || !data ? (
          <div className="grid h-full min-h-56 place-items-center">
            <p className="max-w-[26ch] text-center text-[15px] text-graphite">
              {picks.length === 0 ? "Pick three films you love." : `${3 - picks.length} more to go.`} Each one votes for the films its fans loved.
            </p>
          </div>
        ) : (
          <div key={result.run}>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {result.picks.map((id, k) => (
                <span key={id} className="type-label inline-flex items-center gap-2 text-ink">
                  <span className={`hatch-${k} inline-block h-3 w-5 border border-ink`} />
                  {data.films[id][0]}
                </span>
              ))}
            </div>
            <ol className="mt-4 space-y-2.5">
              {result.ranked.map((r, row) => {
                const [title, year] = data.films[r.tmdbId];
                return (
                  <li key={r.tmdbId} className={row === 0 ? "" : "opacity-90"}>
                    <p className="flex items-baseline justify-between gap-3 text-[13.5px] leading-tight">
                      <span className={row === 0 ? "font-[700]" : ""}>
                        {row + 1}. {title} <span className="text-graphite">({year})</span>
                      </span>
                      <span className="type-label tabular-nums text-graphite">{r.score.toFixed(2)}</span>
                    </p>
                    <div className="mt-1 flex h-2.5 w-full">
                      {r.parts.map((part, k) =>
                        part > 0 ? (
                          <span
                            key={k}
                            className={`vote hatch-${k} h-full border-r border-sheet last:border-r-0`}
                            style={{ width: `${(part / max) * 100}%`, animationDelay: `${k * VOTE_STAGGER + row * ROW_STAGGER}ms` }}
                          />
                        ) : null
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {top && (
              <div className="rise-in mt-6 border-t border-hairline pt-5" style={{ animationDelay: `${3 * VOTE_STAGGER + 200}ms` }}>
                <p className="type-label text-signal-ink">Top pick</p>
                <div className="mt-3 flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- TMDB still */}
                  <img src={stillUrl(data.films[top.tmdbId][3])} alt="" className="aspect-video w-[42%] shrink-0 rounded-[2px] object-cover" />
                  <div>
                    <p className="text-[19px] font-[700] leading-tight">{data.films[top.tmdbId][0]}</p>
                    <p className="mt-1 text-[13.5px] text-graphite">
                      {data.films[top.tmdbId][1]} · {data.films[top.tmdbId][2]}
                    </p>
                    {reason && (
                      <p className="mt-2.5 text-[13.5px] leading-snug">
                        {reason.both.toLocaleString("en-US")} of the {reason.loved.toLocaleString("en-US")} people who loved {reason.seed} loved this too.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <p className="type-label mt-5 text-graphite">
              Scored {result.scored} films in {result.ms < 0.1 ? "under 0.1" : result.ms.toFixed(2)} ms — measured just now, in your browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
