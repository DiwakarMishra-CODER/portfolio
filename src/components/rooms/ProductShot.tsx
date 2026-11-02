"use client";

import { useEffect, useRef, useState } from "react";
import footage from "@/data/footage.json";

/**
 * The front of a project: the real site, recorded being used, in a plain
 * browser frame with its real address. It plays once when it's on screen and
 * rests on its last frame (Replay plays it again). Nothing loads until the
 * room is near; under reduced motion or Save-Data it waits for a tap.
 */
export function ProductShot({
  id,
  url,
  mp4,
  webm,
  poster,
  alt,
  inside,
}: {
  id: keyof typeof footage;
  url: string;
  mp4: string;
  webm: string;
  poster: string;
  alt: string;
  /** What's behind the screen: shown by the cut (the screen swings open as you scroll). */
  inside?: React.ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [state, setState] = useState<"waiting" | "playing" | "ended" | "ask">("waiting");
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const when = new Date(footage[id].recorded).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  useEffect(() => {
    const el = root.current;
    const v = video.current;
    if (!el || !v) return;
    const still =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    // Start loading a screen away; play once it's mostly in view.
    const load = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), load.disconnect()), { rootMargin: "100% 0px" });
    const view = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.55) {
          if (still) return setState((s) => (s === "waiting" ? "ask" : s));
          if (v.ended || v.dataset.done) return;
          v.play().then(
            () => setState("playing"),
            () => setState("ask")
          );
        } else if (!v.paused) v.pause();
      },
      { threshold: [0, 0.55] }
    );
    load.observe(el);
    view.observe(el);
    // The cut: while the shot is held (sticky) its screen swings open,
    // scrubbed by the scroll, both ways. --lid 0 → 1; the host reads
    // data-lid and sweeps his arm with it.
    const st = stage.current;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!st) return;
        const r = st.getBoundingClientRect();
        const held = r.height - el.offsetHeight;
        const p = Math.min(1, Math.max(0, (STICK - r.top) / Math.max(1, held)));
        const lid = Math.min(1, Math.max(0, (p - LID_FROM) / (LID_TO - LID_FROM)));
        st.style.setProperty("--lid", lid.toFixed(4));
        st.dataset.lid = lid.toFixed(3);
      });
    };
    const cut = !!st && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (cut) {
      st!.classList.add("is-cut");
      addEventListener("scroll", onScroll, { passive: true });
      addEventListener("resize", onScroll);
      onScroll();
    }
    return () => {
      load.disconnect();
      view.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, []);

  const replay = () => {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    delete v.dataset.done;
    v.play().then(() => setState("playing"), () => setState("ask"));
  };

  const shot = (
    <figure ref={root} className="ps" data-state={state} data-part="The real site, recorded">
      <div className="ps-frame">
        <div className="ps-bar">
          <a className="ps-url" href={url} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 12 14" aria-hidden="true">
              <rect x="1" y="6" width="10" height="7.5" rx="1.6" fill="currentColor" />
              <path d="M3.4 6V4.3a2.6 2.6 0 0 1 5.2 0V6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {host}
            <span className="ps-go" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>
        <div className="ps-screen">
          {inside && (
            <div className="ps-inside" aria-hidden="true">
              {inside}
            </div>
          )}
          <div className="ps-lid">
          {/* The last frame, until the clip has loaded (lazy: no weight until near). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ps-poster" src={poster} alt={alt} width={1280} height={800} loading="lazy" decoding="async" />
          <video
            ref={video}
            className="ps-video"
            muted
            playsInline
            preload={near ? "auto" : "none"}
            aria-hidden="true"
            onEnded={(e) => {
              e.currentTarget.dataset.done = "1";
              setState("ended");
            }}
          >
            {near && <source src={webm} type="video/webm" />}
            {near && <source src={mp4} type="video/mp4" />}
          </video>
          {(state === "ended" || state === "ask") && (
            <button type="button" className="ps-replay" onClick={replay}>
              {state === "ask" ? "▶ Play the recording" : "↻ Replay"}
            </button>
          )}
          </div>
        </div>
      </div>
      <figcaption>Recorded from the live site, {when}.</figcaption>
    </figure>
  );
  if (!inside) return shot;
  return (
    <div ref={stage} className="ps-stage">
      {shot}
    </div>
  );
}

// The cut's timing, over the shot's held stretch (0 → 1): the recording
// plays first, then the screen swings open, then it rests open.
const STICK = 92; // its sticky top (rooms.css)
const LID_FROM = 0.38;
const LID_TO = 0.86;
