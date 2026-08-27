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

// Absolute base for the Open Graph image and the canonical URL. Without it,
// Next resolves the card image against http://localhost:3000, so LinkedIn and
// Twitter fetch a URL that doesn't exist publicly and the preview silently
// degrades to a bare link.
//
// PREFER SETTING NEXT_PUBLIC_SITE_URL EXPLICITLY IN THE VERCEL PROJECT.
// The VERCEL_PROJECT_PRODUCTION_URL fallback works, but it resolves to
// whatever hostname Vercel auto-assigned that project — a name like
// `portfolio-seven-eosin-31.vercel.app`, generated on name collision. If the
// repo has ever been imported as more than one Vercel project, or a project
// was renamed or recreated, that auto-name can point somewhere stale, and the
// failure is silent and invisible on the page itself: the site loads fine
// while every social preview fetches its card from a dead host.
//
// Setting NEXT_PUBLIC_SITE_URL to the canonical address (the custom domain,
// or the intended *.vercel.app) removes the guesswork entirely. Verify after
// deploy by checking that og:image and the canonical link both point at the
// host you actually expect — see the metadata block below.
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
  // Declares the page's own canonical address, so a scraper that reaches the
  // site via any other host (a preview deployment, an alias, a stale
  // auto-generated URL) still attributes the preview and the search result to
  // one address instead of treating each host as a separate page.
  alternates: {
    canonical: "/",
  },
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
