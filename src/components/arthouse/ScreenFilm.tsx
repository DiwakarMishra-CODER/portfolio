"use client";

import { useEffect, useRef, useState } from "react";

/**
 * What the projector shows: Arthouse Atlas itself, recorded being used,
 * looping on the cinema screen while the cinema is on screen (it comes up
 * with the lamp: lightsdown.css flickers this layer on). Nothing loads until
 * the cinema is a screen away; under reduced motion, its still.
 */
export default function ScreenFilm({ mp4, webm, poster }: { mp4: string; webm: string; poster: string }) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = root.current?.closest(".ld");
    const v = video.current;
    if (!el || !v) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const load = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), load.disconnect()), { rootMargin: "100% 0px" });
    const view = new IntersectionObserver(([e]) => {
      if (still) return;
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    load.observe(el);
    view.observe(el);
    return () => {
      load.disconnect();
      view.disconnect();
    };
  }, []);
  return (
    <div ref={root} className="ld-film" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" width={1280} height={800} loading="lazy" decoding="async" />
      <video ref={video} muted loop playsInline preload={near ? "auto" : "none"}>
        {near && <source src={webm} type="video/webm" />}
        {near && <source src={mp4} type="video/mp4" />}
      </video>
    </div>
  );
}
