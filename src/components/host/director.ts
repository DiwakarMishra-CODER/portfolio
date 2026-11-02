// What the host does when you play with him: which move and which line for
// each poke, the poke counter, the one-time hints (remembered across visits,
// so a returning visitor isn't told twice), and his greeting (he remembers
// how often you've been here, and whether you threw him last time). No DOM,
// no three; only storage.
import { QUIP } from "@/data/host-lines";
import type { ClipName } from "./engine/rig";

export type Move = ClipName | "spin";

/** A landing faster than this (px/s) is a hard one: a longer squash, a different line. */
export const HARD_LANDING = 1800;
export type Reaction = { move: Move; line: string };

const remembered = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};
const remember = (key: string, value = "1", store: "localStorage" | "sessionStorage" = "localStorage") => {
  try {
    window[store].setItem(key, value);
  } catch {
    // Private mode: the hint may show again next time. Harmless.
  }
};
const read = (key: string, store: "localStorage" | "sessionStorage" = "localStorage") => {
  try {
    return window[store].getItem(key);
  } catch {
    return null;
  }
};

export function createDirector() {
  let pokes = 0;
  let bag: Reaction[] = [];
  let last: Reaction | null = null;

  const draw = (): Reaction => {
    if (bag.length === 0) {
      bag = [...QUIP.bag].map((r) => ({ ...r }) as Reaction).sort(() => Math.random() - 0.5);
      if (bag[bag.length - 1].line === last?.line) bag.unshift(bag.pop()!);
    }
    last = bag.pop()!;
    return last;
  };

  return {
    get pokes() {
      return pokes;
    },
    poke(): Reaction {
      pokes += 1;
      if (pokes === 1) return { move: "surprised", line: QUIP.first };
      const counted = QUIP.count[pokes];
      if (counted) return { move: "think", line: counted };
      return draw();
    },
    /** True the first time ever for this hint; marks it shown. */
    firstTime(hint: "poke" | "lift") {
      const key = `host.hint.${hint}`;
      if (remembered(key)) return false;
      remember(key);
      return true;
    },
    /** He was thrown (he'll mention it next visit). */
    thrown() {
      remember("host.thrown");
    },
    /**
     * What he says as you arrive, once per visit (a visit is a browser tab's
     * session; reloading doesn't count again): a returning visitor hears that
     * first, a first-timer maybe the time of day. Null: nothing to say.
     */
    greeting(now = new Date()): string | null {
      if (read("host.greeted", "sessionStorage")) return null;
      let line = read("host.greeting", "sessionStorage");
      if (line === null) {
        const visits = Number(read("host.visits") ?? 0) + 1;
        remember("host.visits", String(visits));
        const thrown = remembered("host.thrown");
        remember("host.thrown", "0");
        const g = QUIP.greet;
        const h = now.getHours();
        const weekend = now.getDay() === 0 || now.getDay() === 6;
        if (visits >= 2) line = thrown ? g.thrown : visits === 2 ? g.back : visits === 3 ? g.third : g.regular;
        else line = h < 5 ? g.late : weekend ? g.weekend : h < 11 ? g.morning : "";
        remember("host.greeting", line, "sessionStorage");
      }
      return line || null;
    },
    /** The greeting was actually said. */
    greeted() {
      remember("host.greeted", "1", "sessionStorage");
    },
    landing(speed: number) {
      if (speed > HARD_LANDING) return QUIP.landHard;
      return QUIP.land[Math.floor(Math.random() * QUIP.land.length)];
    },
  };
}
