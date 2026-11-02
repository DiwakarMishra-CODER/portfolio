"use client";

// The Arthouse room's lead: tap one film you love and Arthouse Atlas's own
// model (rankCandidates, the live site's code) picks the film to watch next. The
// reveal shows why, on the real MovieLens counts: an auditorium where every
// seat is a share of the people who loved your film; then only the ones who
// also loved that film stay lit, in gold. The marquee spells it out ("Loved
// Parasite? Watch Get Out.") and the host holds up the ticket in his column.
//
// The strip of films is rendered on the server (it reads with JS off); the
// model's data is fetched as the room comes near. First time through (once a
// visit) one well-known film is ringed with the ghost hand; any tap ends that.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { rankCandidates, stillUrl, type ArthouseData } from "@/lib/machines/arthouse";
import TapHand from "@/components/rooms/TapHand";
import Auditorium, { SEATS } from "./Auditorium";

export type ShelfFilm = { id: number; title: string; year: number; still: string };
type Bill = { a: number; b: number; loved: number; both: number; ms: number; scored: number; run: number; films: ArthouseData["films"]; ids: Record<string, string> };

const GUIDED = "ah.guided";
const GUIDE_FILM = "Parasite"; // its pick, Get Out: two films strangers know, and not a sequel
const WIDE = "(min-width: 1280px)";
const fmt = (n: number) => n.toLocaleString("en-US");
const tell = () => window.dispatchEvent(new CustomEvent("host:react", { detail: { kind: "double" } }));
const guidedBefore = () => {
  try {
    return !!sessionStorage.getItem(GUIDED);
  } catch {
    return false;
  }
};
const never = () => () => {};
/** The model's ranking for one film, and how long it really takes (averaged; never the animation). */
function timed(d: ArthouseData, a: number) {
  const REPS = 60;
  let ranked = rankCandidates(d, [a], 10);
  const t0 = performance.now();
  for (let i = 0; i < REPS; i++) ranked = rankCandidates(d, [a], 10);
  return { ranked, ms: (performance.now() - t0) / REPS };
}
const onWide = (fn: () => void) => {
  const mq = matchMedia(WIDE);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};

export default function DoubleBill({ shelf, live }: { shelf: ShelfFilm[]; live: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const data = useRef<Promise<ArthouseData> | null>(null);
  const runs = useRef(0);
  const [bill, setBill] = useState<Bill | null>(null);
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [tapped, setTapped] = useState(false);
  const seen = useSyncExternalStore(never, guidedBefore, () => false);
  const wide = useSyncExternalStore(onWide, () => matchMedia(WIDE).matches, () => false);
  const guiding = !seen && !tapped;
  const target = shelf.find((f) => f.title === GUIDE_FILM)?.id ?? shelf[0]?.id;

  const load = useCallback(() => {
    data.current ??= fetch("/data/arthouse.json").then((r) => r.json() as Promise<ArthouseData>);
    return data.current;
  }, []);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (load(), io.disconnect()), { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  const pick = async (a: number) => {
    setTapped(true);
    try {
      sessionStorage.setItem(GUIDED, "1");
    } catch {}
    const d = await load();
    // Its pick: the model's best match that enough people loved together.
    const { ranked, ms } = timed(d, a);
    const top = ranked.find((r) => (d.both[a]?.[r.tmdbId] ?? 0) >= d.minimumBoth) ?? ranked[0];
    if (!top) return;
    runs.current += 1;
    setBill({ a, b: top.tmdbId, loved: d.loved[a] ?? 0, both: d.both[a]?.[top.tmdbId] ?? 0, ms, scored: d.neighbours[a]?.length ?? 0, run: runs.current, films: d.films, ids: d.ids ?? {} });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase(reduce ? 2 : 1);
  };

  // Everyone who loved it lights up; a beat later only the ones who also
  // loved its partner stay lit. Then the host holds up the ticket.
  useEffect(() => {
    if (!bill) return;
    if (phase === 1) {
      const t = window.setTimeout(() => setPhase(2), 1500);
      return () => clearTimeout(t);
    }
    if (phase === 2) tell();
  }, [phase, bill]);

  // A reply to the tap: bring the stage into view if it's below the screen.
  useEffect(() => {
    if (!bill || phase === 2) return;
    const r = stageRef.current?.getBoundingClientRect();
    if (r && r.top > innerHeight * 0.55) scrollBy({ top: r.top - innerHeight * 0.2, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [bill, phase]);

  const film = (id: number): ShelfFilm => {
    const known = shelf.find((f) => f.id === id);
    if (known) return known;
    const f = bill?.films[id];
    return f ? { id, title: f[0], year: f[1], still: f[3] } : { id, title: "", year: 0, still: "" };
  };
  const A = bill && film(bill.a);
  const B = bill && film(bill.b);
  const per = bill ? Math.max(1, Math.round(bill.loved / SEATS)) : 0;
  // The ticket he holds: in his column on wide screens, under the stage otherwise.
  const slot = wide ? document.querySelector<HTMLElement>("#arthouse [data-held-slot]") : null;
  const ticket =
    bill && A && B && phase === 2 ? (
      <div className="ah-ticket" data-held key={`ticket-${bill.run}`}>
        <p className="ah-ticket-k">Admit one · Your next film</p>
        <p className="ah-ticket-v">{B.title}</p>
        <p className="ah-ticket-n">
          Because you loved {A.title}: {fmt(bill.both)} people loved both
        </p>
      </div>
    ) : null;

  return (
    <div className="ah-bill" ref={rootRef} data-guide={guiding ? "tap" : "free"}>
      <p className="ah-coach">
        {guiding ? (
          <>
            Tap a film you love. <span>Your next film shows below.</span>
          </>
        ) : (
          <>Tap any film you love to get the next one.</>
        )}
      </p>
      <ol className="ah-strip" aria-label="Films">
        {shelf.map((f) => (
          <li key={f.id} data-coach={(guiding && f.id === target) || undefined} data-on={bill?.a === f.id || undefined}>
            <button type="button" onClick={() => pick(f.id)} aria-pressed={bill?.a === f.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stillUrl(f.still)} alt="" width={300} height={169} loading="lazy" />
              <span>
                {f.title} <small>{f.year}</small>
              </span>
              {guiding && f.id === target && <TapHand />}
            </button>
          </li>
        ))}
      </ol>

      <div className="ah-stage" ref={stageRef} data-phase={phase}>
        <div className="ah-marquee" aria-live="polite">
          <p className="ah-marquee-k">{A ? `Loved ${A.title}?` : "Your next film"}</p>
          <p className="ah-marquee-v">{A && B && phase === 2 ? <>Watch {B.title}</> : A ? "Finding it…" : "Tap a film above"}</p>
        </div>
        <div className="ah-screen" key={`screen-${bill?.run ?? 0}`}>
          {A && (
            <figure className="ah-reel">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stillUrl(A.still, "w780")} alt={A.title} />
              <figcaption>{A.title}</figcaption>
            </figure>
          )}
          {B && phase === 2 && (
            <figure className="ah-reel ah-reel-b">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stillUrl(B.still, "w780")} alt={B.title} />
              <figcaption>{B.title}</figcaption>
            </figure>
          )}
          {!A && <p className="ah-screen-wait">Your next film plays here.</p>}
        </div>
        <div className="ah-caption" aria-live="polite">
          {bill && A && B ? (
            phase === 2 ? (
              <>
                <p className="ah-caption-big">
                  <b>{fmt(bill.both)}</b> of the {fmt(bill.loved)} people who loved {A.title} also loved {B.title}.
                </p>
                <p>
                  Arthouse Atlas’s model picked it from {A.title}’s {bill.scored} closest films, in {bill.ms < 0.1 ? bill.ms.toFixed(3) : bill.ms.toFixed(2)} ms, in your browser.{" "}
                  {bill.ids[bill.b] && (
                    <a href={`${live}movie/${bill.ids[bill.b]}`} target="_blank" rel="noreferrer">
                      See {B.title} on Arthouse Atlas ↗
                    </a>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="ah-caption-big">
                  <b>{fmt(bill.loved)}</b> people on MovieLens loved {A.title}.
                </p>
                <p>Each seat is about {fmt(per)} of them.</p>
              </>
            )
          ) : (
            <p>Every seat is real people: the ones who loved your film.</p>
          )}
        </div>
        {/* The seats the caption above is about. */}
        <Auditorium phase={phase} gold={bill ? bill.both / Math.max(1, bill.loved) : 0} seed={bill?.a ?? 0} />
        {!slot && ticket}
      </div>
      {slot && ticket && createPortal(ticket, slot)}
    </div>
  );
}
