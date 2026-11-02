// The host's sounds: tiny 8-bit blips synthesised with Web Audio (no files),
// quiet by design, and silent until the visitor turns them on with the Sound
// switch beside him. The choice is remembered. Nothing ever plays on load or
// on scroll: only in answer to something the visitor did to him.

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
    dispose() {
      void ctx?.close();
    },
  };
}
