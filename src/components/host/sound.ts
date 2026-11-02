// The host's sounds: tiny 8-bit blips synthesised with Web Audio (no files),
// quiet by design, and silent until the visitor turns them on with the Sound
// switch beside him. The choice is remembered. Nothing plays before that.
// Once it's on: his voice (a short babble as each line appears, the same
// line always sounding the same), what he does to you (pokes, landings,
// steps), and the props he handles (proof, ticket, card, the screen, the
// projector, the door).

const KEY = "host.sound";

export function createSound() {
  let on = false;
  try {
    on = localStorage.getItem(KEY) === "on";
  } catch {}
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;

  const audio = () => {
    if (!on) return null;
    if (!ctx) {
      ctx = new AudioContext();
      out = ctx.createGain();
      out.gain.value = 0.8;
      out.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  };

  /** One pitched blip: a waveform gliding f0 → f1, a click-free envelope. */
  const blip = (type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) => {
    const c = audio();
    if (!c || !out) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  };

  /** A short burst of low noise: a soft thud. */
  const thud = (vol: number) => {
    const c = audio();
    if (!c || !out) return;
    const len = Math.floor(c.sampleRate * 0.12);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = c.createBufferSource();
    const lp = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = buf;
    lp.type = "lowpass";
    lp.frequency.value = 420;
    g.gain.value = vol;
    src.connect(lp).connect(g).connect(out);
    src.start();
  };

  /** Filtered noise: paper, a rip, a tick. The band can sweep (f0 → f1). */
  const noise = (dur: number, f0: number, f1: number, vol: number, { delay = 0, q = 1.2, grain = 0 } = {}) => {
    const c = audio();
    if (!c || !out) return;
    const t = c.currentTime + delay;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      // Grain: the burst stutters (fibres giving way, one by one).
      const gate = grain ? (Math.sin((i / c.sampleRate) * grain * Math.PI * 2) > -0.2 ? 1 : 0.15) : 1;
      d[i] = (Math.random() * 2 - 1) * gate * Math.min(1, (i / len) * 12) * (1 - i / len) ** 1.4;
    }
    const src = c.createBufferSource();
    const bp = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = buf;
    bp.type = "bandpass";
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.value = vol;
    src.connect(bp).connect(g).connect(out);
    src.start(t);
  };

  /** A held tone that flutters: a projector's motor, a door's hinge. */
  const flutter = (type: OscillatorType, f0: number, f1: number, dur: number, vol: number, rate: number, cut: number) => {
    const c = audio();
    if (!c || !out) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const lfo = c.createOscillator();
    const depth = c.createGain();
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f1, t + dur);
    lfo.frequency.value = rate;
    depth.gain.value = vol * 0.6;
    lp.type = "lowpass";
    lp.frequency.value = cut;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.06);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    lfo.connect(depth).connect(g.gain);
    o.connect(lp).connect(g).connect(out);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  };

  // His voice: a few soft blips over half a second, one for every couple of
  // syllables, on a small scale around his pitch. Seeded by the line, so a
  // line always sounds the same; a question rises at the end.
  const SCALE = [1, 1.125, 1.25, 1.5, 1.333, 1.125];
  const seed = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
  };
  let lastSaid = 0;

  let step = 0;
  return {
    get on() {
      return on;
    },
    set(next: boolean) {
      on = next;
      try {
        localStorage.setItem(KEY, next ? "on" : "off");
      } catch {}
      if (on) blip("square", 660, 990, 0.08, 0.04);
    },
    /** A poke: a soft boop, its pitch a little different every time. */
    poke() {
      const k = 0.88 + Math.random() * 0.26;
      blip("square", 520 * k, 780 * k, 0.09, 0.045);
    },
    lift() {
      blip("triangle", 300, 900, 0.18, 0.08);
    },
    land(speed: number) {
      const v = Math.min(1, 0.4 + speed / 3000);
      thud(0.5 * v);
      blip("triangle", 170, 60, 0.15, 0.09 * v);
    },
    step() {
      step ^= 1;
      blip("triangle", step ? 230 : 190, step ? 200 : 160, 0.04, 0.035);
    },
    /** He says a line (as its bubble appears). */
    say(line: string) {
      const now = performance.now();
      if (!on || now - lastSaid < 350) return; // a line that replaces another at once: one voice
      lastSaid = now;
      const syl = (line.toLowerCase().match(/[aeiouy]+/g) ?? []).length;
      const n = Math.max(3, Math.min(8, Math.round(syl * 0.45)));
      const rnd = seed(line);
      const base = 210;
      const ask = /\?\s*$/.test(line);
      for (let i = 0; i < n; i++) {
        const f = base * SCALE[Math.floor(rnd() * SCALE.length)] * (0.97 + rnd() * 0.06);
        const last = i === n - 1;
        const end = last ? (ask ? f * 1.35 : f * 0.86) : f * 0.94;
        blip(i % 3 === 1 ? "square" : "triangle", f, end, last ? 0.09 : 0.055, 0.03, i * 0.072);
      }
    },
    /** A sheet held up: a dry paper rustle. */
    paper() {
      noise(0.07, 3200, 2400, 0.22, { q: 0.8 });
      noise(0.09, 2600, 3400, 0.16, { delay: 0.08, q: 0.8 });
    },
    /** A ticket torn along its perforation. */
    tear() {
      noise(0.26, 1400, 3600, 0.32, { q: 1.6, grain: 70 });
    },
    /** A card flicked out. */
    flick() {
      noise(0.03, 4200, 3000, 0.25, { q: 1 });
      blip("triangle", 1300, 900, 0.035, 0.03, 0.01);
    },
    /** A latch: the recorded screen swinging open. */
    click() {
      blip("square", 1100, 700, 0.025, 0.03);
      noise(0.04, 1800, 1200, 0.14, { delay: 0.012, q: 2 });
    },
    /** The projector's lamp catching and its motor running up. */
    whirr() {
      flutter("sawtooth", 46, 72, 1.1, 0.05, 22, 380);
    },
    /** The EXIT door's hinge. */
    creak() {
      flutter("sawtooth", 150, 118, 0.7, 0.045, 31, 900);
    },
    dispose() {
      void ctx?.close();
    },
  };
}
