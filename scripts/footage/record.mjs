// Records the two live sites being used, for each room's opening ("the
// front": the real product, before the demo of its inside). Headless Chrome
// with the GPU; frames come from the DevTools screencast at 2× (Playwright's
// own recorder is a blurry low-bitrate VP8), with a drawn cursor (headless
// shows none) so it reads as someone using it. ffmpeg turns the frames into
// an H.264 MP4 (Safari, iOS) and a VP9 WebM, plus a WebP poster of the last
// frame — the clip plays once and rests on it.
//
// usage:
//   PLAYWRIGHT=/path/to/playwright/index.mjs FFMPEG=/path/to/ffmpeg \
//     node scripts/footage/record.mjs [starweave|arthouse]
// Writes public/work/<id>-live.{mp4,webm,webp} and src/data/footage.json.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const W = 1280;
const H = 800;

// The cursor: an arrow that follows the real mouse events, with a ring on click.
const CURSOR = () => {
  const make = () => {
    if (document.getElementById("__cursor")) return;
    const c = document.createElement("div");
    c.id = "__cursor";
    c.innerHTML =
      '<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2 L2 22 L7.5 17 L11 25.5 L14.5 24 L11 15.8 L18.5 15.8 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none", transform: "translate(-100px,-100px)", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))" });
    document.documentElement.append(c);
    addEventListener("mousemove", (e) => (c.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`), true);
    addEventListener(
      "mousedown",
      (e) => {
        const r = document.createElement("div");
        Object.assign(r.style, { position: "fixed", left: `${e.clientX - 16}px`, top: `${e.clientY - 16}px`, width: "32px", height: "32px", borderRadius: "50%", border: "2px solid rgba(255,255,255,.9)", zIndex: "2147483646", pointerEvents: "none" });
        document.documentElement.append(r);
        r.animate([{ scale: 0.4, opacity: 1 }, { scale: 1.4, opacity: 0 }], { duration: 450, easing: "ease-out" }).onfinish = () => r.remove();
      },
      true
    );
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", make);
  else make();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mouse = { x: W * 0.62, y: H * 0.55 };
/** Move like a hand: eased, about 60 steps a second. */
async function glide(page, x, y, ms = 700) {
  const n = Math.max(8, Math.round(ms / 16));
  const a = { ...mouse };
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    await page.mouse.move(a.x + (x - a.x) * e, a.y + (y - a.y) * e);
    await sleep(ms / n);
  }
  mouse = { x, y };
}
async function centre(page, locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("not on screen");
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function clickOn(page, locator, ms = 700) {
  const c = await centre(page, locator);
  await glide(page, c.x, c.y, ms);
  await sleep(120);
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
}
async function scrollBy(page, dy, ms) {
  const n = Math.round(ms / 16);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    await page.mouse.wheel(0, (dy / n) * (1.5 - Math.abs(t - 0.5) * 2) * 1.0);
    await sleep(16);
  }
}

const SCENES = {
  // The map → find Radiohead → the graph pulls in who shaped them and who
  // they shaped (the room's family tree, in the real product).
  async starweave(page) {
    await page.goto("https://starweaves.vercel.app/", { waitUntil: "networkidle" });
    await sleep(1200);
    await page.getByText("Skip →").click();
    await sleep(3200);
    await page.mouse.move(mouse.x, mouse.y);
    return async () => {
      await sleep(600);
      await glide(page, W * 0.4, H * 0.42, 900);
      await sleep(400);
      const input = page.locator('input[placeholder^="Find artist"]');
      await clickOn(page, input, 800);
      await sleep(250);
      await page.keyboard.type("Radiohead", { delay: 85 });
      await sleep(500);
      await clickOn(page, page.getByRole("option", { name: /Radiohead/ }).first(), 500);
      await sleep(1600);
      await glide(page, W * 0.56, H * 0.56, 900);
      await sleep(2600);
    };
  },
  // A film's page, then (a cut, like an edit) its "Films like it": if you
  // loved Parasite, then see Get Out; the next pair after it.
  async arthouse(page) {
    await page.goto("https://arthouse-atlas.vercel.app/movie/6953c208df81e631d5708e82", { waitUntil: "networkidle" });
    await sleep(2500);
    await page.mouse.move(mouse.x, mouse.y);
    return async () => {
      await sleep(800);
      await glide(page, W * 0.42, H * 0.62, 900);
      await sleep(500);
      await page.evaluate(() => {
        const h = [...document.querySelectorAll("h2,h3")].find((e) => /Films like it/.test(e.textContent || ""));
        if (h) scrollTo({ top: h.getBoundingClientRect().top + scrollY - 70, behavior: "instant" });
      });
      await sleep(1900);
      const next = page.getByRole("button", { name: /next/i }).first();
      await clickOn(page, next, 900);
      await sleep(2200);
      await clickOn(page, next, 500);
      await sleep(2300);
    };
  },
};

async function record(id) {
  const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--hide-scrollbars"] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.addInitScript(CURSOR);
  const play = await SCENES[id](page);
  const dir = mkdtempSync(join(tmpdir(), `footage-${id}-`));
  const frames = [];
  const cdp = await page.context().newCDPSession(page);
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const f = join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(f, Buffer.from(data, "base64"));
    frames.push({ f, t: metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 });
  await play();
  await sleep(300);
  await cdp.send("Page.stopScreencast");
  await browser.close();
  if (frames.length < 10) throw new Error(`only ${frames.length} frames`);

  // The screencast sends a frame only when the screen changes: give each its
  // real duration (concat demuxer), then resample to a steady 30 fps.
  const list = frames.map((fr, i) => `file '${fr.f}'\nduration ${Math.max(0.001, ((frames[i + 1]?.t ?? fr.t + 0.5) - fr.t)).toFixed(4)}`);
  list.push(`file '${frames.at(-1).f}'`);
  writeFileSync(join(dir, "list.txt"), `ffconcat version 1.0\n${list.join("\n")}\n`);
  const out = join(ROOT, "public/work", `${id}-live`);
  const vf = "scale=1280:-2:flags=lanczos,fps=30,format=yuv420p";
  const ff = (args) => execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), ...args]);
  ff(["-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "29", "-movflags", "+faststart", "-an", `${out}.mp4`]);
  ff(["-vf", vf, "-c:v", "libvpx-vp9", "-crf", "41", "-b:v", "0", "-row-mt", "1", "-an", `${out}.webm`]);
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-i", frames.at(-1).f, "-vf", "scale=1280:-2:flags=lanczos", "-quality", "80", `${out}.webp`]);
  const secs = frames.at(-1).t - frames[0].t;
  rmSync(dir, { recursive: true, force: true });
  return { secs: Math.round(secs * 10) / 10 };
}

const which = process.argv[2] ? [process.argv[2]] : Object.keys(SCENES);
const file = join(ROOT, "src/data/footage.json");
const meta = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
for (const id of which) {
  const r = await record(id);
  meta[id] = { recorded: new Date().toISOString().slice(0, 10), seconds: r.secs, url: id === "starweave" ? "https://starweaves.vercel.app/" : "https://arthouse-atlas.vercel.app/" };
  console.log(id, r);
}
writeFileSync(file, `${JSON.stringify(meta, null, 2)}\n`);
