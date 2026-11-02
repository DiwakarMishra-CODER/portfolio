import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// The site's one family: a variable grotesk, so headings get real weights.
const sans = Schibsted_Grotesk({ variable: "--font-sans", subsets: ["latin"] });

// SERP / social text only — never rendered on the page.
const SITE_DESCRIPTION =
  "Diwakar Mishra — software engineer, CSE-AI class of 2028. Two products, built end to end: an influence map of 312 indie artists with every link sourced, and a 1,120-film recommender.";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={sans.variable}
    >
      <body className="text-ink antialiased">{children}</body>
    </html>
  );
}
