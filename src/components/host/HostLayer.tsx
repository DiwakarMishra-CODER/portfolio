"use client";

// Brings the host to life. The page already shows him as a still (the
// poster, server-rendered) with a button over him; this wires the button
// (pokes, the hint, picking him up), decides whether to animate him at all,
// and loads the 3D engine (the only code that imports three) after the page
// is up: at once on desktop, so his eyes find the cursor in the first second;
// after load and an idle moment on touch screens.
//
// He stays a still under reduced motion, Save-Data, ≤ 2 GB of memory, no
// WebGL2, or if the GPU drops the context; pokes still get a reply then.
// Everything here runs in effects, never during render.
//
// Once he's animated he walks the page with you: each section that has a
// stop for him ([data-host-stop]: the hero, the Starweave room's lane) takes
// him when it's the one you're reading. He drops in, says that part's lines
// as you reach them ([data-host-cue]), and reacts to what you do there
// (the "host:react" events the rooms send). In a room's lane his bubble is a
// conversation: each line stays until the next replaces it (a quip shows for
// a moment, then the conversation's last line comes back). In a dark room
// ([data-host-dark]) his outline turns pale so the navy suit reads. When a
// room shows something in his column ([data-held-slot] [data-held]: Starweave's
// proof, Arthouse's ticket) he holds it up.
//
// Nightfall ([data-nightfall], between the hero and the Starweave room): as
// the stars come out he looks up, then flies, scrubbed by the scroll, from the
// hero's floor up through the dusk and down into the room's stop (and back,
// scrolling up). Nothing is pinned; a fast scroll just lands him.
import { useEffect } from "react";
import { CUE, GUIDE, QUIP, REACT, STORY, type Spot } from "@/data/host-lines";
import type { Engine } from "./engine/engine";
import { createDirector, HARD_LANDING, type Reaction } from "./director";
import type { ClipName } from "./engine/rig";
import { fly, follow, release, type Body } from "./physics";
import { createSound } from "./sound";

const SAY_MS = 2600;
const GREET_AFTER_MS = 1200;
const HINT_AFTER_MS = 5200;
// Left alone, he fidgets (no words), and after a while dozes off. He says
// at most one thing unprompted a minute, and only while you can see him.
const FIDGET_AFTER_MS = 10_000;
const SLEEP_AFTER_MS = 120_000;
const QUIET_MS = 60_000;
const AWAY_MS = 30_000; // away from the tab this long, and he notices you're back
const FIDGETS: ClipName[] = ["glasses", "watch", "stretch", "look", "shift"];
const WALK_SPEED = 240; // px/s, back to his spot after a toss
const RUN_SPEED = 600; // px/s, when he was thrown far
const RUN_FROM = 320; // px from home: farther than this, he runs, then walks the last bit
const WALK_LAST = 110;
const STORY_MS = 3800; // in a room, his story line is read before the room's first cue
const INK = "#141413";
const PALE = "#f3ead8"; // his outline in a dark room

/** Convex hull of a few points (the beam: the lens and the screen's corners). */
function hull(points: number[][]) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: number[][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: number[][] = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

export default function HostLayer() {
  useEffect(() => {
    const homeSpot = document.querySelector<HTMLElement>('[data-host-spot="hero"]');
    const hit = homeSpot?.querySelector<HTMLButtonElement>(".host-hit");
    const said = document.querySelector<HTMLElement>('[data-host-said="hero"]');
    if (!homeSpot || !hit) return;
    let spot = homeSpot; // where he is now

    const director = createDirector();
    const sound = createSound();
    const soundSwitch = document.querySelector<HTMLButtonElement>("[data-host-sound]");
    const showSound = () => {
      if (!soundSwitch) return;
      soundSwitch.setAttribute("aria-pressed", String(sound.on));
      soundSwitch.lastChild!.textContent = sound.on ? "Sound on" : "Sound off";
    };
    const onSoundSwitch = () => {
      sound.set(!sound.on);
      showSound();
    };
    showSound();
    soundSwitch?.addEventListener("click", onSoundSwitch);
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const still =
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !!nav.connection?.saveData ||
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
      !document.createElement("canvas").getContext("webgl2");

    let engine: Engine | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let zzz: HTMLElement | null = null;
    let io: IntersectionObserver | null = null;
    let cancelled = false;
    const timers = new Set<number>();
    const after = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    // ── Talking: a line in his own bubble, then it goes ─────────────────────
    // At a lane stop his bubble is the lane's own; elsewhere it's the section's
    // printed bubble, where the line shows over his story line for a moment.
    const bubbleAt = (s: HTMLElement) => {
      const lane = s.closest("[data-host-lane]")?.querySelector<HTMLElement>(".host-bubble");
      if (lane) return { el: lane, on: "is-on", text: lane };
      const fig = document.querySelector<HTMLElement>(`[data-host-said="${s.dataset.hostSpot}"]`);
      return fig ? { el: fig, on: "is-quipping", text: fig.querySelector<HTMLElement>(".host-quip") } : null;
    };
    // ms = 0: a line of the conversation, kept until the next one (lanes
    // only; elsewhere it shows for a long moment, over the story line).
    let sayTimer = 0;
    let said_ = 0; // lines said so far, so a delayed line can tell it was overtaken
    const kept = new Map<HTMLElement, string>(); // each spot's last kept line
    const show = (b: NonNullable<ReturnType<typeof bubbleAt>>, line: string) => {
      b.text!.textContent = line;
      b.el.classList.remove(b.on);
      void b.el.offsetWidth; // restart the entrance
      b.el.classList.add(b.on);
    };
    const say = (line: string, ms = SAY_MS) => {
      const b = bubbleAt(spot);
      if (!b?.text) return;
      said_++;
      show(b, line);
      clearTimeout(sayTimer);
      const lane = b.on === "is-on";
      if (ms === 0 && lane) return void kept.set(spot, line);
      const at = spot;
      sayTimer = window.setTimeout(() => {
        const back = lane && kept.get(at);
        if (back && at === spot) show(b, back);
        else b.el.classList.remove(b.on);
      }, ms || 6000);
    };

    // A greeting: added as the bubble's first line, above his story line, and
    // left there (swapping the story line out and back reads like a glitch).
    const greet = (line: string) => {
      const quote = said?.querySelector("blockquote");
      if (!quote) return;
      let p = quote.querySelector<HTMLElement>(".host-greet");
      if (!p) {
        p = document.createElement("p");
        p.className = "host-greet";
        quote.prepend(p);
      }
      p.textContent = line;
      p.classList.remove("is-new");
      void p.offsetWidth; // restart the entrance
      p.classList.add("is-new");
    };

    // Something he says unprompted: at most one a minute, only when visible.
    let onScreen = true;
    let lastRemark = -Infinity;
    const remark = (line: string, show: (line: string) => void = greet) => {
      const now = performance.now();
      if (!onScreen || document.hidden || now - lastRemark < QUIET_MS) return false;
      lastRemark = now;
      show(line);
      return true;
    };

    // ── Left alone: fidgets, then a nap ───────────────────────────────────
    let lastTouch = performance.now();
    let nextFidget = lastTouch + FIDGET_AFTER_MS;
    let lastFidget: ClipName | null = null;
    let asleep = false;
    const touch = () => {
      lastTouch = performance.now();
      nextFidget = lastTouch + FIDGET_AFTER_MS;
    };
    const wake = () => {
      asleep = false;
      spot.classList.remove("is-asleep");
      engine?.stopSmall(0.3);
    };
    const idle = () => {
      if (!engine || phase !== "home" || asleep || !onScreen || document.hidden || engine.isOn("hold") || engine.isOn("crank")) return;
      const now = performance.now();
      if (now - lastTouch > SLEEP_AFTER_MS) {
        asleep = true;
        spot.classList.add("is-asleep");
        engine.play("sleep");
        after(1700, () => asleep && engine?.play("snore", { loop: true }));
      } else if (now > nextFidget) {
        const pick = FIDGETS.filter((f) => f !== lastFidget);
        lastFidget = pick[Math.floor(Math.random() * pick.length)];
        engine.play(lastFidget);
        nextFidget = now + 9000 + Math.random() * 6000;
      }
    };
    const idleTimer = window.setInterval(idle, 1000);

    // ── Holding up the proof ──────────────────────────────────────────────
    // A room's column can show a proof (a clipping) by his raised hand; he
    // holds it while it's there, and lowers his arm when it goes. Any
    // whole-body move drops it, so after one he picks it back up.
    const proofShown = () => !!spot.closest("[data-host-lane]")?.querySelector("[data-held-slot] [data-held]:not(.is-sealed)");
    const rehold = (ms = 0) =>
      after(ms, () => {
        if (!engine || phase !== "home" || asleep) return;
        if (proofShown()) engine.play("hold");
        else if (engine.isOn("hold")) engine.stopSmall(0.3);
      });

    // ── Pokes ─────────────────────────────────────────────────────────────
    let hinted = false;
    let justDragged = false;
    const act = (r: Reaction) => {
      if (r.move === "spin") engine?.spin();
      else engine?.play(r.move);
    };
    const onClick = () => {
      if (justDragged) return;
      hinted = true;
      touch();
      if (asleep) {
        wake();
        engine?.play("surprised");
        sound.poke();
        say(QUIP.wake);
        return;
      }
      const r = director.poke();
      sound.poke();
      say(r.line);
      act(r);
      rehold(2200);
      if (director.pokes === 2 && engine && director.firstTime("lift")) after(SAY_MS + 200, () => say(QUIP.hintLift));
    };
    hit.addEventListener("click", onClick);

    // The first time the cursor finds him, he notices; then he can be grabbed.
    let noticed = false;
    let grabTimer = 0;
    const onEnter = () => {
      touch();
      if (!noticed && engine && !asleep) {
        noticed = true;
        engine.play("surprised");
      }
      grabTimer = window.setTimeout(() => engine && hit.classList.add("is-grab"), 400);
    };
    const onLeave = () => {
      clearTimeout(grabTimer);
      hit.classList.remove("is-grab");
    };
    hit.addEventListener("pointerenter", onEnter);
    hit.addEventListener("pointerleave", onLeave);

    // The hint: a few quiet seconds on the first screen, never poked, once ever.
    const onScroll = () => {
      if (window.scrollY > 40) hinted = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    after(HINT_AFTER_MS, () => {
      if (!hinted && window.scrollY < 40 && director.firstTime("poke")) {
        lastRemark = performance.now();
        say(QUIP.hintPoke, 3400);
      }
    });
    // Hello, once a visit: a returning visitor, or the time of day.
    after(GREET_AFTER_MS, () => {
      const line = director.greeting();
      if (line && remark(line)) {
        director.greeted();
        engine?.play("wave");
      }
    });
    // Back on the tab after a while away.
    let hiddenAt = 0;
    const onTab = () => {
      if (document.hidden) hiddenAt = performance.now();
      else if (hiddenAt && performance.now() - hiddenAt > AWAY_MS && !asleep && phase === "home") {
        after(600, () => remark(QUIP.back) && engine?.play("wave"));
      }
    };
    document.addEventListener("visibilitychange", onTab);

    // ── Picking him up (only when he's animated) ──────────────────────────
    const body: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    let phase: "home" | "held" | "air" | "landing" | "walk" | "flight" | "film" = "home";
    let running = false;
    let bumped = false;
    let tosses: number[] = [];
    let press: { id: number; x: number; y: number; t: number; touch: boolean; holdTimer: number } | null = null;
    let samples: { t: number; x: number; y: number }[] = [];
    let grabAt = { x: 0, y: 0 };
    let loop = 0;
    let last = 0;
    let lastStep = 0;

    const place = () => {
      const t = `translate(${body.x.toFixed(1)}px, ${body.y.toFixed(1)}px)`;
      if (canvas) canvas.style.transform = t;
      hit.style.transform = t;
      // His bubble goes with him; away from his spot it only shows what he's
      // saying right now (his story line waits for him back home).
      const b = bubbleAt(spot);
      if (b) {
        b.el.style.translate = phase === "home" ? "" : `${body.x.toFixed(1)}px ${body.y.toFixed(1)}px`;
        b.el.classList.toggle("is-away", phase !== "home");
      }
      // The ground's light follows him (Ground.tsx).
      window.dispatchEvent(new Event("hostmove"));
    };
    // He can fly anywhere on screen; his feet come down on his spot's floor.
    const bounds = () => {
      const r = spot.getBoundingClientRect();
      const reach = r.width * 0.3;
      return { left: -r.left - reach + 8, right: window.innerWidth - r.right + reach - 8, top: -r.top - r.height * 0.15, floor: 0 };
    };
    const home = () => {
      Object.assign(body, { x: 0, y: 0, vx: 0, vy: 0 });
      phase = "home";
      touch();
      place();
      engine?.face(0);
      engine?.lean(0);
      engine?.play("idle");
      engine?.setFast(false);
      rehold(500);
    };
    const tick = (now: number) => {
      const dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016);
      last = now;
      if (phase === "held" && samples.length) {
        const p = samples[samples.length - 1];
        follow(body, p.x - grabAt.x, p.y - grabAt.y, dt);
        engine?.lean(-body.vx / 3000);
      } else if (phase === "air") {
        engine?.lean(-body.vx / 4000);
        const vx = body.vx;
        const landed = fly(body, dt, bounds());
        // Off the side of the screen, hard: a bump, then back to flailing.
        if (!bumped && Math.abs(vx) > 500 && Math.sign(body.vx) !== Math.sign(vx)) {
          bumped = true;
          engine?.play("bump");
          sound.land(700);
          say(QUIP.bump, 1200);
          after(450, () => phase === "air" && engine?.play("fall"));
        }
        if (landed !== null) {
          phase = "landing";
          engine?.lean(0);
          const hard = landed > HARD_LANDING;
          // Three tosses in quick succession and the room spins.
          tosses = tosses.filter((t) => now - t < 15_000);
          const dizzy = tosses.length >= 3;
          if (dizzy) tosses = [];
          engine?.play("land");
          sound.land(landed);
          say(dizzy ? QUIP.dizzy : director.landing(landed));
          const settle = hard ? 700 : 520;
          if (dizzy) after(settle, () => phase === "landing" && engine?.play("dizzy"));
          // After the squash (and a sway, if dizzy), walk home (or just stand, if he landed there).
          after(settle + (dizzy ? 2500 : 0), () => {
            if (phase !== "landing") return;
            if (Math.abs(body.x) < 4) return home();
            phase = "walk";
            running = Math.abs(body.x) > RUN_FROM;
            engine?.face(body.x > 0 ? -1 : 1);
            engine?.play(running ? "run" : "walk", { loop: true });
          });
        }
      } else if (phase === "walk") {
        if (running && Math.abs(body.x) < WALK_LAST) {
          running = false;
          engine?.play("walk", { loop: true });
        }
        body.x -= Math.sign(body.x) * Math.min(Math.abs(body.x), (running ? RUN_SPEED : WALK_SPEED) * dt);
        if (now - lastStep > (running ? 110 : 150)) {
          lastStep = now;
          sound.step();
        }
        if (Math.abs(body.x) < 1) home();
      }
      place();
      if (phase !== "home") loop = requestAnimationFrame(tick);
    };
    const run = () => {
      cancelAnimationFrame(loop);
      last = 0;
      loop = requestAnimationFrame(tick);
    };

    const lift = () => {
      if (!press || !engine) return;
      touch();
      if (asleep) wake();
      phase = "held";
      grabAt = { x: press.x - body.x, y: press.y - body.y };
      samples = [{ t: press.t, x: press.x, y: press.y }];
      hit.classList.add("is-held");
      document.documentElement.classList.add("is-holding-host");
      engine.face(0);
      engine.setFast(true);
      engine.play("held", { loop: true });
      sound.lift();
      say(QUIP.lifted, 1600);
      run();
    };
    const onDown = (e: PointerEvent) => {
      if (!engine || e.button > 0) return;
      hit.setPointerCapture(e.pointerId);
      const touch = e.pointerType !== "mouse";
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), touch, holdTimer: 0 };
      if (touch) press.holdTimer = window.setTimeout(lift, 250);
    };
    const onMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      if (phase === "held") {
        samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
        if (samples.length > 12) samples.shift();
        return;
      }
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
      if (press.touch && moved > 10) clearTimeout(press.holdTimer);
      else if (!press.touch && moved > 4 && phase !== "air") lift();
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      clearTimeout(press.holdTimer);
      press = null;
      if (phase !== "held") return;
      samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
      Object.assign(body, release(samples));
      phase = "air";
      bumped = false;
      tosses.push(performance.now());
      director.thrown();
      hit.classList.remove("is-held");
      document.documentElement.classList.remove("is-holding-host");
      engine?.play("fall");
      // The click that ends a drag isn't a poke.
      justDragged = true;
      after(0, () => (justDragged = false));
    };
    hit.addEventListener("pointerdown", onDown);
    hit.addEventListener("pointermove", onMove);
    hit.addEventListener("pointerup", onUp);
    hit.addEventListener("pointercancel", onUp);

    // ── Walking the page with you ─────────────────────────────────────────
    // The stop whose section is across the reading line (45% down the
    // screen) takes him; a stop hidden at this width (display: none) never does.
    const stops = () => [...document.querySelectorAll<HTMLElement>("[data-host-stop]")].filter((s) => s.offsetParent !== null);
    const current = () => {
      const line = window.innerHeight * 0.45;
      return stops().find((s) => {
        const r = (s.closest("section, header") ?? s).getBoundingClientRect();
        return r.top <= line && r.bottom >= line;
      });
    };
    let arrivedAt = 0;
    const told = new Set<string>(); // rooms whose story he has said this visit
    const moveTo = (next: HTMLElement, { flown = false } = {}) => {
      if (!engine || !canvas) return;
      const from = spot;
      arrivedAt = performance.now();
      engine.outline(next.closest("[data-host-dark]") ? PALE : INK, next.closest("[data-host-dark]") ? 0.011 : undefined);
      if (asleep) wake();
      bubbleAt(from)?.el.classList.remove("is-on", "is-quipping");
      from.classList.remove("is-live");
      from.classList.toggle("is-empty", from === homeSpot);
      spot = next;
      next.classList.remove("is-empty");
      next.append(canvas, zzz!, hit);
      // In the cinema he stands at the projector; anywhere else it's put away.
      engine.projector(!!next.closest(".ld"));
      next.classList.add("is-live");
      engine.refit();
      io?.disconnect();
      io?.observe(next);
      engine.setActive(true);
      // He drops in from above and lands (or, arriving by air, just lands).
      if (flown) engine.play("land");
      else if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        engine.play("fall");
        canvas.animate([{ translate: "-50% -160px", opacity: 0 }, { translate: "-50% 0", opacity: 1 }], { duration: 380, easing: "cubic-bezier(0.55, 0, 1, 0.45)" });
        after(380, () => engine?.play("land"));
      }
      rehold(1100);
      touch();
      window.dispatchEvent(new Event("hostmove"));
      // In a lane: first time in, the room's story (the page prints it only
      // where there's no lane); coming back, where the conversation was.
      const name = next.dataset.hostSpot as Spot;
      if (next.closest("[data-host-lane]")) {
        const back = kept.get(next);
        if (back) after(400, () => spot === next && say(back, 0));
        else if (!told.has(name) && STORY[name]) {
          told.add(name);
          after(400, () => spot === next && say(STORY[name].join(" "), 0));
        }
      } else arrivedAt = 0;
    };
    // ── Trips: scrubbed by the scroll, between two stops ──────────────────
    // A trip carries him in a fixed box of his own along a curve on screen,
    // its progress p (0 → 1) read from the page's position, so scrolling back
    // takes him back. Nothing is pinned; a fast scroll just lands him.
    //   Nightfall: he flies from the hero up through the dusk into Starweave.
    //   Walk-in:   he walks down from Starweave's lane, toward you, carrying a
    //              film reel under a follow-spot, to the projector, and loads it.
    //   Into the film: from the projector he's swept along the beam into the
    //              screen (gone, in a flash), and steps out in Arthouse's room.
    type Pt = { x: number; y: number; k: number };
    type Trip = {
      from: () => HTMLElement | undefined;
      to: () => HTMLElement | undefined;
      p: () => number;
      /** His feet on screen and his scale (relative to the box) at p. */
      at: (p: number) => Pt;
      /** The spot whose size the box takes. */
      box: () => HTMLElement;
      start: (p: number) => void;
      frame?: (p: number, pt: Pt) => void;
      arrive: (end: "from" | "to") => void;
    };
    const flightBox = document.createElement("div");
    flightBox.className = "host-flight";
    flightBox.setAttribute("aria-hidden", "true");
    const followSpot = document.createElement("div");
    followSpot.className = "host-followspot";
    followSpot.setAttribute("aria-hidden", "true");
    let trip: Trip | null = null;
    let lastX = 0;
    let lastDust = { x: 0, y: 0 };
    let leanTimer = 0;
    let nightSaid = false;
    let gazing = false;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const ease = (t: number) => t * t * (3 - 2 * t);
    const box = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.bottom, w: r.width, h: r.height };
    };

    // Nightfall.
    const band = document.querySelector<HTMLElement>("[data-nightfall]");
    const nightD = () => band!.getBoundingClientRect().height + 0.6 * innerHeight;
    const nightTo = () => stops().find((s) => band?.nextElementSibling?.contains(s));
    const nightfall: Trip = {
      from: () => homeSpot,
      to: nightTo,
      // From the band's top 75% down the screen (he's on the hero's floor) to
      // the room's top 15% down (his stop in view).
      p: () => (0.75 * innerHeight - band!.getBoundingClientRect().top) / nightD(),
      at: (p) => {
        const D = nightD();
        const a = box(homeSpot);
        const b = box(nightTo()!);
        const A = { x: a.x, y: a.y + p * D };
        const B = { x: b.x, y: b.y - (1 - p) * D };
        const apex = Math.max(0.42 * innerHeight, flightBox.offsetHeight * 0.92 + 0.06 * innerHeight);
        const C = { x: (A.x + B.x) / 2 - 80, y: (apex - 0.25 * (A.y + B.y)) / 0.5 };
        const u = 1 - p;
        return { x: u * u * A.x + 2 * u * p * C.x + p * p * B.x, y: u * u * A.y + 2 * u * p * C.y + p * p * B.y, k: 1 + (b.w / a.w - 1) * p };
      },
      box: () => homeSpot,
      start: () => {
        // Flying, not running: his idle under a superhero pose, the cape out.
        engine!.play("idle");
        engine!.play("soar");
        engine!.cape(true);
        canvas!.style.transformOrigin = "50% 100%";
        canvas!.animate([{ scale: "1 1" }, { scale: "1.1 0.84" }, { scale: "0.92 1.12" }, { scale: "1 1" }], { duration: 420, easing: "ease-out" });
      },
      frame: (_p, pt) => {
        // Star dust off his heels.
        if (Math.hypot(pt.x - lastDust.x, pt.y - lastDust.y) > 7) {
          lastDust = { x: pt.x, y: pt.y };
          dust(pt.x, pt.y - 8);
          dust(pt.x, pt.y - 30);
        }
      },
      arrive: (end) => moveTo(end === "from" ? homeSpot : nightTo()!, { flown: true }),
    };

    // The cinema's stop, its stage and screen.
    const ld = document.querySelector<HTMLElement>(".ld");
    const ldStage = ld?.querySelector<HTMLElement>(".ld-stage");
    const ldScreen = ld?.querySelector<HTMLElement>(".ld-screen");
    const ldBeam = ld?.querySelector<HTMLElement>(".ld-beam");
    const ldSpot = ld?.querySelector<HTMLElement>("[data-host-stop]");
    const ldProp = ld?.querySelector<HTMLImageElement>(".ld-prop");
    const swRoom = document.querySelector<HTMLElement>("#starweave");
    const swStop = () => stops().find((s) => swRoom?.contains(s));
    const ahStop = () => stops().find((s) => s.closest("#arthouse"));
    /** The still projector beside his spot: empty, or with the reel he brought. */
    const propStill = (loaded: boolean) => ldProp && (ldProp.src = `/host/projector-${loaded ? "loaded" : "empty"}.webp`);
    /** Where he stands in the cinema once its stage is held (sticky at the top). */
    const ldFeet = () => {
      const s = ldSpot!.getBoundingClientRect();
      const st = ldStage!.getBoundingClientRect();
      // He stands right of the spot's middle (the camera is shifted to fit the projector).
      return { x: s.left + s.width / 2 + s.height * 0.17, y: s.bottom - st.top, h: s.height };
    };
    /** Where a lane stop's feet sit while its lane is held (sticky, 92px down). */
    const laneFeet = (el: HTMLElement, p: number, D: number) => {
      const r = el.getBoundingClientRect();
      const inner = el.closest<HTMLElement>(".room-lane-inner");
      if (inner && getComputedStyle(inner).position === "sticky") return { x: r.left + r.width / 2, y: 92 + (r.bottom - inner.getBoundingClientRect().top), h: r.height };
      // Not held (a phone's inline stop, far up the room by now): he comes in
      // from the top edge of the screen.
      return { x: r.left + r.width / 2, y: Math.max(r.bottom + p * D, r.height * 0.15), h: r.height };
    };

    // Walk-in: from the end of Starweave's room (its bottom 95% down) to the
    // cinema's stage being held (its top at the top of the screen).
    const walkD = () => 0.95 * innerHeight;
    const walkIn: Trip = {
      from: swStop,
      to: () => ldSpot ?? undefined,
      p: () => (0.95 * innerHeight - swRoom!.getBoundingClientRect().bottom) / walkD(),
      at: (p) => {
        const a = laneFeet(swStop()!, p, walkD());
        const b = ldFeet();
        const t = ease(p);
        // Scaled from the bigger spot down, never up (a canvas scaled up blurs).
        const base = walkIn.box().offsetHeight;
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), k: lerp(a.h, b.h, t) / base };
      },
      box: () => (ldSpot!.offsetHeight > swStop()!.offsetHeight ? ldSpot! : swStop()!),
      start: () => {
        // Down the aisle toward you, the film under his arm, in a follow-spot.
        propStill(false);
        engine!.carry(true);
        engine!.play("walk", { loop: true });
        document.body.append(followSpot);
      },
      frame: (_p, pt) => {
        const h = flightBox.offsetHeight * pt.k;
        followSpot.style.transform = `translate(${(pt.x - 260).toFixed(0)}px, ${(pt.y - h * 0.62 - 260).toFixed(0)}px) scale(${(0.55 + 0.5 * pt.k).toFixed(3)})`;
      },
      arrive: (end) => {
        followSpot.remove();
        engine!.carry(false);
        if (end === "to") {
          // He slots the reel on and the projector is his.
          propStill(true);
          moveTo(ldSpot!, { flown: true });
          engine!.loadReel(true);
          after(120, inCinema);
        } else moveTo(swStop()!, { flown: true });
      },
    };

    // Into the film: over the last 30% of the cinema's held stage.
    let lensAt: { x: number; y: number } | null = null; // stage-relative, cached while he's at it
    const filmP = () => {
      const r = ld!.getBoundingClientRect();
      const q = -r.top / Math.max(1, r.height - innerHeight);
      return (q - 0.7) / 0.3;
    };
    const intoFilm: Trip = {
      from: () => ldSpot ?? undefined,
      to: ahStop,
      p: filmP,
      at: (p) => {
        const st = ldStage!.getBoundingClientRect();
        const f = ldFeet();
        const sc = ldScreen!.getBoundingClientRect();
        const L = lensAt ?? lensPoint();
        // Up to the lens, then along the beam into the middle of the screen.
        const A = { x: f.x, y: f.y + st.top };
        const C = { x: L.x + st.left, y: L.y + st.top - f.h * 0.2 };
        const B = { x: sc.left + sc.width / 2, y: sc.top + sc.height * 0.62 };
        const u = 1 - p;
        return { x: u * u * A.x + 2 * u * p * C.x + p * p * B.x, y: u * u * A.y + 2 * u * p * C.y + p * p * B.y, k: lerp(1, 0.05, ease(p)) };
      },
      box: () => ldSpot!,
      start: () => {
        // Swept up by the light.
        propStill(true);
        engine!.play("idle");
        engine!.play("soar");
      },
      frame: (p) => {
        canvas!.style.opacity = String(p > 0.8 ? Math.max(0, 1 - (p - 0.8) / 0.2) : 1);
      },
      arrive: (end) => {
        canvas!.style.opacity = "";
        if (end === "from") {
          moveTo(ldSpot!, { flown: true });
          engine!.loadReel(true);
          after(120, inCinema);
        }
      },
    };
    const trips = [nightfall, walkIn, intoFilm];
    const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ready = (t: Trip) => !!(t.from() && t.to());

    const takeoff = (t: Trip, p: number) => {
      if (!engine || !canvas) return;
      phase = "flight";
      trip = t;
      if (asleep) wake();
      bubbleAt(spot)?.el.classList.remove("is-on", "is-quipping");
      engine.gaze(null);
      gazing = false;
      cranking = false;
      engine.projector(false); // a still projector stays behind (.ld-prop)
      spot.classList.remove("is-live");
      homeSpot.classList.add("is-empty");
      const b = t.box();
      flightBox.style.width = `${b.offsetWidth}px`;
      flightBox.style.height = `${b.offsetHeight}px`;
      flightBox.style.visibility = "";
      document.body.append(flightBox);
      flightBox.append(canvas, zzz!);
      hit.style.visibility = "hidden";
      engine.refit();
      engine.setActive(true);
      engine.setFast(true);
      engine.face(0);
      engine.stopSmall(0.12);
      lastX = NaN;
      t.start(p);
    };
    const land = (t: Trip, end: "from" | "to") => {
      if (!engine) return;
      phase = "home";
      trip = null;
      hit.style.visibility = "";
      engine.setFast(false);
      engine.lean(0);
      engine.cape(false);
      t.arrive(end);
      flightBox.remove();
    };
    const travel = (t: Trip, p: number) => {
      if (!engine) return;
      if (p <= 0) return land(t, "from");
      if (p >= 1) {
        // Into the film is a door, not a landing: he's gone into the screen.
        if (t === intoFilm) return enterFilm();
        return land(t, "to");
      }
      const pt = t.at(p);
      flightBox.style.transform = `translate(${(pt.x - flightBox.offsetWidth / 2).toFixed(1)}px, ${(pt.y - flightBox.offsetHeight).toFixed(1)}px) scale(${pt.k.toFixed(3)})`;
      if (!Number.isNaN(lastX)) engine.lean(Math.max(-0.4, Math.min(0.4, -(pt.x - lastX) / 60)));
      lastX = pt.x;
      clearTimeout(leanTimer);
      leanTimer = window.setTimeout(() => engine?.lean(0), 160);
      t.frame?.(p, pt);
      window.dispatchEvent(new Event("hostmove"));
    };
    // Gone into the screen: a flash on it; he's hidden until the room comes.
    const enterFilm = () => {
      phase = "film";
      flightBox.style.visibility = "hidden";
      ldScreen?.querySelector(".ld-flash")?.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 650, easing: "ease-out" });
    };
    // Out of the film, into Arthouse's room: a flash where he stands.
    const leaveFilm = (to: HTMLElement) => {
      phase = "home";
      trip = null;
      hit.style.visibility = "";
      engine!.setFast(false);
      canvas!.style.opacity = "";
      moveTo(to, { flown: true });
      flightBox.remove();
      canvas!.animate([{ scale: "0.3", opacity: 0, filter: "brightness(3)" }, { scale: "1", opacity: 1, filter: "brightness(1)" }], { duration: 520, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    };
    const DUST = ["#f0c97a", "#8fd0ff", "#f3efff", "#ff9fc4"];
    const dust = (x: number, y: number) => {
      const d = document.createElement("i");
      d.className = "host-dust";
      d.style.left = `${(x + (Math.random() - 0.5) * 26).toFixed(0)}px`;
      d.style.top = `${(y + (Math.random() - 0.5) * 10).toFixed(0)}px`;
      d.style.setProperty("--c", DUST[Math.floor(Math.random() * DUST.length)]);
      document.body.append(d);
      d.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.2, translate: `0 ${10 + Math.random() * 18}px` }], { duration: 1100 + Math.random() * 700, easing: "ease-out" }).onfinish = () => d.remove();
    };
    // The stars are coming out: he looks up at them (and says so, once).
    const lookUp = (on: boolean) => {
      if (!engine || on === gazing) return;
      gazing = on;
      const r = spot.getBoundingClientRect();
      engine.gaze(on ? { x: r.left + r.width * 0.3, y: -innerHeight * 0.6 } : null);
      if (on && !nightSaid) {
        nightSaid = true;
        say(QUIP.night, 3600);
      }
    };

    // ── The cinema (the lights going down before Arthouse) ────────────────
    // While he's at the projector: the reels turn with the scroll, he cranks
    // while it runs, the lamp catches at the point the beam flickers on (the
    // CSS does the light). The beam runs from the lens (the live one, or the
    // still's when he isn't at it) to the screen's corners.
    let cranking = false;
    const lensPoint = () => {
      const st = ldStage!.getBoundingClientRect();
      const live = engine?.lens();
      if (live && spot === ldSpot && phase === "home") return (lensAt = { x: live.x - st.left, y: live.y - st.top });
      // The still: its lens tip sits at (14.5%, 39%) of the image.
      const r = (ldProp ?? ldSpot!).getBoundingClientRect();
      return { x: r.left + r.width * 0.145 - st.left, y: r.top + r.height * 0.39 - st.top };
    };
    const aimBeam = () => {
      if (!ldStage || !ldScreen || !ldBeam || !ldSpot) return;
      const L = lensPoint();
      const st = ldStage.getBoundingClientRect();
      const sc = ldScreen.getBoundingClientRect();
      const pts = [
        [L.x, L.y],
        [sc.left - st.left, sc.top - st.top],
        [sc.right - st.left, sc.top - st.top],
        [sc.right - st.left, sc.bottom - st.top],
        [sc.left - st.left, sc.bottom - st.top],
      ];
      ldBeam.style.clipPath = `polygon(${hull(pts).map(([x, y]) => `${x.toFixed(0)}px ${y.toFixed(0)}px`).join(", ")})`;
    };
    const inCinema = () => {
      if (!engine || !ld) return;
      const r = ld.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
      engine.reel(p * 36, p > 0.2);
      const run = p > 0.04 && p < 0.97 && phase === "home";
      if (run && !cranking) engine.play("crank", { loop: true });
      if (!run && cranking) engine.stopSmall(0.3);
      cranking = run;
      aimBeam();
    };

    let walkRaf = 0;
    const onWalk = () => {
      cancelAnimationFrame(walkRaf);
      walkRaf = requestAnimationFrame(() => {
        if (ld) aimBeam();
        if (engine && canvas && !reduced()) {
          if (phase === "flight" && trip) return travel(trip, trip.p());
          if (phase === "film") {
            const p = filmP();
            if (p < 1) {
              // Back out of the screen, toward the projector.
              phase = "flight";
              trip = intoFilm;
              flightBox.style.visibility = "";
              return travel(intoFilm, p);
            }
            const to = ahStop();
            if (to && current() === to) leaveFilm(to);
            return;
          }
          if (phase === "home") {
            for (const t of trips) {
              if (!ready(t)) continue;
              const p = t.p();
              // (From Arthouse's room scrolling back up, he goes straight back into the screen's light.)
              if (p > 0 && p < 1 && (spot === t.from() || spot === t.to())) {
                takeoff(t, p);
                return travel(t, p);
              }
            }
            lookUp(spot === homeSpot && band !== null && band.getBoundingClientRect().top < innerHeight && nightfall.p() <= 0);
          }
        }
        const next = current();
        if (next && next !== spot && phase === "home") {
          moveTo(next);
          if (next === ldSpot) {
            engine?.loadReel(true);
            propStill(true);
            after(120, inCinema);
          }
        }
        if (phase === "home" && spot === ldSpot) inCinema();
      });
    };
    window.addEventListener("scroll", onWalk, { passive: true });
    window.addEventListener("resize", onWalk);

    // A part of a room comes into view: he says its line, once a visit.
    let lastReact = { kind: "", at: -Infinity };
    let reacted = 0; // answers so far: a cue that would land after one stays quiet
    const cued = new Set<string>();
    const cues = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          const key = el.dataset.hostCue!;
          if (!e.isIntersecting || cued.has(key) || !CUE[key] || !engine || phase !== "home" || asleep) continue;
          if (!el.closest("section")?.contains(spot)) continue;
          cued.add(key);
          // Let his story line be read first; then the cue (unless something
          // was said meanwhile, or the guide moved on).
          const n = reacted;
          after(Math.max(0, arrivedAt + STORY_MS - performance.now()), () => {
            const guide = el.querySelector<HTMLElement>("[data-guide]")?.dataset.guide;
            // A room's guide waiting for its first tap has its own line (Starweave "face", Arthouse "tap").
            const waiting = guide === "face" || guide === "tap";
            const cue = CUE[waiting && CUE[`${key}:guide`] ? `${key}:guide` : key];
            // Never over an answer he just gave.
            if (guide === "walk" || reacted !== n || performance.now() - lastReact.at < 4000 || !engine || phase !== "home") return;
            say(cue.line, 0);
            engine.play(cue.move);
          });
        }
      },
      // Crossing the middle of the screen (a part taller than the screen can never be 35% visible).
      { rootMargin: "-35% 0px -35% 0px" },
    );
    document.querySelectorAll("[data-host-cue]").forEach((el) => cues.observe(el));

    // What you do in his room: he answers (a line and a small move).
    const onReact = (ev: Event) => {
      const d = (ev as CustomEvent<{ kind: "proof" | "song" | "route" | "walk" | "guide" | "double"; tier?: number; on?: boolean; step?: number; a?: string; b?: string }>).detail;
      // Only in a room (the hero has no part to react to).
      if (!engine || phase !== "home" || !spot.closest("section")) return;
      const now = performance.now();
      const kind = d.kind + (d.step ?? "");
      if (kind === lastReact.kind && now - lastReact.at < 1500) return;
      lastReact = { kind, at: now };
      reacted++;
      if (asleep) wake();
      touch();
      if (d.kind === "guide") {
        if (d.step === 0) {
          say(GUIDE.nudge(d.b ?? ""), 0);
          engine.play("point");
        } else if (d.step === 1) {
          say(GUIDE.proof(d.b ?? "", d.a ?? "", !!spot.closest("[data-host-lane]")), 0);
        } else if (d.step === 2) {
          say(GUIDE.walk(d.a ?? ""), 0);
          engine.play("nod");
          const n = said_;
          // (A nod, not a wave: a wave would drop the proof he's holding.)
          after(4800, () => said_ === n && phase === "home" && (say(GUIDE.yours, 0), engine?.play("nod")));
        } else {
          say(GUIDE.yours, 0);
          engine.play("nod");
        }
      } else if (d.kind === "proof") {
        say(REACT.proof[d.tier ?? 0], 0);
        engine.play("nod");
      } else if (d.kind === "song" && d.on) {
        say(REACT.song, 0);
        engine.play("nod");
      } else if (d.kind === "route") {
        say(REACT.route, 0);
        engine.play("point");
      } else if (d.kind === "double") {
        say(REACT.double, 0);
        engine.play("nod");
      } else if (d.kind === "walk") {
        say(REACT.walk, 0);
        engine.play("look");
      }
      // The proof in his column changed (or went): hold it up, or let go.
      rehold(d.kind === "route" ? 2600 : 150);
    };
    window.addEventListener("host:react", onReact);

    // ── The engine ────────────────────────────────────────────────────────
    const start = async () => {
      const { createEngine } = await import("./engine/engine");
      if (cancelled) return;
      canvas = document.createElement("canvas");
      canvas.className = "host-canvas";
      canvas.setAttribute("aria-hidden", "true");
      spot.insertBefore(canvas, hit);
      // The z's over his head while he naps (shown by .is-asleep).
      zzz = document.createElement("span");
      zzz.className = "host-zzz";
      zzz.setAttribute("aria-hidden", "true");
      zzz.innerHTML = "<i>z</i><i>z</i><i>z</i>";
      spot.insertBefore(zzz, hit);
      const made = await createEngine(canvas, {
        // The ground draws his shadow, on the floor, so it stays there when he's thrown.
        shadow: false,
        onFirstFrame: () => {
          spot.classList.add("is-live");
          // A room with a lane can leave its printed story line to him.
          document.documentElement.classList.add("host-live");
        },
        onLost: () => {
          spot.classList.remove("is-live");
          document.documentElement.classList.remove("host-live");
          canvas?.remove();
          engine = null;
        },
      });
      if (cancelled) return made.dispose();
      engine = made;
      io = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        engine?.setActive(e.isIntersecting || phase !== "home");
      });
      io.observe(spot);
      onWalk(); // already scrolled into a room (a reload, a #link)
      // Parts that came into view before he could talk (touch screens load
      // him late): look again, now that he can.
      document.querySelectorAll("[data-host-cue]").forEach((el) => (cues.unobserve(el), cues.observe(el)));
    };

    let cancelIdle = () => {};
    const later = () => {
      if ("requestIdleCallback" in window) {
        const id = requestIdleCallback(start, { timeout: 2000 });
        cancelIdle = () => cancelIdleCallback(id);
      } else {
        const id = setTimeout(start, 1200);
        cancelIdle = () => clearTimeout(id);
      }
    };
    if (!still) {
      if (matchMedia("(pointer: fine)").matches) start();
      else if (document.readyState === "complete") later();
      else window.addEventListener("load", later, { once: true });
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearInterval(idleTimer);
      document.removeEventListener("visibilitychange", onTab);
      window.removeEventListener("scroll", onWalk);
      window.removeEventListener("resize", onWalk);
      window.removeEventListener("host:react", onReact);
      cancelAnimationFrame(walkRaf);
      cues.disconnect();
      clearTimeout(leanTimer);
      flightBox.remove();
      followSpot.remove();
      hit.style.visibility = "";
      homeSpot.append(hit);
      document.querySelectorAll(".pg-spot").forEach((s) => s.classList.remove("is-live", "is-empty", "is-asleep"));
      zzz?.remove();
      said?.querySelector(".host-greet")?.remove();
      spot.classList.remove("is-asleep");
      clearTimeout(sayTimer);
      clearTimeout(grabTimer);
      cancelAnimationFrame(loop);
      cancelIdle();
      window.removeEventListener("load", later);
      window.removeEventListener("scroll", onScroll);
      hit.removeEventListener("click", onClick);
      soundSwitch?.removeEventListener("click", onSoundSwitch);
      sound.dispose();
      hit.removeEventListener("pointerenter", onEnter);
      hit.removeEventListener("pointerleave", onLeave);
      hit.removeEventListener("pointerdown", onDown);
      hit.removeEventListener("pointermove", onMove);
      hit.removeEventListener("pointerup", onUp);
      hit.removeEventListener("pointercancel", onUp);
      document.documentElement.classList.remove("is-holding-host", "host-live");
      io?.disconnect();
      engine?.dispose();
      canvas?.remove();
      spot.classList.remove("is-live");
    };
  }, []);
  return null;
}
