import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { HERO_LINE } from "@/data/copy";
import { AVAILABLE, PROJECTS, STATS } from "@/data/site";

// The link preview (LinkedIn, WhatsApp, recruiter DMs): often the first
// thing a recruiter sees, so it says what the first screen says, in the
// first screen's look (warm sand, the dawn glow, the "dm" mark): who, the
// ask, what he builds, what he's shipped, his record. The type is a vendored
// static Archivo read from the repo (no network font fetch at build); the
// route avoids `runtime = "edge"`, which would disable prerendering.
export const alt = "Diwakar Mishra, software engineer: open to frontend, backend and full-stack internships.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#141413";
const GRAPHITE = "#5C5B56";
const SIGNAL = "#FF4F00";

export default async function OpengraphImage() {
  const fontDir = path.join(process.cwd(), "src/assets/fonts");
  const [display, body] = await Promise.all([
    readFile(path.join(fontDir, "Archivo-Expanded-ExtraBold.ttf")),
    readFile(path.join(fontDir, "Archivo-Regular.ttf")),
  ]);
  // (Plain hyphens: the card's font may not carry the non-breaking one.)
  const plain = (t: string) => t.replace(/‑/g, "-");
  const record = STATS.map((s) => `${s.label} ${s.value}${s.unit ? ` ${s.unit}` : ""}`).join("   ·   ");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 84px 58px",
          background: "radial-gradient(60% 75% at 92% 30%, rgba(244,163,122,0.55) 0%, rgba(244,163,122,0) 70%), #F1E7D9",
          color: INK,
          fontFamily: "Archivo",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* The "dm" mark (the favicon). */}
          <svg width="64" height="64" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="s" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F5C542" />
                <stop offset="0.5" stopColor="#E8934A" />
                <stop offset="1" stopColor="#E4674F" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#s)" />
            <path
              fill="#F4EEE4"
              d="M25 14h6v36h-6v-3.2a10.6 10.6 0 0 1-6.7 2.4C12.1 49.2 8 44.4 8 37.6S12.1 26 18.3 26a10.6 10.6 0 0 1 6.7 2.4V14Zm-6.1 17.5c-3.3 0-5.6 2.6-5.6 6.1s2.3 6.1 5.6 6.1 5.7-2.6 5.7-6.1-2.4-6.1-5.7-6.1Z"
            />
            <path
              fill="#F4EEE4"
              transform="translate(-4 0) scale(0.94 1)"
              d="M36 26.8h5.7v2.7a7.4 7.4 0 0 1 5.6-2.5c2.4 0 4.3 1 5.4 2.9a7.9 7.9 0 0 1 6.1-2.9c4.3 0 7.2 3 7.2 7.7V50h-5.9V36.2c0-2.4-1.3-3.9-3.4-3.9s-3.6 1.6-3.6 4.1V50h-5.9V36.2c0-2.4-1.3-3.9-3.4-3.9s-3.5 1.6-3.5 4.1V50H36V26.8Z"
            />
          </svg>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 22px", borderRadius: 999, border: `2px solid ${INK}`, background: "#FFFFFF", fontSize: 24 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#1FA65A", display: "flex" }} />
            {plain(AVAILABLE)}
          </div>
        </div>

        <div style={{ marginTop: 56, fontFamily: "Archivo Expanded", fontSize: 94, fontWeight: 800, lineHeight: 0.95, letterSpacing: -2, display: "flex" }}>Diwakar Mishra</div>
        <div style={{ marginTop: 26, fontSize: 38, display: "flex" }}>{HERO_LINE}</div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 27, color: GRAPHITE }}>
            <span>Shipped:&nbsp;</span>
            <span style={{ color: INK, borderBottom: `3px solid ${SIGNAL}` }}>{PROJECTS[0].name}</span>
            <span>, a {PROJECTS[0].short}, and&nbsp;</span>
            <span style={{ color: INK, borderBottom: `3px solid ${SIGNAL}` }}>{PROJECTS[1].name}</span>
            <span>, a {PROJECTS[1].short}.</span>
          </div>
          <div style={{ display: "flex", fontSize: 21, letterSpacing: 1.5, textTransform: "uppercase", color: GRAPHITE }}>{record}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: body, weight: 400, style: "normal" },
        { name: "Archivo Expanded", data: display, weight: 800, style: "normal" },
      ],
    }
  );
}
