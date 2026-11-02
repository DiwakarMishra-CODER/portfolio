"use client";

// Starweave's family tree, live: one artist in the middle, who shaped them
// above (gold lines, drawn into them), who they went on to shape below (blue
// lines, drawn out of them), and the proof for whichever tie is picked, as a
// clipping. Tap a face to read its proof; "See their family" walks the tree.
//
// The first family (and its first proof) is rendered on the server from the
// real data, so it reads with JS off and appears with no loading state; the
// full map is fetched only when the visitor goes somewhere else in it.
//
// The first time through (once a visit) it's a guided run of two taps: the
// strongest parent's face is ringed ("Tap R.E.M."), its proof opens, then
// "See R.E.M.'s family" is ringed, and walking there shows the band you
// started on in the row below. Then the band chips appear and it's yours.
// Tapping anything else, or Skip, ends the guide at once. The face to tap is
// the only bright one (ring, ripple, "Tap"); the host says what to do and
// what it means.
//
// Two places on wide screens: the tree on the left is where you act; the
// proof shows in the host's column on the right (a portal into the room's
// lane), right over his bubble, so his words and the quote read together.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import TapHand from "@/components/rooms/TapHand";
import type { StarweaveData } from "@/lib/machines/starweave";
import { familyOf, sourceHost, type Faces, type Family, type Member } from "@/lib/machines/family";

const TIER = ["In their own words", "Reported by a publication", "A critic's comparison"];
const UP = "#f0c97a"; // Starweave's colours: warm for where the music came from,
const DOWN = "#8fd0ff"; // cool for where it went.

type Pick = { side: "up" | "down"; i: number };
type Step = "face" | "walk" | "free";
const GUIDED = "sw.guided"; // sessionStorage: the guide ran (or was skipped) this visit
const guidedBefore = () => {
  try {
    return !!sessionStorage.getItem(GUIDED);
  } catch {
    return false;
  }
};
const never = () => () => {};
// Wide enough for the host's column (the room's lane): the proof goes there.
const WIDE = "(min-width: 1280px)";
const onWide = (fn: () => void) => {
  const mq = matchMedia(WIDE);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};

/** Tell the host what just happened here (HostLayer answers). */
const tell = (detail: { kind: "proof" | "song" | "walk" | "guide"; tier?: number; on?: boolean; step?: 0 | 1 | 2 | 3; a?: string; b?: string }) =>
  window.dispatchEvent(new CustomEvent("host:react", { detail }));
type Props = { initial: Family; tries: { name: string; i: number }[]; live: string };

export default function FamilyTree({ initial, tries, live }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const flyFrom = useRef<DOMRect | null>(null);
  const showWas = useRef(false); // the guide's walk: bring the band you came from into view
  const showProof = useRef(false); // a tap opened a proof: make sure it's on screen
  const drawn = useRef(-1); // the family whose lines have already drawn in
  const [fam, setFam] = useState(initial);
  const [trail, setTrail] = useState<number[]>([]);
  const [pick, setPick] = useState<Pick | null>(first(initial));
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [stepNow, setStep] = useState<Step>("face");
  // Guided once a visit (the server can't know, so it renders the guide).
  const seen = useSyncExternalStore(never, guidedBefore, () => false);
  const wide = useSyncExternalStore(onWide, () => matchMedia(WIDE).matches, () => false);
  const [was, setWas] = useState<number | null>(null); // the centre you just walked from
  const target = first(initial);
  const step: Step = seen || !target ? "free" : stepNow;
  const data = useRef<Promise<[StarweaveData, Faces]> | null>(null);

  // The whole map, fetched once: when the tree comes near, or on first use.
  const load = useCallback(() => {
    data.current ??= Promise.all([
      fetch("/data/starweave.json").then((r) => r.json() as Promise<StarweaveData>),
      fetch("/data/starweave-faces.json").then((r) => r.json() as Promise<Faces>),
    ]);
    return data.current;
  }, []);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (load(), io.disconnect()), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  const finish = () => {
    setStep("free");
    try {
      sessionStorage.setItem(GUIDED, "1");
    } catch {}
  };

  const go = async (i: number, from?: HTMLElement | null, back = false) => {
    const [d, f] = await load();
    flyFrom.current = from?.getBoundingClientRect() ?? null;
    audioRef.current?.pause();
    setTrail((t) => (back ? t.slice(0, -1) : [...t, fam.centre.i]));
    setWas(back ? null : fam.centre.i);
    const next = familyOf(d, f, i);
    setFam(next);
    // Walked here along a tie: show that tie's proof, now from the other side.
    const came = back ? undefined : next.children.find((m) => m.i === fam.centre.i) ?? next.parents.find((m) => m.i === fam.centre.i);
    setPick(came ? { side: next.children.includes(came) ? "down" : "up", i: came.i } : first(next));
    setRun((r) => r + 1);
    // The guide's second tap: the band you started on is now in the row below.
    if (step === "walk") {
      showWas.current = true;
      finish();
      tell({ kind: "guide", step: 2, a: fam.centre.name });
    } else {
      if (step !== "free") finish();
      tell({ kind: "walk" });
    }
  };
  const choose = (p: Pick) => {
    const m = (p.side === "up" ? fam.parents : fam.children).find((x) => x.i === p.i);
    setPick(p);
    showProof.current = true;
    if (!m) return;
    // The guide's first tap: the ringed face opens its proof.
    if (step === "face" && target && p.side === target.side && p.i === target.i) {
      setStep("walk");
      tell({ kind: "guide", step: 1, tier: m.tier, b: m.name, a: fam.centre.name });
      return;
    }
    if (step !== "free") finish(); // tapped something else: it's yours now
    tell({ kind: "proof", tier: m.tier });
  };
  const skip = () => {
    finish();
    tell({ kind: "guide", step: 3 });
  };

  // Draw the lines between the faces (measured from the real layout, so
  // they meet the photos at any width), and redraw when the layout changes.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;
    const draw = () => {
      svg.setAttribute("viewBox", `0 0 ${root.offsetWidth} ${root.offsetHeight}`);
      // Layout positions (offsets ignore transforms, so a photo mid-flight or
      // a face scaled on hover doesn't bend the lines).
      const at = (el: HTMLElement) => {
        let x = 0;
        let y = 0;
        for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
          x += n.offsetLeft;
          y += n.offsetTop;
        }
        return { x: x + el.offsetWidth / 2, top: y, bottom: y + el.offsetHeight };
      };
      const photo = root.querySelector<HTMLElement>("[data-centre-photo]");
      const block = root.querySelector<HTMLElement>(".fam-centre");
      if (!photo || !block) return;
      // Into the top of the centre's photo; out from under its name and song.
      const c = { x: at(photo).x, top: at(photo).top, bottom: at(block).bottom };
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Lines draw in once per family; a redraw (a new pick, a resize) just places them.
      const fresh = drawn.current !== run;
      drawn.current = run;
      svg.replaceChildren();
      root.querySelectorAll<HTMLElement>("[data-tie]").forEach((el) => {
        const side = el.dataset.side as "up" | "down";
        const face = at(el.querySelector<HTMLElement>(".fam-photo")!);
        const under = at(el.querySelector<HTMLElement>("button")!);
        // Influence runs from the older artist into the younger one: out from
        // under a parent's name, into the top of a child's photo.
        const [x1, y1, x2, y2] = side === "up" ? [face.x, under.bottom + 4, c.x, c.top - 6] : [c.x, c.bottom + 6, face.x, face.top - 4];
        const bend = (y2 - y1) * 0.55;
        const d = `M ${x1} ${y1} C ${x1} ${y1 + bend} ${x2} ${y2 - bend} ${x2} ${y2}`;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("pathLength", "1");
        path.setAttribute("class", `fam-line fam-${side}${el.dataset.picked ? " is-picked" : ""}${el.dataset.coach ? " is-coach" : ""}${fresh ? " is-fresh" : ""}`);
        path.style.setProperty("--k", String(Number(el.dataset.k) + (side === "down" ? 7 : 0)));
        svg.appendChild(path);
        // The picked tie: a spark of light runs along it, in the influence's direction.
        if (el.dataset.picked && !reduce) {
          const spark = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          spark.setAttribute("r", "4");
          spark.setAttribute("class", "fam-spark");
          spark.setAttribute("fill", side === "up" ? UP : DOWN);
          const motion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
          motion.setAttribute("dur", "1.8s");
          motion.setAttribute("repeatCount", "indefinite");
          motion.setAttribute("path", d);
          spark.appendChild(motion);
          svg.appendChild(spark);
        }
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(root);
    return () => ro.disconnect();
  }, [fam, pick, run, step]);

  // Replies to a tap, never on their own: on a narrow screen the proof opens
  // below the tree, so bring it up; and the guide's walk ends on "Look:
  // Radiohead is down here now", so make sure it is on screen.
  const glide = (top: number) => scrollBy({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  useEffect(() => {
    if (!showProof.current) return;
    showProof.current = false;
    const r = rootRef.current?.closest(".fam")?.querySelector(".fam-receipt")?.getBoundingClientRect();
    if (r && r.bottom > innerHeight) glide(Math.min(r.top - 90, r.bottom - innerHeight + 24));
  }, [pick]);
  useEffect(() => {
    if (!showWas.current) return;
    showWas.current = false;
    const r = rootRef.current?.querySelector("[data-was]")?.getBoundingClientRect();
    if (r && (r.top < 90 || r.bottom > innerHeight - 24)) glide(r.top + r.height / 2 - innerHeight / 2);
  }, [run]);

  // Scrolled past the tree without the first tap: he asks once (and the
  // empty proof slot in his column goes until the tree is back).
  const nudged = useRef(false);
  const [past, setPast] = useState(false);
  useEffect(() => {
    const row = rootRef.current?.querySelector(".fam-row-up");
    if (step !== "face" || !row) return;
    const io = new IntersectionObserver(([e]) => {
      const gone = !e.isIntersecting && e.boundingClientRect.top < 0;
      setPast(gone);
      if (!gone || nudged.current) return;
      nudged.current = true;
      tell({ kind: "guide", step: 0, b: fam.parents[0]?.name });
    });
    io.observe(row);
    return () => io.disconnect();
  }, [step, fam]);

  // While the guide runs and the tree is what you're looking at, the rest of
  // the room steps back (the title, the numbers, the sleeve, the sky).
  useEffect(() => {
    const tree = rootRef.current;
    const room = tree?.closest(".sw-room");
    if (!tree || !room || step === "free") return room?.classList.remove("is-guiding");
    const io = new IntersectionObserver(([e]) => room.classList.toggle("is-guiding", e.isIntersecting), { rootMargin: "-30% 0px -30% 0px" });
    io.observe(tree);
    return () => (io.disconnect(), room.classList.remove("is-guiding"));
  }, [step, run]);

  // A new centre arrives from the face that was tapped.
  useLayoutEffect(() => {
    const from = flyFrom.current;
    flyFrom.current = null;
    const to = rootRef.current?.querySelector("[data-centre-photo]");
    if (!from || !to || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = to.getBoundingClientRect();
    const s = from.width / r.width;
    to.animate(
      [{ transform: `translate(${from.left + from.width / 2 - (r.left + r.width / 2)}px, ${from.top + from.height / 2 - (r.top + r.height / 2)}px) scale(${s})` }, { transform: "none" }],
      { duration: 520, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
  }, [run]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  };

  const { centre } = fam;
  const picked = pick && (pick.side === "up" ? fam.parents : fam.children).find((m) => m.i === pick.i);
  // Waiting for the first tap, nothing is picked yet: the ringed face is the ask.
  const shown = step === "face" ? null : pick;
  const coach = step === "face" ? target : null;
  const coachName = coach && fam.parents.concat(fam.children).find((m) => m.i === coach.i)?.name;
  const skipButton = (
    <button type="button" className="fam-skip" onClick={skip}>
      Skip, I’ll explore
    </button>
  );
  // On wide screens the proof lives in the host's column.
  const slot = wide ? document.querySelector<HTMLElement>("#starweave [data-held-slot]") : null;
  const credits = [centre, ...fam.parents, ...fam.children].filter((m) => m.credit);
  const back = trail[trail.length - 1];

  const side = (
    <aside className={`fam-receipt-wrap${slot ? " is-in-lane" : ""}`} aria-live="polite">
      {/* Waiting for the first tap: where the proof will appear. */}
      {step === "face" && !past && <p className="fam-slot">The proof shows up here.</p>}
      {picked ? (
        // While the guide waits for its first tap this proof is sealed (it
        // stays in the HTML, so it still reads with JS off).
        <figure data-held className={`fam-receipt${step === "face" ? " is-sealed" : ""}`} key={`${centre.i}-${picked.i}`} data-tier={picked.tier}>
          <figcaption>
            <span className="fam-who">{pick!.side === "up" ? `${picked.name} → ${centre.name}` : `${centre.name} → ${picked.name}`}</span>
            <span className="fam-stamp">{TIER[picked.tier]}</span>
          </figcaption>
          {picked.line ? (
            <>
              <blockquote>“{picked.line}”</blockquote>
              {picked.said && <p className="fam-said">{picked.said}</p>}
            </>
          ) : (
            <blockquote className="fam-cite">{picked.quote}</blockquote>
          )}
          <p className="fam-src">
            <SourceLink src={picked.source} />
          </p>
          <button type="button" className={`fam-walk${step === "walk" ? " is-coach" : ""}`} onClick={() => go(picked.i, rootRef.current?.querySelector<HTMLElement>(`[data-tie][data-i="${picked.i}"] .fam-photo`))}>
            See {picked.name}’s family →{step === "walk" && <TapHand />}
          </button>
        </figure>
      ) : (
        <p className="fam-hint">Tap any face to see the proof.</p>
      )}
      {slot && step !== "free" && !past && skipButton}
    </aside>
  );

  return (
    <div className="fam" data-guide={step}>
      {/* One slot above the tree: what to tap while the guide runs, then the bands to try. */}
      {step === "free" ? (
        <div className="fam-try" key="try">
          <span>Try</span>
          {tries.map((t) => (
            <button key={t.i} type="button" className="fam-chip" aria-pressed={t.i === centre.i} onClick={() => t.i !== centre.i && go(t.i)}>
              {t.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="fam-try fam-coach" key="coach">
          <p>
            {step === "face" ? (
              <>
                Tap <b>{coachName}</b> to see the proof.
              </>
            ) : (
              <>
                Now tap <b>See {picked?.name}’s family</b>.
              </>
            )}
          </p>
          {!slot && skipButton}
        </div>
      )}

      <div className="fam-body">
        <div className="fam-tree" ref={rootRef} key={run} data-part="Starweave · family tree">
          <svg ref={svgRef} className="fam-lines" aria-hidden="true" />
          <Row label="Shaped by" side="up" members={fam.parents} more={fam.moreParents} pick={shown} coach={coach} was={was} onPick={choose} />

          <div className="fam-centre">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-centre-photo className="fam-photo fam-photo-big" src={centre.photo} alt="" width={132} height={132} style={{ "--ring": centre.color } as React.CSSProperties} />
            <h3>{centre.name}</h3>
            <p className="fam-since">{centre.since ? `Making music since ${centre.since}` : " "}</p>
            {centre.preview && (
              <button type="button" className="fam-play" aria-pressed={playing} onClick={toggle}>
                <span className={`fam-eq${playing ? " is-on" : ""}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                {playing ? "Pause" : "Play"} “{centre.song}”
                <small>30 s</small>
              </button>
            )}
            <audio ref={audioRef} src={centre.preview || undefined} preload="none" onPlay={() => (setPlaying(true), tell({ kind: "song", on: true }))} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
          </div>

          <Row label="Went on to shape" side="down" members={fam.children} more={fam.moreChildren} pick={shown} coach={coach} was={was} onPick={choose} />
          {back !== undefined && (
            <button type="button" className="fam-back" onClick={() => go(back, null, true)}>
              ← Back
            </button>
          )}
        </div>

        {!slot && side}
      </div>
      {slot && createPortal(side, slot)}
      <a className="fam-explore" href={`${live}/artist/${centre.id}`} target="_blank" rel="noreferrer">
        Explore {centre.name} on Starweave ↗
      </a>

      {credits.length > 0 && (
        <p className="fam-credits">
          Photos:{" "}
          {credits.map((m, k) => {
            const [author, licence, url] = m.credit.split("|");
            return (
              <span key={m.i}>
                {k > 0 && ", "}
                {m.name} by{" "}
                <a href={url} target="_blank" rel="noreferrer">
                  {author}
                </a>{" "}
                ({licence})
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
}

type RowProps = { label: string; side: "up" | "down"; members: Member[]; more: number; pick: Pick | null; coach: Pick | null; was: number | null; onPick: (p: Pick) => void };

function Row({ label, side, members, more, pick, coach, was, onPick }: RowProps) {
  if (!members.length) return <p className={`fam-row-label fam-none fam-${side}-label`}>{side === "up" ? "No recorded influences: a root of the map." : "No one on the map cites them yet."}</p>;
  return (
    <div className={`fam-row fam-row-${side}`}>
      <p className={`fam-row-label fam-${side}-label`}>{label}</p>
      <ul>
        {members.map((m, k) => {
          const on = pick?.side === side && pick.i === m.i;
          return (
            <li key={m.i} data-tie data-side={side} data-k={k} data-i={m.i} data-picked={on || undefined} data-coach={(coach?.side === side && coach.i === m.i) || undefined} data-was={m.i === was || undefined}>
              <button type="button" aria-pressed={on} onClick={() => onPick({ side, i: m.i })}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="fam-photo" src={m.photo} alt="" width={64} height={64} loading="lazy" style={{ "--ring": m.color } as React.CSSProperties} />
                <span className="fam-name">{m.name}</span>
                {coach?.side === side && coach.i === m.i && <TapHand />}
              </button>
            </li>
          );
        })}
        {more > 0 && <li className="fam-more">+{more} more</li>}
      </ul>
    </div>
  );
}

function SourceLink({ src }: { src: string }) {
  const host = sourceHost(src);
  if (!host) return <>From print: {src.replace(/^print:/, "")}</>;
  return (
    <a href={src} target="_blank" rel="noreferrer">
      Source: {host} ↗
    </a>
  );
}

/** The tie shown first: the strongest proof among the parents (else the children). */
function first(f: Family): Pick | null {
  if (f.parents.length) return { side: "up", i: f.parents[0].i };
  if (f.children.length) return { side: "down", i: f.children[0].i };
  return null;
}
