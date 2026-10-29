"use client";

import { toggleXRay, useXRayOn } from "@/components/xray/XRay";
import { LANDSCAPE as L } from "../board/spec";
import { PORTRAIT as P } from "../board/spec-phone";
import { place } from "./place";
import { T, at } from "../timeline";

/** SW5 — a DIP switch that turns X-ray mode on and off (also the X key). */
export default function DipSwitch() {
  const on = useXRayOn();
  return (
    <button
      type="button"
      className="part elev dip drop"
      style={place(L.DIP, P.DIP, { "--hgt": 2.6, "--hint-i": 4, ...at(T.dip) })}
      aria-pressed={on}
      onClick={() => toggleXRay()}
      title="X-ray: see how this page is built (key X)"
      data-part="SW5 · X-ray switch"
    >
      <span className="dip-body" aria-hidden="true" />
      <span className="dip-slot" aria-hidden="true">
        <span className="dip-knob" />
      </span>
      <span className="dip-label hb-caption">
        <b>X-ray</b>
        <br />
        see how it&apos;s built
      </span>
    </button>
  );
}
