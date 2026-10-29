import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Oswald, Permanent_Marker } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { T } from "@/components/hero/timeline";

// Host face: Mona Sans, one vendored static cut. (The name itself is no
// font: it's engraved in a single-line hand drawn for it, hero/name/glyphs.ts.)
const mona = localFont({
  variable: "--font-mona",
  src: [{ path: "../assets/fonts/MonaSans-Medium.woff2", weight: "500", style: "normal" }],
});

// Guest faces — each project keeps its own type inside its own panel. Not
// preloaded: they never block the host's first paint.
// Starweave (its app/layout.tsx): Fraunces, IBM Plex Mono, Permanent Marker.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600"], style: ["normal", "italic"], preload: false });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500"], preload: false });
const marker = Permanent_Marker({ variable: "--font-marker", subsets: ["latin"], weight: ["400"], preload: false });
// Arthouse Atlas (its index.html): Newsreader + Oswald. Its credits are set
// light at display sizes, where Newsreader's optical sizing picks the display
// cut — so ship exactly those two static cuts (vendored, ~23 KB each) instead
// of the whole variable font (~88 KB).
const newsreader = localFont({
  variable: "--font-newsreader",
  preload: false,
  src: [
    { path: "../assets/fonts/Newsreader-Display-Light.woff2", weight: "300", style: "normal" },
    { path: "../assets/fonts/Newsreader-Italic-Light.woff2", weight: "300", style: "italic" },
  ],
});
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["400"], preload: false });

// SERP / social text only — never rendered on the page.
const SITE_DESCRIPTION =
  "Diwakar Mishra — software engineer, CSE-AI class of 2028. Two products taken apart: an influence map of 296 indie artists with every link sourced, and a 1,120-film recommender.";

// Absolute base for the Open Graph image and the canonical URL. PREFER SETTING
// NEXT_PUBLIC_SITE_URL EXPLICITLY IN THE VERCEL PROJECT — the
// VERCEL_PROJECT_PRODUCTION_URL fallback resolves to whatever hostname Vercel
// auto-assigned, which can silently point at a stale host (see CLAUDE.md).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Diwakar Mishra — Software Engineer",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Diwakar Mishra — Software Engineer",
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
    siteName: "Diwakar Mishra",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diwakar Mishra — Software Engineer",
    description: SITE_DESCRIPTION,
  },
};

// Runs before first paint: picks what the hero's opening does (see
// hero/clock.ts) — the full sequence; only the power-on if the page arrived
// slowly; nothing under reduced motion — and makes any key, click, wheel,
// touch or scroll skip to the finished board (landing on a #section scrolls,
// so that skips it too).
// `?t=<ms>` freezes the opening at that moment (for exact frames).
const INTRO_SCRIPT = `(function(){var d=document.documentElement,q=new URLSearchParams(location.search),t=q.get("t");
if(t!==null){window.__asmFreeze=+t||0;d.dataset.intro="play";d.dataset.freeze="";return}
if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var short=performance.now()>1500,t0=performance.now(),ev=["keydown","pointerdown","wheel","touchstart","scroll"];
d.dataset.intro=short?"play short":"play";
function off(){ev.forEach(function(e){removeEventListener(e,skip,true)})}
function skip(e){if(e.type==="keydown"&&/^(Meta|Control|Alt|Shift)$/.test(e.key))return;
d.dataset.intro=short||performance.now()-t0>${T.powerOn - 200}?"done quiet":"done";off()}
ev.forEach(function(e){addEventListener(e,skip,{capture:true,passive:true})});setTimeout(off,${T.end + 800})})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={[mona, fraunces, plexMono, marker, newsreader, oswald].map((f) => f.variable).join(" ")}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="bg-film text-ink antialiased">{children}</body>
    </html>
  );
}
