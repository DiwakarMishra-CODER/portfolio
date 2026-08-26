import { ImageResponse } from "next/og";

// Social card for LinkedIn / Twitter / recruiter DMs — the previous build
// had none, so sharing the link rendered as a bare grey box, which is a
// wasted first impression for a portfolio whose whole pitch is visual.
//
// Rendered by Satori, which supports only a subset of CSS: flexbox yes,
// CSS grid no, and no external stylesheets or CSS custom properties — hence
// the literal hex values below rather than the site's `var(--color-*)`
// tokens. The palette is still the locked Golden Hour one (see CLAUDE.md):
// twilight -> amber -> coral sky, cream type, gold sun-glow.
//
// No custom font is loaded on purpose: fetching Bricolage Grotesque here
// would make every build depend on a Google Fonts round-trip for a 1200x630
// PNG. The default heavy sans plus tight tracking gets close enough at
// card size.

// Deliberately NOT `runtime = "edge"`: the card is identical on every
// request, so the default runtime lets Next prerender it once at build time
// instead of rendering it per-request (edge would disable static generation
// for this route).
export const alt = "Diwakar Mishra — Software Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
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
          // The hero's own sky, top-left to bottom-right.
          backgroundImage:
            "linear-gradient(135deg, #6B8CAE 0%, #E8934A 58%, #E4674F 100%)",
          position: "relative",
        }}
      >
        {/* Gold sun-glow, upper-right — same light source as the live hero. */}
        <div
          style={{
            position: "absolute",
            top: -190,
            right: -150,
            width: 620,
            height: 620,
            borderRadius: 620,
            background:
              "radial-gradient(circle, rgba(245,197,66,0.72) 0%, rgba(245,197,66,0) 70%)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 27,
              fontWeight: 700,
              letterSpacing: 11,
              color: "#F4EEE4",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Diwakar Mishra
          </div>

          <div
            style={{
              marginTop: 20,
              fontSize: 136,
              fontWeight: 800,
              lineHeight: 0.86,
              letterSpacing: -4,
              color: "#F4EEE4",
              textTransform: "uppercase",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Software</span>
            <span>Engineer</span>
          </div>

          {/* MUST stay byte-identical to the hero tagline in Hero.tsx (it
              appears there twice, mobile + desktop). These are independent
              literals with no shared constant and have drifted once already —
              change all three together or not at all. */}
          <div
            style={{
              marginTop: 34,
              fontSize: 31,
              color: "#F4EEE4",
              opacity: 0.94,
              maxWidth: 830,
              lineHeight: 1.35,
              display: "flex",
            }}
          >
            I build complete products — data model, algorithm, interface.
          </div>
        </div>
      </div>
    ),
    size
  );
}
