import { Newsreader, Oswald } from "next/font/google";

// Arthouse Atlas's own type, for its room and the lights going down:
// Newsreader for titles and reading, Oswald for labels and numbers.
export const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], weight: ["300", "400", "500"], variable: "--font-ah-serif", preload: false });
export const label = Oswald({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-ah-label", preload: false });
