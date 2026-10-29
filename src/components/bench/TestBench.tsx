"use client";

import { useEffect, useRef, useState } from "react";
import { useInViewOnce } from "@/lib/useInViewOnce";
import { ARTHOUSE as A, STARWEAVE as S, fmt } from "@/data/figures";
import linkcheck from "@/data/linkcheck.json";
import type { StarweaveData } from "@/lib/machines/starweave";

/*
 * How I work, as a test report. Live checks really run, here, against the
 * same data the machines use; recorded ones say so and carry their date.
 * Nothing on this list is decorative — a failing check renders as a failure.
 */

type Outcome = { pass: boolean; result: string; ms?: number };
type Check =
  | { kind: "live"; rule: string; claim: string; run: (d: StarweaveData) => Outcome }
  | { kind: "recorded"; rule: string; claim: string; result: string; date: string; pass: boolean };

const PORT_CHECKED = "29 Oct 2026";
const PAGE_BUDGET_KB = 1500;

const timed = (fn: () => Omit<Outcome, "ms">): Outcome => {
  const t0 = performance.now();
  const o = fn();
  return { ...o, ms: performance.now() - t0 };
};

const CHECKS: Check[] = [
  {
    kind: "live",
    rule: "Every claim needs a source.",
    claim: "Every Starweave influence link says where it came from.",
    run: (d) =>
      timed(() => {
        const sourced = d.links.filter(([, , , quote, src]) => quote.trim() && src.trim()).length;
        return { pass: sourced === d.links.length, result: `${fmt(sourced)} / ${fmt(d.links.length)}` };
      }),
  },
  {
    kind: "live",
    rule: "A denial beats a rumour.",
    claim: "No influence an artist publicly denied is drawn on the map.",
    run: (d) =>
      timed(() => {
        const links = new Set(d.links.map(([a, b]) => `${a}>${b}`));
        const leaked = d.denials.filter(([a, b]) => links.has(`${a}>${b}`)).length;
        return { pass: leaked === 0, result: `${leaked} of ${d.denials.length} denials drawn` };
      }),
  },
  {
    kind: "live",
    rule: "The numbers on the page are true.",
    claim: "Every Starweave figure above matches the data it runs on.",
    run: (d) =>
      timed(() => {
        const hosts = new Set(
          d.links
            .map(([, , , , src]) => src)
            .filter((s) => s.startsWith("http"))
            .map((s) => new URL(s).hostname.replace(/^www\./, ""))
        );
        const actual = {
          artists: d.artists.length,
          links: d.links.length,
          sourced: d.links.filter(([, , , q, s]) => q && s).length,
          firstPerson: d.links.filter(([, , t]) => t === 0).length,
          sites: hosts.size,
          denials: d.denials.length,
        };
        const keys = Object.keys(S) as (keyof typeof S)[];
        const wrong = keys.filter((k) => actual[k] !== S[k]);
        return { pass: wrong.length === 0, result: wrong.length ? `${wrong.join(", ")} differ` : `${keys.length} of ${keys.length} match` };
      }),
  },
  {
    kind: "recorded",
    rule: "Same answer as the real thing.",
    claim: "The two machines above match the live sites' own code.",
    result: "1,161 routes · 321 film triples, all identical",
    date: PORT_CHECKED,
    pass: true,
  },
  {
    kind: "recorded",
    rule: "Measure against a baseline.",
    claim: `Arthouse's recommender, tested on ${fmt(A.testPeople)} people it never saw.`,
    result: `${A.hitRate}% vs ${A.oldHitRate}% for the old engine`,
    date: A.evaluatedOn,
    pass: true,
  },
  {
    kind: "recorded",
    rule: "Nothing broken ships.",
    claim: "Every link on this page answers.",
    result: linkcheck.total ? `${linkcheck.total - linkcheck.failed} of ${linkcheck.total} links` : "not yet run",
    date: linkcheck.checkedAt ? new Date(linkcheck.checkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—",
    pass: linkcheck.total > 0 && linkcheck.failed === 0,
  },
];

// The last check measures this page in the visitor's own browser.
function pageWeight(): Outcome {
  const entries = [
    ...performance.getEntriesByType("navigation"),
    ...performance.getEntriesByType("resource"),
  ] as PerformanceResourceTiming[];
  const own = entries.filter((e) => {
    try {
      return new URL(e.name).origin === location.origin;
    } catch {
      return false;
    }
  });
  const kb = own.reduce((s, e) => s + (e.transferSize || 0), 0) / 1024;
  return {
    pass: kb > 0 && kb < PAGE_BUDGET_KB,
    result: kb > 0 ? `${fmt(Math.round(kb))} KB of ${fmt(PAGE_BUDGET_KB)} KB` : "not measurable here",
  };
}

const STEP_MS = 260;

export default function TestBench() {
  const ref = useRef<HTMLOListElement>(null);
  const arrived = useInViewOnce(ref, { threshold: 0.25 });
  const [data, setData] = useState<StarweaveData | null>(null);
  const [outcomes, setOutcomes] = useState<(Outcome | null)[]>(() => [...CHECKS, null].map(() => null));
  const total = CHECKS.length + 1;

  useEffect(() => {
    if (!arrived || data) return;
    fetch("/data/starweave.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [arrived, data]);

  // Run the checks one after another, so each result lands on its own beat.
  useEffect(() => {
    if (!data) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    [...CHECKS, null].forEach((c, i) => {
      const go = () =>
        setOutcomes((prev) => {
          const next = [...prev];
          next[i] = c == null ? pageWeight() : c.kind === "live" ? c.run(data) : { pass: c.pass, result: c.result };
          return next;
        });
      if (reduced) go();
      else timers.push(window.setTimeout(go, 200 + i * STEP_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [data]);

  const done = outcomes.filter(Boolean).length;
  const passed = outcomes.filter((o) => o?.pass).length;

  return (
    <section id="about" data-part="Test bench" className="relative film-surface border-t border-hairline px-[var(--gutter)] py-28" aria-labelledby="bench-title">
      <div className="mx-auto max-w-[1312px]">
        <div className="grid grid-cols-12 gap-x-[clamp(12px,1.7vw,24px)] gap-y-6">
          <div className="col-span-12 min-[900px]:col-span-7">
            <p className="type-label text-graphite">
              <span className="text-signal-ink">How I work</span>&nbsp; Test bench
            </p>
            <h2 id="bench-title" className="mt-5 max-w-[18ch] text-[clamp(30px,3.6vw,54px)] font-[750] leading-[1.02] [font-variation-settings:'wdth'_112]">
              The rules I build by, checked by this page as you read.
            </h2>
          </div>
          <p className="type-label col-span-12 self-end text-graphite min-[900px]:col-span-5 min-[900px]:text-right" aria-live="polite">
            {done === 0 ? "Waiting to run" : done < total ? `Running · ${done} of ${total}` : `${passed} of ${total} passed`}
          </p>
        </div>

        <ol ref={ref} className="mt-12 border-t border-ink">
          {[...CHECKS, null].map((c, i) => {
            const o = outcomes[i];
            const kind = c == null ? "live" : c.kind;
            const rule = c == null ? "Light enough for a slow phone." : c.rule;
            const claim = c == null ? "This page's own files, measured in your browser just now." : c.claim;
            return (
              <li key={rule} className="grid grid-cols-12 items-baseline gap-x-[clamp(12px,1.7vw,24px)] gap-y-1 border-b border-hairline py-5">
                <span className="type-label col-span-12 flex items-center gap-2.5 min-[900px]:col-span-2">
                  <Mark state={o == null ? "waiting" : o.pass ? (kind === "live" ? "pass" : "recorded") : "fail"} />
                  <span className={kind === "live" ? "text-signal-ink" : "text-graphite"}>{kind === "live" ? "Live" : "Recorded"}</span>
                </span>
                <p className="col-span-12 text-[clamp(17px,1.4vw,20px)] font-[700] leading-snug min-[900px]:col-span-4">{rule}</p>
                <p className="col-span-12 text-[15px] leading-snug text-graphite min-[900px]:col-span-3">{claim}</p>
                <p className="type-label col-span-12 tabular-nums text-ink min-[900px]:col-span-3 min-[900px]:text-right">
                  {o == null ? (
                    <span className="text-graphite">…</span>
                  ) : (
                    <>
                      {o.result}
                      <span className="block text-graphite">
                        {c != null && c.kind === "recorded" ? c.date : o.ms != null ? `${o.ms < 0.1 ? "<0.1" : o.ms.toFixed(1)} ms` : "now"}
                      </span>
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Mark({ state }: { state: "waiting" | "pass" | "recorded" | "fail" }) {
  if (state === "waiting") return <span className="inline-block size-3.5 border border-hairline" aria-label="Not run yet" />;
  if (state === "fail")
    return (
      <span className="inline-grid size-3.5 place-items-center bg-ink text-[10px] leading-none text-film" aria-label="Failed">
        ×
      </span>
    );
  return (
    <span
      className={`inline-grid size-3.5 place-items-center text-[10px] leading-none ${state === "pass" ? "bg-signal text-white" : "border border-ink text-ink"}`}
      aria-label={state === "pass" ? "Passed" : "Recorded pass"}
    >
      ✓
    </span>
  );
}
