// The facts every section prints, in one place. Must agree with the résumé in
// public/: a reviewer who opens both will cross-check. Two claims are
// deliberately weaker than they could be; do not "restore" it: the CGPA
// carries no class rank (unconfirmed). LeetCode comes from his real profile
// (src/data/leetcode.json; refresh with scripts/data/leetcode.mjs).
import leetcode from "@/data/leetcode.json";
import { ARTHOUSE as A, STARWEAVE as S, fmt } from "@/data/figures";

export const NAME = "Diwakar Mishra";
export const EMAIL = "diwakarmishraemail@gmail.com";
export const RESUME = "/Diwakar-Mishra-Resume.pdf";
export const GITHUB = "https://github.com/DiwakarMishra-CODER";
export const LINKEDIN = "https://www.linkedin.com/in/diwakar-mishra-dev";
export const LEETCODE = "https://leetcode.com/u/DiwakarCracksIt/";

// TO CONFIRM with Diwakar: the season he's applying for.
// The hero's pill (one short line) and the contact heading (says when).
export const AVAILABLE = "Open to internships · frontend, backend, full‑stack";
export const LOOKING = { ask: "Looking for a software engineering internship.", detail: "Frontend, backend or full‑stack. Remote or in Delhi NCR. I can start now." };
export const STUDY = "B.Tech CSE (AI) at MAIT, Delhi. Class of 2028.";

// The hero's floor plaques (CodeX is on the résumé, not the page: owner's call).
export const STATS = [
  { label: "CGPA", value: "9.43", unit: "/ 10", note: "B.Tech CSE (AI)", href: null },
  {
    label: "LeetCode",
    value: String(leetcode.rating),
    unit: leetcode.rating >= 1850 ? "Knight" : "",
    note: `Contest rating · Knight badge at 1850+ · ${leetcode.solved.All} solved`,
    href: LEETCODE,
  },
  { label: "Flipkart GRiD 8.0", value: "Semi-finalist", unit: "", note: "Out of 170,000+ registrations", href: null },
] as const;

export const TOOLKIT = ["C++", "TypeScript", "JavaScript", "SQL", "React", "Next.js", "Node.js", "Express", "MongoDB", "PostgreSQL", "Tailwind CSS", "Canvas", "D3", "Git"];

export type Project = {
  id: "starweave" | "arthouse";
  name: string;
  year: string;
  line: string;
  /** What it is in a few words (the hero's "Shipped" line). */
  short: string;
  /** The real product, recorded from the live site (scripts/footage/record.mjs). */
  footage: { mp4: string; webm: string; poster: string; alt: string };
  live: string;
  source: string;
  image: string;
  alt: string;
  machineTitle: string;
  machineNote: string;
  facts: { value: string; label: string }[];
  parts: { k: string; v: string }[];
};

// Every figure is the canonical one in CLAUDE.md (Starweave's 2026-10-26
// source pass, Arthouse's 2026-10-22 evaluation).
export const PROJECTS: Project[] = [
  {
    id: "starweave",
    name: "Starweave",
    year: "2026",
    line: "A map of who influenced whom in indie music. Every link has a source.",
    short: "music influence map",
    footage: {
      mp4: "/work/starweave-live.mp4",
      webm: "/work/starweave-live.webm",
      poster: "/work/starweave-live.webp",
      alt: "Starweave in use: the map of artists, a search for Radiohead, and the map pulling in who shaped Radiohead and who they shaped.",
    },
    live: "https://starweaves.vercel.app/",
    source: "https://github.com/DiwakarMishra-CODER/starweave",
    image: "/work/starweave-map.png",
    alt: "Starweave's live map: indie artists as points of light, grouped by scene, joined by influence lines.",
    machineTitle: "Connect two artists",
    machineNote: "The route finder from the live site, on its real map. Weaker evidence costs more, so it walks around a secondhand claim.",
    facts: [
      { value: fmt(S.artists), label: "artists" },
      { value: fmt(S.links), label: "influence links" },
      { value: fmt(S.sourced), label: "with a named source" },
      { value: fmt(S.firstPerson), label: "in the artist's own words" },
    ],
    parts: [
      { k: "Built with", v: "Next.js 16, React 19, TypeScript, Canvas, Web Audio" },
      { k: "Inside", v: "Weighted route search (Dijkstra), map layout solved at build time" },
      { k: "Tests", v: "174 cases in 22 files, run on every push" },
    ],
  },
  {
    id: "arthouse",
    name: "Arthouse Atlas",
    year: "2026",
    line: "A film recommender for people new to arthouse cinema.",
    short: "film recommender",
    footage: {
      mp4: "/work/arthouse-live.mp4",
      webm: "/work/arthouse-live.webm",
      poster: "/work/arthouse-live.webp",
      alt: "Arthouse Atlas in use: Parasite's page, then its films to watch next: Get Out, Everything Everywhere All at Once, The Wolf of Wall Street.",
    },
    live: "https://arthouse-atlas.vercel.app/",
    source: "https://github.com/DiwakarMishra-CODER/Arthouse-Atlas",
    image: "/work/arthouse-persona.jpg",
    alt: "Arthouse Atlas showing Persona: a black-and-white still with Ingmar Bergman's credit.",
    machineTitle: "Pick three films",
    machineNote: "The live site's own recommender. Each film you pick votes for the films its fans loved, learned from 32 million ratings.",
    facts: [
      { value: fmt(A.films), label: "films" },
      { value: fmt(A.directors), label: "directors" },
      { value: fmt(A.lists), label: "critics' and festival lists" },
      { value: `${A.hitRate}%`, label: `found their next film in its top 10 (the site's first engine: ${A.oldHitRate}%)` },
    ],
    parts: [
      { k: "Built with", v: "React 19, Vite, Node and Express, MongoDB, D3" },
      { k: "Inside", v: "EASE recommender (λ = 100), a canon score across 20 lists" },
      { k: "Tests", v: "96 backend and 11 frontend cases" },
    ],
  },
];
