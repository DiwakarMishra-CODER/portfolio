import type { CSSProperties, ReactNode } from "react";
import type { Rect } from "../board/geom";

import { place } from "./place";
import { T, at } from "../timeline";

const FPC_W = 9.2; // cable width (mm)

type Props = {
  id: string;
  n: string;
  /** Module and connector, on the landscape board and the portrait one. */
  rect: Rect;
  zif: Rect;
  rectP: Rect;
  zifP: Rect;
  title: string;
  note: string;
  live: string;
  part: string;
  /** Placing order during the opening (0 = first). */
  seat: number;
  children: ReactNode;
};

/** A display module mounted on the board: carrier PCB, screen glass with the
 *  live screen behind it, and an amber FPC running up into its ZIF connector
 *  (whose latch closes over the cable). */
export default function DisplayModule({ id, n, rect, zif, rectP, zifP, title, note, live, part, seat, children }: Props) {
  const lag = seat * 70;
  // The cable runs from under the connector's latch into the module's top edge.
  const fpc = (r: Rect, z: Rect): Rect => ({ x: z.x + z.w / 2 - FPC_W / 2, y: z.y + 1.4, w: FPC_W, h: r.y + 1.6 - (z.y + 1.4) });
  // The driver chip sits where the cable meets the glass (mm from the module's left edge).
  const driver = (r: Rect, z: Rect) => z.x + z.w / 2 - r.x - 3.5;
  return (
    <>
      <div className="part fpc" style={place(fpc(rect, zif), fpc(rectP, zifP), { "--hgt": 0.8, ...at(T.fpc + lag) })} aria-hidden="true" />
      <div className="part elev zif drop" style={place(zif, zifP, { "--hgt": 1.6, ...at(T.zif + lag) })} aria-hidden="true">
        <span className="zif-tab" style={{ left: "calc(-0.4 * var(--mm))" }} />
        <span className="zif-tab" style={{ right: "calc(-0.4 * var(--mm))" }} />
        <span className="zif-latch" style={at(T.latch + lag) as CSSProperties} />
      </div>
      <div id={id} className="part elev ds drop" style={place(rect, rectP, { "--hgt": 6, "--drv-l": driver(rect, zif), "--drv-p": driver(rectP, zifP), ...at(seat ? T.ds2 : T.ds1) })} data-part={part}>
        <div className="ds-carrier">
          <span className="ds-driver" aria-hidden="true" />
          {/* Four standoff screws at the carrier's corners. */}
          {[
            { left: "calc(0.35 * var(--mm))", top: "calc(0.35 * var(--mm))" },
            { right: "calc(0.35 * var(--mm))", top: "calc(0.35 * var(--mm))" },
            { left: "calc(0.35 * var(--mm))", bottom: "calc(0.95 * var(--mm))" },
            { right: "calc(0.35 * var(--mm))", bottom: "calc(0.95 * var(--mm))" },
          ].map((pos, i) => (
            <span key={i} className="ds-screw" style={pos} aria-hidden="true" />
          ))}
          <div className="ds-glass">
            <div className="ds-active">{children}</div>
            {/* The panel before it's powered: black glass, backlight off. */}
            <span className="ds-off" style={at(seat ? T.boot2 : T.boot1) as CSSProperties} aria-hidden="true" />
          </div>
          <p className="ds-caption hb-caption">
            <span>
              Project {n} · <b>{title}</b>
              <span className="ds-note"> — {note}</span>
            </span>
            <span className="ds-actions">
              <a href={`#${id === "ds1" ? "starweave" : "arthouse"}`} className="ds-act" style={{ "--hint-i": id === "ds1" ? 5 : 7 } as CSSProperties}>
                How it works <span className="ds-arrow">↓</span>
              </a>
              <a href={live} target="_blank" rel="noreferrer" className="ds-act" style={{ "--hint-i": id === "ds1" ? 6 : 8 } as CSSProperties}>
                Live site <span className="ds-arrow">↗</span>
              </a>
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
