import type { CSSProperties } from "react";
import type { Rect } from "../board/geom";

/** Inline style placing an HTML part on both boards, in millimetres:
 *  `l` on the landscape board (desktop), `p` on the portrait one (phones).
 *  CSS picks one set (board.css: --x = --xl or --xp). */
export const place = (l: Rect, p: Rect, extra: Record<string, string | number> = {}) =>
  ({ "--xl": l.x, "--yl": l.y, "--wl": l.w, "--hl": l.h, "--xp": p.x, "--yp": p.y, "--wp": p.w, "--hp": p.h, ...extra }) as CSSProperties;
