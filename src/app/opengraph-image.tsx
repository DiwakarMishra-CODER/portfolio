import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { HERO_EYEBROW, HERO_LINE } from "@/data/copy";

// The link preview (LinkedIn, recruiter DMs): the hero in the Cutaway look —
// drafting film, alignment marks, a dimension line, the name set heavy.
// The name is set in a vendored static instance of Archivo (Expanded,
// ExtraBold) read from the repo — no network font fetch at build — and the
// route avoids `runtime = "edge"`, which would disable prerendering.
export const alt = "Diwakar Mishra — Software Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#141413";
const SIGNAL = "#FF4F00";

function Mark({ x, y }: { x: number; y: number }) {
  return (
    <svg width="34" height="34" viewBox="0 0 22 22" style={{ position: "absolute", left: x, top: y }}>
      <path d="M11 0v22M0 11h22" stroke="rgba(20,20,19,0.5)" strokeWidth="1" />
      <circle cx="11" cy="11" r="5" fill="none" stroke="rgba(20,20,19,0.5)" strokeWidth="1" />
    </svg>
  );
}

export default async function OpengraphImage() {
  const fontDir = path.join(process.cwd(), "src/assets/fonts");
  const [display, body] = await Promise.all([
    readFile(path.join(fontDir, "Archivo-Expanded-ExtraBold.ttf")),
    readFile(path.join(fontDir, "Archivo-Regular.ttf")),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 84px",
          background: "radial-gradient(120% 90% at 18% 8%, #F6F5F1 0%, #EDEBE5 60%)",
          position: "relative",
          color: INK,
          fontFamily: "Archivo",
        }}
      >
        <Mark x={20} y={20} />
        <Mark x={1146} y={20} />
        <Mark x={20} y={576} />
        <Mark x={1146} y={576} />
        {/* Dimension line: 1200 px, the card's real width. */}
        <div style={{ position: "absolute", top: 64, left: 84, right: 84, display: "flex", alignItems: "center", color: "#B83700", fontSize: 18, letterSpacing: 3 }}>
          <div style={{ width: 1, height: 14, background: SIGNAL, display: "flex" }} />
          <div style={{ flex: 1, height: 1.5, background: SIGNAL, opacity: 0.6, display: "flex" }} />
          <div style={{ padding: "0 14px", display: "flex" }}>1200 PX</div>
          <div style={{ flex: 1, height: 1.5, background: SIGNAL, opacity: 0.6, display: "flex" }} />
          <div style={{ width: 1, height: 14, background: SIGNAL, display: "flex" }} />
        </div>

        <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#5C5B56", display: "flex" }}>{HERO_EYEBROW}</div>
        <div style={{ marginTop: 18, fontFamily: "Archivo Expanded", fontSize: 124, fontWeight: 800, lineHeight: 0.9, letterSpacing: -3, textTransform: "uppercase", display: "flex", flexDirection: "column" }}>
          <span>Diwakar</span>
          <span>Mishra</span>
        </div>
        <div style={{ marginTop: 30, fontSize: 34, display: "flex" }}>{HERO_LINE}</div>
        <div style={{ position: "absolute", bottom: 64, left: 84, fontSize: 19, letterSpacing: 2.5, textTransform: "uppercase", color: "#5C5B56", display: "flex" }}>
          <span style={{ color: "#B83700" }}>01</span>&nbsp;&nbsp;Starweave&nbsp;&nbsp;·&nbsp;&nbsp;<span style={{ color: "#B83700" }}>02</span>&nbsp;&nbsp;Arthouse Atlas&nbsp;&nbsp;—&nbsp;&nbsp;two products, taken apart
        </div>
      </div>
    ),
    { ...size, fonts: [
        { name: "Archivo", data: body, weight: 400, style: "normal" },
        { name: "Archivo Expanded", data: display, weight: 800, style: "normal" },
      ] }
  );
}
