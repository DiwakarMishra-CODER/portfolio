"use client";

import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/components/host/engine/engine";
import { CLIPS, type ClipName } from "@/components/host/engine/rig";

const SIZES = [160, 240, 320];

export default function HostLab() {
  const box = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [lowH, setLowH] = useState(320);
  const [spin, setSpin] = useState(false);
  const [model, setModel] = useState<"toon" | "voxel" | "suit" | "casual">("suit");
  const [beard, setBeard] = useState(true);
  const [hd, setHd] = useState(true);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const poster = new URLSearchParams(location.search).has("poster");
    // The projector still is framed as in the cinema's spot (440 × 367).
    if (new URLSearchParams(location.search).get("prop")) Object.assign(el.style, { width: "440px", aspectRatio: "6 / 5", background: "none" });
    let cancelled = false;
    let made: Engine | null = null;
    import("@/components/host/engine/engine").then(({ createEngine }) => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.className = "host-canvas";
      el.appendChild(canvas);
      createEngine(canvas, { lowH, model, beard, hd, shadow: !poster, spin: spin && !poster, onFirstFrame: () => el.classList.add("is-live") }).then((e) => {
        if (cancelled) return e.dispose();
        made = e;
        engine.current = e;
        // ?pose=glasses@0.6 holds a move at a moment, to judge it.
        const q = new URLSearchParams(location.search);
        // ?prop=projector&loaded=0|1: the projector on its own, framed as in the
        // cinema's spot, for the still that stands there when he isn't at it.
        if (q.get("prop") === "projector") {
          e.projector(true);
          e.loadReel(q.get("loaded") === "1");
          e.figure(false);
          // For the export script (this page is dev-only): draw-and-capture in one go.
          (window as unknown as { hostSnapshot: () => string }).hostSnapshot = () => e.snapshot("image/webp", 0.92);
        }
        const pose = q.get("pose")?.split("@");
        if (pose) setTimeout(() => e.pose(pose[0] as ClipName, Number(pose[1])), 300);
      });
      // The poster: one idle frame at native size, for the page to show
      // before the engine (and when motion is off).
      (window as unknown as { __hostPoster: () => string }).__hostPoster = () => made!.snapshot("image/webp", 0.9);
    });
    return () => {
      cancelled = true;
      made?.dispose();
      el.querySelector("canvas")?.remove();
    };
  }, [lowH, spin, model, beard, hd]);

  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", gap: 24, padding: 32 }}>
      <div
        ref={box}
        className="pg-spot"
        data-size="hero"
        style={{ width: 340, background: "url(/bg/glow-dawn.png) center / 140% 140% no-repeat", imageRendering: "pixelated" }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 640 }}>
        {CLIPS.map((c: ClipName) => (
          <button key={c} className="pg-btn" style={{ height: 40 }} onClick={() => engine.current?.play(c, { loop: c === "walk" || c === "run" || c === "held" || c === "sit" || c === "snore" })}>
            {c}
          </button>
        ))}
        {(["suit", "casual", "toon", "voxel"] as const).map((m) => (
          <button key={m} className="pg-btn" style={{ height: 40, borderColor: m === model ? "var(--signal)" : undefined }} onClick={() => setModel(m)}>
            {{ suit: "Suit", casual: "Casual", toon: "Hand-built", voxel: "Voxel" }[m]}
          </button>
        ))}
        <button className="pg-btn pg-btn-solid" style={{ height: 40 }} onClick={() => setBeard((b) => !b)}>
          {beard ? "Without beard" : "With beard"}
        </button>
        <button className="pg-btn pg-btn-solid" style={{ height: 40 }} onClick={() => setSpin((s) => !s)}>
          {spin ? "Stop turning" : "Turntable"}
        </button>
        {SIZES.map((s) => (
          <button key={s} className="pg-btn" style={{ height: 40, borderColor: !hd && s === lowH ? "var(--signal)" : undefined }} onClick={() => (setHd(false), setLowH(s))}>
            {s} px
          </button>
        ))}
        <button className="pg-btn" style={{ height: 40, borderColor: hd ? "var(--signal)" : undefined }} onClick={() => setHd(true)}>
          HD
        </button>
      </div>
    </main>
  );
}
