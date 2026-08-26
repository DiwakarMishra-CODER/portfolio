import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import AmbientBackground from "@/components/AmbientBackground";
import CursorFollow from "@/components/CursorFollow";
import "./globals.css";

// Display face: Bricolage Grotesque — used bold/heavy (weight 700-800) for
// the "SOFTWARE ENGINEER" headline and the "DIWAKAR MISHRA" eyebrow.
// Replaced Bebas Neue, which only shipped weight 400 and had to carry its
// identity through size alone; Bricolage carries it through real weight.
const displayFace = Bricolage_Grotesque({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// SERP / social text only — never rendered on the page, so it deliberately
// does NOT reuse the hero tagline (which it used to duplicate verbatim).
// ~165 chars keeps it inside Google's truncation window.
const SITE_DESCRIPTION =
  "Diwakar Mishra — software engineer, CSE-AI class of 2028. A citation-sourced influence map of 297 indie artists, a 497-film recommender, and a spoken mock-interview scorer.";

// Absolute base for the Open Graph image URL. Without this, Next resolves
// the card image against http://localhost:3000, so LinkedIn/Twitter fetch a
// URL that doesn't exist publicly and the preview silently falls back to a
// bare link. Vercel injects VERCEL_PROJECT_PRODUCTION_URL automatically, so
// this needs no configuration on deploy; set NEXT_PUBLIC_SITE_URL to
// override (e.g. once a custom domain is attached).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Diwakar Mishra — Software Engineer",
  description: SITE_DESCRIPTION,
  // Open Graph / Twitter cards: this link gets shared on LinkedIn and in
  // recruiter DMs, where a bare URL with no preview is a wasted first
  // impression. The card image itself is generated at /opengraph-image.
  openGraph: {
    title: "Diwakar Mishra — Software Engineer",
    description: SITE_DESCRIPTION,
    type: "website",
    siteName: "Diwakar Mishra",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diwakar Mishra — Software Engineer",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFace.variable} ${hankenGrotesk.variable} h-full`}
    >
      <body className="min-h-full bg-cream text-ink antialiased">
        <AmbientBackground />
        {children}
        <CursorFollow />
      </body>
    </html>
  );
}
