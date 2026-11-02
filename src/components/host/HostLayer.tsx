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
// The cinema (Lights down): keep these in step with lightsdown.css.
const WALK_START = 0.45; // he sets off when the cinema's top is this far down the screen (Starweave's "How it works" all but gone)
const WALK_CYCLES = 3; // walk cycles (two steps each) from Starweave to the projector
const MOUNT_AT = 300; // ms into the mount: the reel leaves his hand and floats up onto the projector as he reaches
const MOUNT_MS = 1250; // the mount's length: then he cranks
const LAMP_AT = 0.12; // the lamp catches (held-stage fraction; CSS .ld-light from 12%)
const FILM_FROM = 0.56; // into the film from here to the stage's end
const LEAP_AT = 0.16; // of that: the wind-up, then the leap
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
    // Every line shows for a read, then goes (ms = 0: as long as the line
    // needs). Nothing is replayed later: a line belongs to its moment.
    let sayTimer = 0;
    let said_ = 0; // lines said so far, so a delayed line can tell it was overtaken
    const show = (b: NonNullable<ReturnType<typeof bubbleAt>>, line: string) => {
      b.text!.textContent = line;
      sound.say(line); // (only with his sound on)
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
      // Every line goes after a read (a bubble that never goes is wallpaper,
      // and people learn to look past him). Longer lines stay longer.
      const read = Math.min(9000, 3200 + line.split(" ").length * 280);
      sayTimer = window.setTimeout(() => b.el.classList.remove(b.on), ms || read);
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
      sound.say(line);
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
      if (!engine || phase !== "home" || asleep || !onScreen || document.hidden || engine.isOn("hold") || engine.isOn("crank") || engine.sitting()) return;
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
        // (In his cinema seat the ticket just stays in the column.)
        if (proofShown() && !engine.sitting()) engine.play("hold");
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
      // Watching the film: a nod, nothing louder.
      if (engine?.sitting()) {
        engine.play("nod");
        sound.poke();
        return;
      }
      const r = director.poke();
      sound.poke();
      say(r.line);
      act(r);
      rehold(2200);
      if (director.pokes === 2 && engine && director.firstTime("lift")) after(SAY_MS + 200, () => say(QUIP.hintLift));
      // The first poke on the first screen, his voice off: where to turn it on (once).
      else if (director.pokes === 1 && !sound.on && spot === homeSpot && director.firstTime("voice"))
        after(SAY_MS + 200, () => spot === homeSpot && !sound.on && say(QUIP.hintVoice));
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
      engine?.seat(spot === ahLane());
      rehold(500);
      watchFilm();
    };
    const tick = (now: number) => {
      const dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016);
      last = now;
      if (phase === "held" && samples.length) {
        const p = samples[samples.length - 1];
        // He stays on screen while held: past the edge he waits at it (the
        // throw still takes the pointer's own speed, so he bumps the side).
        const k = bounds();
        follow(body, Math.max(k.left, Math.min(k.right, p.x - grabAt.x)), Math.max(k.top, p.y - grabAt.y), dt);
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
      // (Out of his seat; the seat is drawn with him, so it waits off screen
      // until he's back at his spot.)
      if (engine.sitting()) leaveSeat(true);
      engine.seat(false);
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
    // Let go. `at` is where the pointer came up; without it (the release
    // happened where we couldn't see it: outside the window, focus lost) he's
    // dropped with the speed of the last move, or none if that was a while ago.
    const letGo = (at?: { x: number; y: number }) => {
      if (!press) return;
      clearTimeout(press.holdTimer);
      press = null;
      if (phase !== "held") return;
      const now = performance.now();
      if (at) samples.push({ t: now, ...at });
      const lastMove = samples[samples.length - 1]?.t ?? now;
      Object.assign(body, now - lastMove > 150 ? { vx: 0, vy: 0 } : release(samples));
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
    const onUp = (e: PointerEvent) => {
      if (press && e.pointerId === press.id) letGo({ x: e.clientX, y: e.clientY });
    };
    // A release the page never saw (let go outside the window, or the browser
    // took the pointer away): drop him instead of holding him forever. After
    // a normal pointerup, press is already null and these do nothing.
    const onLost = (e: PointerEvent) => {
      if (press && e.pointerId === press.id) letGo();
    };
    const onBlur = () => letGo();
    const onAnyMove = (e: PointerEvent) => {
      if (press && e.pointerId === press.id && e.pointerType === "mouse" && e.buttons === 0) letGo();
    };
    hit.addEventListener("pointerdown", onDown);
    hit.addEventListener("pointermove", onMove);
    hit.addEventListener("pointerup", onUp);
    hit.addEventListener("pointercancel", onUp);
    hit.addEventListener("lostpointercapture", onLost);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointermove", onAnyMove);

    // ── Walking the page with you ─────────────────────────────────────────
    // The stop whose section is across the reading line (45% down the
    // screen) takes him; a stop hidden at this width (display: none) never does.
    const stops = () => [...document.querySelectorAll<HTMLElement>("[data-host-stop]")].filter((s) => s.offsetParent !== null);
    const current = () => {
      const line = window.innerHeight * 0.45;
      return stops().find((s) => {
        const r = (s.closest("section, header, footer") ?? s).getBoundingClientRect();
        return r.top <= line && r.bottom >= line;
      });
    };
    let arrivedAt = 0;
    const told = new Set<string>(); // rooms whose story he has said this visit
    const moveTo = (next: HTMLElement, { flown = false, land = true } = {}) => {
      if (!engine || !canvas) return;
      const from = spot;
      if (next !== from && from === ahLane()) leaveSeat(true);
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
      // In Arthouse's column his cinema seat stands behind him.
      engine.seat(next === ahLane());
      next.classList.add("is-live");
      engine.refit();
      io?.disconnect();
      io?.observe(next);
      engine.setActive(true);
      // He drops in from above and lands (or, arriving by air, just lands).
      if (flown) {
        // (Walking up to the projector he just stops; no flinch.)
        if (land) engine.play("land");
      } else if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        engine.play("fall");
        canvas.animate([{ translate: "-50% -160px", opacity: 0 }, { translate: "-50% 0", opacity: 1 }], { duration: 380, easing: "cubic-bezier(0.55, 0, 1, 0.45)" });
        after(380, () => engine?.play("land"));
      }
      rehold(1100);
      touch();
      window.dispatchEvent(new Event("hostmove"));
      // In a lane: first time in, the room's story (the page prints it only
      // where there's no lane). Coming back, nothing is repeated: an answer
      // to something you did once ("Copied. Talk soon.") would arrive out of
      // nowhere.
      const name = next.dataset.hostSpot as Spot;
      if (next.closest("[data-host-lane]")) {
        if (!told.has(name) && STORY[name]) {
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

    // Walk-in: once Starweave's room has all but gone (the cinema's top 45%
    // down the screen) to the cinema's stage being held (its top at the top).
    // His steps are the scroll's: the walk cycle is scrubbed by p, so his feet
    // never slide, and he stands mid-stride when you stop.
    // (No later than current()'s 45% line: past it he'd already be placed at
    // the projector without walking.)
    const walkD = () => WALK_START * innerHeight;
    const walkIn: Trip = {
      from: swStop,
      to: () => ldSpot ?? undefined,
      p: () => (walkD() - ld!.getBoundingClientRect().top) / walkD(),
      at: (p) => {
        const a = laneFeet(swStop()!, p, walkD());
        const b = ldFeet();
        const t = ease(p);
        // Scaled from the bigger spot down, never up (a canvas scaled up blurs).
        const base = walkIn.box().offsetHeight;
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), k: lerp(a.h, b.h, t) / base };
      },
      box: () => (ldSpot!.offsetHeight > swStop()!.offsetHeight ? ldSpot! : swStop()!),
      start: (p) => {
        // Down the aisle toward you, the film in his hand, in a follow-spot.
        propStill(false);
        engine!.carry(true);
        engine!.scrub("carry", 1);
        engine!.scrub("walk", p * WALK_CYCLES);
        lastStepAt = Math.floor(p * WALK_CYCLES * 2);
        document.body.append(followSpot);
      },
      frame: (p, pt) => {
        const h = flightBox.offsetHeight * pt.k;
        followSpot.style.transform = `translate(${(pt.x - 260).toFixed(0)}px, ${(pt.y - h * 0.62 - 260).toFixed(0)}px) scale(${(0.55 + 0.5 * pt.k).toFixed(3)})`;
        engine!.scrub("walk", p * WALK_CYCLES);
        // A footstep each time a foot comes down (two a cycle).
        const step = Math.floor(p * WALK_CYCLES * 2);
        if (step !== lastStepAt) {
          lastStepAt = step;
          sound.step();
        }
      },
      arrive: (end) => {
        followSpot.remove();
        engine!.play("idle", { fade: 0.3 });
        if (end === "to") {
          // At the projector: he puts the reel on, then takes the crank.
          moveTo(ldSpot!, { flown: true, land: false });
          mountReel();
        } else {
          engine!.scrub("carry", 0);
          engine!.carry(false);
          moveTo(swStop()!, { flown: true });
        }
      },
    };
    let lastStepAt = 0;
    // Putting the film on: he looks at the projector, lifts the reel onto its
    // front arm (it slides off his hand into place), presses it home, and his
    // hand comes down onto the crank. Only then does he crank.
    let mounting = false;
    const mountReel = () => {
      if (!engine) return;
      mounting = true;
      cranking = false;
      engine.loadReel(false); // the front arm is empty until he puts his reel on
      engine.play("mount", { fade: 0 });
      engine.scrub("carry", 0);
      after(MOUNT_AT, () => {
        if (spot !== ldSpot) return;
        engine?.mountReel();
        propStill(true);
        sound.poke();
      });
      after(MOUNT_MS, () => {
        mounting = false;
        if (spot === ldSpot && phase === "home") inCinema();
      });
    };

    // Into the film: over the last 44% of the cinema's held stage (the title
    // holds before it; lightsdown.css has the light/title ranges). He winds up,
    // leaps high, turns over into a dive (hands first along the arc) and goes
    // into the middle of the screen, which takes him in a flash and a ripple.
    // All scrubbed by the scroll.
    const filmP = () => {
      const r = ld!.getBoundingClientRect();
      const q = -r.top / Math.max(1, r.height - innerHeight);
      return (q - FILM_FROM) / (1 - FILM_FROM);
    };
    /** The dive's arc, for his middle, at u (0 → 1 from takeoff to the screen). */
    const diveArc = (u: number) => {
      const st = ldStage!.getBoundingClientRect();
      const f = ldFeet();
      const sc = ldScreen!.getBoundingClientRect();
      const A = { x: f.x, y: f.y + st.top - f.h * 0.5 };
      const B = { x: sc.left + sc.width / 2, y: sc.top + sc.height / 2 };
      // Up and over: high above where he stood, across, then a near-vertical
      // plunge into the screen (the last control point sits just above it).
      // Kept clear of the nav at the top.
      const P1 = { x: A.x - (A.x - B.x) * 0.25, y: A.y - f.h * 1.4 };
      const P2 = { x: B.x + (A.x - B.x) * 0.08, y: Math.max(st.top + 130, sc.top - f.h * 0.7) };
      const v = 1 - u;
      const at = (a: number, b: number, c: number, d: number) => v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d;
      const dt = (a: number, b: number, c: number, d: number) => 3 * v * v * (b - a) + 6 * v * u * (c - b) + 3 * u * u * (d - c);
      return { x: at(A.x, P1.x, P2.x, B.x), y: at(A.y, P1.y, P2.y, B.y), vx: dt(A.x, P1.x, P2.x, B.x), vy: dt(A.y, P1.y, P2.y, B.y), A };
    };
    const diveScale = (u: number) => (u < 0.8 ? lerp(1, 0.55, ease(u / 0.8)) : lerp(0.55, 0.04, (u - 0.8) / 0.2));
    const intoFilm: Trip = {
      from: () => ldSpot ?? undefined,
      to: ahStop,
      p: filmP,
      at: (p) => {
        const box = flightBox.offsetHeight || ldSpot!.offsetHeight;
        if (p < LEAP_AT) {
          // The wind-up, where he stands.
          const f = ldFeet();
          return { x: f.x, y: f.y + ldStage!.getBoundingClientRect().top, k: 1 };
        }
        const u = (p - LEAP_AT) / (1 - LEAP_AT);
        const c = diveArc(u);
        const k = diveScale(u);
        // The box hangs from his feet; his middle sits half a box above them.
        return { x: c.x, y: c.y + box * 0.5 * k, k };
      },
      box: () => ldSpot!,
      start: () => {
        propStill(true);
        engine!.play("idle");
        engine!.face(-1);
      },
      frame: (p) => {
        engine!.lean(0);
        const u = p < LEAP_AT ? 0 : (p - LEAP_AT) / (1 - LEAP_AT);
        engine!.scrub("windup", p < LEAP_AT ? ease(p / LEAP_AT) : Math.max(0, 1 - u / 0.1));
        engine!.scrub("dive", Math.min(1, u / 0.22));
        // Turned so his hands lead along the arc (counter-clockwise on screen).
        const c = diveArc(u);
        const along = Math.atan2(-c.vx, -c.vy);
        engine!.tilt(u <= 0 ? 0 : along * ease(Math.min(1, u / 0.35)));
        canvas!.style.opacity = String(u > 0.9 ? Math.max(0, 1 - (u - 0.9) / 0.1) : 1);
      },
      arrive: (end) => {
        canvas!.style.opacity = "";
        offDive();
        if (end === "from") {
          moveTo(ldSpot!, { flown: true, land: false });
          engine!.loadReel(true);
          after(120, inCinema);
        }
      },
    };
    const offDive = () => {
      engine?.tilt(0);
      engine?.scrub("windup", 0);
      engine?.scrub("dive", 0);
      engine?.face(0);
    };
    // Walk-out: the house lights come up after Arthouse (LightsUp). From his
    // seat's column (once the room's bottom is 45% up the screen) he walks
    // down to the EXIT door, turning his back to us, reaches it as it swings
    // open (lightsup.css: open over 30–46% of its held stage), goes into the
    // daylight and is gone while it floods the screen; he walks into About as
    // its page reaches the reading line. All scrubbed, so it runs backward too.
    const lu = document.querySelector<HTMLElement>("[data-lightsup]");
    const luStage = lu?.querySelector<HTMLElement>(".lu-stage");
    const luDoor = lu?.querySelector<HTMLElement>("[data-door]");
    const aboutStop = () => stops().find((s) => s.closest("#about"));
    const outFrom = () => stops().find((s) => s === ahLane());
    // p over the band: 0 with its top 45% down, 1 with its bottom there.
    const outP = () => (0.45 * innerHeight - lu!.getBoundingClientRect().top) / lu!.offsetHeight;
    // p when the held stage is at q (its scrolled fraction).
    const outAt = (q: number) => (0.45 * innerHeight + q * (lu!.offsetHeight - luStage!.offsetHeight)) / lu!.offsetHeight;
    const OUT_REACH = 0.47; // q: at the door as it finishes opening
    const OUT_GONE = 0.55; // q: through it, into the light
    const OUT_BACK = 0.68; // q: the light has filled the screen; he comes back out of it
    const OUT_CYCLES = 5.5;
    let outStep = 0;
    let outLast = 0;
    const walkOut: Trip = {
      from: outFrom,
      to: aboutStop,
      p: outP,
      at: (p) => {
        const base = walkOut.box().offsetHeight;
        // Where he stood when he set off: his column scrolls away with the
        // room, he doesn't.
        const r = outFrom()!.getBoundingClientRect();
        const a = { x: r.left + r.width / 2, y: r.bottom + 0.45 * innerHeight - lu!.getBoundingClientRect().top, h: r.height };
        const d = luDoor!.getBoundingClientRect();
        // His feet on the threshold; he's smaller there (it's across the room).
        const b = { x: d.left + d.width / 2, y: Math.min(d.bottom, innerHeight * 0.95), h: d.height * 0.66 };
        const pr = outAt(OUT_REACH);
        if (p <= pr) {
          // Down onto the floor in front of the door (near, so lower on the
          // screen), then up the aisle into it: never across the wall.
          const t = ease(p / pr);
          const c = { x: lerp(a.x, b.x, 0.8), y: innerHeight * 1.22 };
          const u = 1 - t;
          return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y, k: lerp(a.h, b.h, t) / base };
        }
        const pg = outAt(OUT_GONE);
        if (p <= pg) {
          // Into the doorway, a little further in and smaller.
          const u = (p - pr) / (pg - pr);
          return { x: b.x, y: b.y - u * d.height * 0.06, k: (b.h * (1 - 0.2 * u)) / base };
        }
        // Then, as the daylight floods the screen, he walks back out of it
        // toward you: from the doorway (small, far) to his spot by the photo.
        const c = box(aboutStop()!);
        const t = ease(Math.max(0, (p - outAt(OUT_BACK)) / (1 - outAt(OUT_BACK))));
        const h0 = b.h * 0.8;
        return { x: lerp(b.x, c.x, t), y: lerp(b.y - d.height * 0.06, c.y, t), k: lerp(h0, c.h, t) / base };
      },
      box: () => outFrom()!,
      start: (p) => {
        engine!.play("idle");
        outStep = Math.floor(walkOutPhase(p) * 2);
        engine!.scrub("walk", walkOutPhase(p));
      },
      frame: (p) => {
        const pr = outAt(OUT_REACH);
        const pg = outAt(OUT_GONE);
        const ph = walkOutPhase(p);
        engine!.scrub("walk", ph);
        const pb = outAt(OUT_BACK);
        const step = Math.floor(ph * 2);
        if (step !== outStep && (p < pg || p > pb)) {
          outStep = step;
          sound.step();
        }
        // Toward the door (3/4 on to us), his back to us as he nears it; out
        // of the light, facing us again (he turns while the light hides him).
        const dir = Math.sign(luDoor!.getBoundingClientRect().left - box(outFrom()!).x) || -1;
        engine!.yaw(p > pg ? null : p < pr * 0.55 ? dir * 1.1 : dir * 2.6);
        // Gone into the light, then back out of it.
        const op = p <= pr ? 1 : p <= pg ? 1 - (p - pr) / (pg - pr) : p <= pb ? 0 : Math.min(1, (p - pb) / ((1 - pb) * 0.18));
        canvas!.style.opacity = op >= 1 ? "" : String(Math.max(0, op));
        // The door's hinge as he reaches it (going forward).
        if (p >= pr * 0.8 && outLast < pr * 0.8) sound.creak();
        outLast = p;
      },
      arrive: (end) => {
        canvas!.style.opacity = "";
        engine!.yaw(null);
        engine!.play("idle", { fade: 0.3 });
        if (end === "from") return moveTo(outFrom()!, { flown: true, land: false });
        // He walked out of the light onto his spot by the photo: he just stops.
        moveTo(aboutStop()!, { flown: true, land: false });
      },
    };
    // Down to the end of the tour: from About's column into Contact's as
    // Contact comes up (its top from 95% to 45% of the screen, where it takes
    // him anyway), steps scrubbed by the scroll: to the front edge of About's
    // floor, a hop down off it into the evening (a small arc, a thud), then on
    // to the horizon, where he holds up his card.
    const ctEl = document.querySelector<HTMLElement>("#contact");
    const ctStop = () => stops().find((s) => s.closest("#contact"));
    const DOWN_CYCLES = 2;
    const HOP_FROM = 0.34; // p: off the front of About's floor…
    const HOP_TO = 0.6; // …and down into the evening
    let downStep = 0;
    let downLast = 0;
    const walkDown: Trip = {
      from: aboutStop,
      to: ctStop,
      p: () => (0.95 * innerHeight - ctEl!.getBoundingClientRect().top) / (0.5 * innerHeight),
      at: (p) => {
        const a = box(aboutStop()!);
        const b = box(ctStop()!);
        const t = ease(p);
        const h = Math.sin(Math.PI * Math.min(1, Math.max(0, (p - HOP_FROM) / (HOP_TO - HOP_FROM))));
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) - h * a.h * 0.16, k: lerp(a.h, b.h, t) / walkDown.box().offsetHeight };
      },
      box: () => (ctStop()!.offsetHeight > aboutStop()!.offsetHeight ? ctStop()! : aboutStop()!),
      start: (p) => {
        engine!.play("idle");
        downStep = Math.floor(p * DOWN_CYCLES * 2);
        engine!.scrub("walk", p * DOWN_CYCLES);
      },
      frame: (p) => {
        // Mid-hop his legs tuck (the wind-up's bend), then the walk again.
        const hop = p > HOP_FROM && p < HOP_TO;
        engine!.scrub("windup", hop ? Math.sin(Math.PI * ((p - HOP_FROM) / (HOP_TO - HOP_FROM))) * 0.45 : 0);
        engine!.scrub("walk", p * DOWN_CYCLES);
        const step = Math.floor(p * DOWN_CYCLES * 2);
        if (step !== downStep && !hop) {
          downStep = step;
          sound.step();
        }
        if (p >= HOP_TO && downLast < HOP_TO) sound.land(500);
        downLast = p;
      },
      arrive: (end) => {
        engine!.scrub("windup", 0);
        engine!.play("idle", { fade: 0.3 });
        moveTo(end === "from" ? aboutStop()! : ctStop()!, { flown: true, land: false });
        if (end === "to") after(450, () => spot === ctStop() && sound.flick()); // his card comes out
        // (Already at the bottom when he gets here: no scroll is coming to wave on.)
        if (end === "to") after(700, goodbye);
      },
    };
    // At the very bottom he waves you off (once a visit); still there a while
    // later, he points at the email.
    let wavedBye = false;
    const atBottom = () => innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    const goodbye = () => {
      if (wavedBye || !engine || phase !== "home" || spot !== ctStop() || !atBottom()) return;
      wavedBye = true;
      after(400, () => {
        if (spot !== ctStop() || phase !== "home") return;
        if (asleep) wake();
        engine?.play("wave");
        say(QUIP.bye, 0);
        rehold(2400);
        after(20000, () => {
          if (spot !== ctStop() || phase !== "home" || !atBottom()) return;
          say(QUIP.still, 0);
          engine?.play("point");
          rehold(1800);
        });
      });
    };
    // His steps run the whole way (in, and back out of the light).
    const walkOutPhase = (p: number) => p * OUT_CYCLES;
    const trips = [nightfall, walkIn, intoFilm, ...(lu && luStage && luDoor ? [walkOut] : []), ...(ctEl ? [walkDown] : [])];
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
      leaveSeat(true);
      engine.seat(false);
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
      ldScreen?.querySelector(".ld-flash")?.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 700, easing: "ease-out" });
      ldScreen?.querySelector(".ld-ripple")?.animate(
        [
          { scale: "0.2", opacity: 0.9 },
          { scale: "14", opacity: 0 },
        ],
        { duration: 1000, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      );
      ldScreen?.animate([{ scale: "1" }, { scale: "1.03" }, { scale: "1" }], { duration: 480, easing: "cubic-bezier(0.2, 0, 0, 1)" });
      sound.land(1100);
    };
    // Out of the dive, into Arthouse's room: the dive is how he gets to his
    // seat. He drops in from the top of his column straight into it (already
    // sitting, popcorn in hand) with a small bounce; narrower screens, no
    // seat, he just drops onto his spot.
    const leaveFilm = (to: HTMLElement) => {
      offDive();
      phase = "home";
      trip = null;
      hit.style.visibility = "";
      engine!.setFast(false);
      canvas!.style.opacity = "";
      moveTo(to, { flown: true, land: false });
      flightBox.remove();
      if (to === ahLane()) {
        engine!.sit(true, true);
        applauded = false;
        seatRun++;
      }
      const drop = canvas!.animate([{ translate: "-50% -260px", opacity: 0 }, { translate: "-50% -260px", opacity: 1, offset: 0.08 }, { translate: "-50% 0" }], { duration: 460, easing: "cubic-bezier(0.55, 0, 1, 0.45)" });
      drop.onfinish = () => {
        sound.land(900);
        canvas?.animate([{ translate: "-50% 0" }, { translate: "-50% -16px" }, { translate: "-50% 0" }], { duration: 260, easing: "cubic-bezier(0.2, 0, 0, 1)" });
      };
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
      if (live && spot === ldSpot && phase === "home") return { x: live.x - st.left, y: live.y - st.top };
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
    let lampLit = false;
    const inCinema = () => {
      if (!engine || !ld) return;
      const r = ld.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
      engine.reel(p * 36, p > LAMP_AT);
      // The lamp catching (going forward): its motor runs up.
      const lit = p > LAMP_AT;
      if (lit && !lampLit && phase === "home") sound.whirr();
      lampLit = lit;
      const run = p > 0.01 && p < 0.97 && phase === "home" && !mounting;
      if (run && !cranking) {
        // Out of the mount's last pose (the same as the crank's first).
        engine.stopSmall(0.15);
        engine.play("crank", { loop: true, fade: 0.15 });
      }
      if (!run && cranking) engine.stopSmall(0.3);
      cranking = run;
      aimBeam();
    };

    // ── Arthouse: he watches the film with you ───────────────────────────
    // In Arthouse's column (wide screens) he's in his cinema seat with
    // popcorn: he lands in it out of the dive, and stays for the whole room,
    // eyes on the screen while it's in view; when the credits finish he gets
    // up, stretches and claps. Scrolling back up takes him back into the
    // film (the dive, reversed).
    const ahRoom = document.querySelector<HTMLElement>("#arthouse");
    const ahLane = () => ahRoom?.querySelector<HTMLElement>('[data-host-lane] [data-host-stop]') ?? null;
    let applauded = false;
    let seatRun = 0; // a token: getting up again cancels a pending stretch/clap
    const leaveSeat = (now = false) => {
      if (!engine?.sitting()) return;
      seatRun++;
      engine.sit(false, now);
      engine.gaze(null);
    };
    const watchFilm = () => {
      if (!engine || !ahRoom || phase !== "home" || spot !== ahLane()) return;
      const stage = ahRoom.querySelector<HTMLElement>(".ah-stage");
      const screen = ahRoom.querySelector<HTMLElement>(".ah-screen");
      if (!stage || !screen) return;
      const over = ahRoom.getBoundingClientRect().bottom < innerHeight * 0.8;
      const showing = !over;
      if (showing && !engine.sitting()) {
        if (asleep) wake();
        engine.stopSmall(0.25); // (lowers the ticket: it stays in the column)
        engine.sit(true);
        applauded = false;
        seatRun++;
      } else if (!showing && engine.sitting()) {
        leaveSeat();
        if (over && !applauded) {
          // The credits are done: up, a stretch, applause.
          applauded = true;
          const run = seatRun;
          after(650, () => run === seatRun && phase === "home" && engine?.play("stretch"));
          after(2700, () => run === seatRun && phase === "home" && engine?.play("clap"));
          after(4400, () => run === seatRun && rehold());
        } else rehold(700);
      }
      if (engine.sitting()) {
        // Eyes on the screen while it's in view; otherwise, on you.
        const r = screen.getBoundingClientRect();
        engine.gaze(r.bottom > 0 && r.top < innerHeight ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
      }
    };

    // Starweave's cut: as the recorded site's screen swings open (ProductShot
    // writes its progress to data-lid), he sweeps his arm toward it, a
    // presenter's reveal, eyes on it. Scrubbed, so it runs both ways.
    const swCut = document.querySelector<HTMLElement>("#starweave .ps-stage");
    let revealing = false;
    let lastLid = 0;
    const revealCut = () => {
      if (!engine || !swCut) return;
      const here = phase === "home" && !!spot.closest("#starweave [data-host-lane]");
      const lid = here ? Number(swCut.dataset.lid ?? 0) : 0;
      // The latch, as it starts to open (forward only).
      if (lid > 0.03 && lastLid <= 0.03) sound.click();
      lastLid = lid;
      if (lid > 0 && lid < 1) {
        if (asleep) wake();
        touch();
        engine.scrub("reveal", lid);
        const r = swCut.querySelector(".ps-screen")!.getBoundingClientRect();
        engine.gaze({ x: r.left + r.width * 0.45, y: r.top + r.height * 0.5 });
        revealing = true;
      } else if (revealing) {
        engine.scrub("reveal", 0);
        engine.gaze(null);
        revealing = false;
      }
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
        if (phase === "home") watchFilm();
        if (phase === "home") goodbye();
        revealCut();
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
          const at = spot;
          after(Math.max(0, arrivedAt + STORY_MS - performance.now()), () => {
            // He's moved on (a fast scroll): the line belongs to the room he
            // left, so it waits for the next visit there.
            if (spot !== at) return void cued.delete(key);
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
      const d = (ev as CustomEvent<{ kind: "proof" | "song" | "route" | "walk" | "guide" | "double" | "copied"; tier?: number; on?: boolean; step?: number; a?: string; b?: string }>).detail;
      // Only in a room (the hero has no part to react to).
      if (!engine || phase !== "home" || !spot.closest("section, footer")) return;
      const now = performance.now();
      const kind = d.kind + (d.step ?? "");
      if (kind === lastReact.kind && now - lastReact.at < 1500) return;
      lastReact = { kind, at: now };
      reacted++;
      if (asleep) wake();
      touch();
      if (d.kind === "guide") {
        if (d.step === 0) {
          // (Scrolled past the tree untapped: the page's own prompt asks; he just looks.)
          engine.play("look");
        } else if (d.step === 1) {
          sound.paper();
          say(GUIDE.proof(d.b ?? "", d.a ?? "", !!spot.closest("[data-host-lane]")), 0);
        } else if (d.step === 2) {
          say(GUIDE.walk(d.a ?? ""), 0);
          engine.play("nod");
          const n = said_;
          // (A nod, not a wave: a wave would drop the proof he's holding.)
          const at = spot;
          after(4800, () => said_ === n && spot === at && phase === "home" && (say(GUIDE.yours, 0), engine?.play("nod")));
        } else {
          say(GUIDE.yours, 0);
          engine.play("nod");
        }
      } else if (d.kind === "proof") {
        sound.paper();
        say(REACT.proof[d.tier ?? 0], 0);
        engine.play("nod");
      } else if (d.kind === "song" && d.on) {
        say(REACT.song, 0);
        engine.play("nod");
      } else if (d.kind === "route") {
        say(REACT.route, 0);
        engine.play("point");
      } else if (d.kind === "double") {
        sound.tear();
        say(REACT.double, 0);
        engine.play("nod");
      } else if (d.kind === "walk") {
        say(REACT.walk, 0);
        engine.play("look");
      } else if (d.kind === "copied") {
        sound.flick();
        say(REACT.copied, 0);
        engine.play("nod");
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
      hit.removeEventListener("lostpointercapture", onLost);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointermove", onAnyMove);
      document.documentElement.classList.remove("is-holding-host", "host-live");
      io?.disconnect();
      engine?.dispose();
      canvas?.remove();
      spot.classList.remove("is-live");
    };
  }, []);
  return null;
}
