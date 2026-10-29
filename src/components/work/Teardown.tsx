"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import "./work.css";

export type Fact = { value: string; label: string };
export type Part = { k: string; v: string };

type Props = {
  id: string;
  n: string;
  name: string;
  year: string;
  line: string;
  live: string;
  source: string;
  cover: { src: string; alt: string };
  machineTitle: string;
  machineNote: string;
  facts: Fact[];
  sources: string;
  parts: Part[];
  children: ReactNode;
};

// The lift runs while the case's top edge travels from LIFT_START to LIFT_END
// (fractions of the viewport height) — so it happens on the way in, with no
// pinning: by the time the machine is comfortably on screen, it's uncovered.
const LIFT_START = 0.78;
const LIFT_END = 0.22;
const LIFT_Z = 220; // px toward the viewer at the top of the arc
const LIFT_TILT = 9; // degrees at the top of the arc

const glide = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function Teardown(p: Props) {
  const caseRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLAnchorElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const kase = caseRef.current;
    const cover = coverRef.current;
    const shadow = shadowRef.current;
    const dock = dockRef.current;
    if (!kase || !cover || !shadow || !dock) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const frame = () => {
      raf = 0;
      const c = kase.getBoundingClientRect();
      const d = dock.getBoundingClientRect();
      const vh = window.innerHeight;
      const q = reduced ? 1 : Math.min(1, Math.max(0, (LIFT_START * vh - c.top) / ((LIFT_START - LIFT_END) * vh)));
      const e = glide(q);
      const arc = Math.sin(Math.PI * q);
      // Cover and dock are both 16:10, so one uniform scale maps one onto the
      // other — the screenshot never stretches.
      const k = d.width / c.width;
      const dx = (d.left - c.left) * e;
      const dy = (d.top - c.top) * e;
      const sx = 1 - (1 - k) * e;
      const sy = sx;
      cover.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, ${(arc * LIFT_Z).toFixed(1)}px) rotateX(${(arc * LIFT_TILT).toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      // The shadow stays on the machine's plane and trails a little behind.
      shadow.style.transform = `translate3d(${(dx * 0.92 + arc * 30).toFixed(1)}px, ${(dy * 0.92 + arc * 60).toFixed(1)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      shadow.style.opacity = (arc * 0.55).toFixed(3);
      const docked = q >= 0.999;
      cover.dataset.docked = docked ? "true" : q > 0.04 ? "mid" : "false";
      cover.tabIndex = docked ? 0 : -1;
      cover.style.pointerEvents = q <= 0.001 || docked ? "auto" : "none";
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    kick();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
    };
  }, []);

  return (
    <article id={p.id} className="relative scroll-mt-16" aria-labelledby={`${p.id}-name`} data-part={`Teardown · ${p.name}`}>
      {/* Header: part number, name, one line; the dock waits on the right. */}
      <header className="grid grid-cols-12 items-end gap-x-[clamp(12px,1.7vw,24px)] gap-y-6 pb-8">
        <div className="col-span-12 min-[900px]:col-span-8">
          <p className="type-label text-graphite">
            <span className="text-signal-ink">{p.n}</span>&nbsp; Teardown · {p.year}
          </p>
          <h3 id={`${p.id}-name`} className="type-display mt-4 text-[clamp(40px,6.4vw,104px)]">
            {p.name}
          </h3>
          <p className="mt-5 max-w-[38ch] text-[clamp(17px,1.45vw,21px)] leading-snug">{p.line}</p>
        </div>
        <div className="col-span-7 min-[560px]:col-span-5 min-[900px]:col-span-3 min-[900px]:col-start-10">
          <div ref={dockRef} className="td-dock" aria-hidden="true" data-part="Dock">
            <span className="type-label absolute inset-0 grid place-items-center text-graphite">Interface</span>
          </div>
          <p className="type-label mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <a href={p.live} target="_blank" rel="noreferrer" className="text-ink underline decoration-signal underline-offset-4 hover:text-signal-ink">
              Live site ↗
            </a>
            <a href={p.source} target="_blank" rel="noreferrer" className="text-ink underline decoration-hairline underline-offset-4 hover:text-signal-ink">
              Source ↗
            </a>
          </p>
        </div>
      </header>

      {/* The case: machine underneath, cover on top. */}
      <div ref={caseRef} className="td-case">
        <div ref={shadowRef} className="td-cover-shadow" aria-hidden="true" />
        <a
          ref={coverRef}
          href={p.live}
          target="_blank"
          rel="noreferrer"
          className="td-cover"
          data-part="01 · Interface (cover)"
          aria-label={`${p.name} — open the live site`}
          tabIndex={-1}
        >
          <Image src={p.cover.src} alt={p.cover.alt} fill sizes="(min-width: 1200px) 1100px, 100vw" className="object-cover object-top" />
          <span className="td-cover-label type-label absolute bottom-3 left-3 bg-film/90 px-2.5 py-1.5 text-ink">
            <span className="text-signal-ink">01</span>&nbsp; Interface · scroll to lift it off
          </span>
        </a>

        <div className="td-machine" data-part="02 · Machine">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline px-[clamp(16px,2vw,28px)] py-4">
            <p className="type-label text-ink">
              <span className="text-signal-ink">02</span>&nbsp; Machine · {p.machineTitle}
            </p>
            <p className="max-w-[60ch] text-[13.5px] leading-snug text-graphite">{p.machineNote}</p>
          </div>
          {p.children}
        </div>
      </div>

      {/* 03 — the data underneath everything, then the parts list. */}
      <div className="mt-10 grid grid-cols-12 gap-x-[clamp(12px,1.7vw,24px)] gap-y-10">
        <div className="relative col-span-12 min-[900px]:col-span-8" data-part="03 · Data">
          <p className="type-label text-graphite">
            <span className="text-signal-ink">03</span>&nbsp; Data
          </p>
          <dl className="mt-5 grid grid-cols-2 border-t border-hairline min-[560px]:grid-cols-3">
            {p.facts.map((f) => (
              <div key={f.label} className="border-b border-hairline py-4 pr-4">
                <dt className="sr-only">{f.label}</dt>
                <dd>
                  <span className="block font-display text-[clamp(26px,2.6vw,38px)] font-[750] tabular-nums leading-none [font-variation-settings:'wdth'_118]">
                    {f.value}
                  </span>
                  <span className="mt-2 block text-[13.5px] leading-snug text-graphite">{f.label}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-graphite">{p.sources}</p>
        </div>
        <div className="relative col-span-12 min-[900px]:col-span-4" data-part="04 · Parts list">
          <p className="type-label text-graphite">
            <span className="text-signal-ink">04</span>&nbsp; Parts list
          </p>
          <dl className="mt-5 border-t border-hairline">
            {p.parts.map((part) => (
              <div key={part.k} className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-hairline py-3">
                <dt className="type-label pt-0.5 text-graphite">{part.k}</dt>
                <dd className="text-[14.5px] leading-snug">{part.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  );
}
