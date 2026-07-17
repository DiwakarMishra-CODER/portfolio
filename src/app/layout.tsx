import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import AmbientBackground from "@/components/AmbientBackground";
import CursorFollow from "@/components/CursorFollow";
import "./globals.css";

// Display face: Bricolage Grotesque — used bold/heavy (weight 700-800) for
// the "PRODUCT MANAGER" headline and the "SHWETA KUMARI" eyebrow. Replaced
// Bebas Neue, which only shipped weight 400 and had to carry its identity
// through size alone; Bricolage carries it through real weight instead.
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

export const metadata: Metadata = {
  title: "Shweta Kumari — Product Manager",
  description:
    "Shweta Kumari, Product Manager — building and scaling digital products that captivate users and drive results.",
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
