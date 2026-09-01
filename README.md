# Diwakar Mishra — Portfolio

Personal portfolio site, built with Next.js. Three real projects, each a
working web app with its own live URL and source: an influence graph for
indie music, a recommender for arthouse cinema, and an AI-driven mock
interview platform.

**Live:** [diwakar-mishra-portfolio.vercel.app](https://diwakar-mishra-portfolio.vercel.app)

![Diwakar Mishra — Software Engineer](https://diwakar-mishra-portfolio.vercel.app/opengraph-image)

## Projects showcased

| | |
| --- | --- |
| **[Starweave](https://starweaves.vercel.app/)** | An interactive influence graph of 297 indie artists and 1,053 sourced connections. Weighted-Dijkstra search over citation quality, laid out with heavy-path decomposition and interval-graph colouring. ([source](https://github.com/DiwakarMishra-CODER/starweave)) |
| **[Arthouse Atlas](https://arthouse-atlas.vercel.app/)** | A recommender for 497 curated arthouse films. Per-user taste profile weighted by interaction type, plus a separate scoring pass for how canonical each film is. ([source](https://github.com/DiwakarMishra-CODER/Arthouse-Atlas)) |
| **[CareerSaarthi](https://careersaarthi.vercel.app/)** | A voice-based mock interview coach — live transcription, timed auto-submit, and LLM scoring on clarity and structure. ([source](https://github.com/DiwakarMishra-CODER/CareerSaarthi)) |

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** (`@theme inline`)
- **[motion](https://motion.dev)** (the successor to Framer Motion), imported from `motion/react`
- Fonts via `next/font/google` — Bricolage Grotesque (display) + Hanken Grotesk (body)

## Design system

Built around a locked palette and motion language ("Golden Hour"): a
twilight → amber → coral sunset gradient, one cubic-bezier ease-out curve
used everywhere, and a warm cream/ink pairing for the calm sections. Every
section shares the same tile shell, reveal mechanics, and per-project accent
color, so three visually distinct project cards read as one system rather
than three one-off components.

## A few implementation details

Not exhaustive — the parts that were the least obvious to get right.

- **Reduced-motion and pointer-type checks are hydration-safe.** `usePrefersReducedMotion`, `useHasFinePointer`, and `useHasMounted` (`src/lib/`) all use React's `useSyncExternalStore` rather than a `useEffect` + `useState` flash, so there's no first-paint flicker and no hydration mismatch warning.
- **Animated stat counters render their final value in the server-rendered HTML**, not their starting `0`. The count-up only takes over once the client has mounted — otherwise a crawler or a link-preview scraper that doesn't execute JavaScript sees zeroes where the strongest numbers on the page should be.
- **The Open Graph card is generated at build time**, not on the edge. `src/app/opengraph-image.tsx` uses `next/og`'s `ImageResponse` with the default runtime, so the card is static and prerendered rather than rendered per-request.
- **The favicon is drawn as SVG paths, not `<text>`.** A favicon rasterizes at 16px in a context with no guarantee a given font is installed; paths render identically regardless.
- **Every stat, claim, and delta on the page traces to a real, re-runnable number** — no adoption/traffic claims, and any percentage keeps its baseline visible (e.g. "70% to 11%," never "84% better").

## Running locally

```bash
git clone https://github.com/DiwakarMishra-CODER/portfolio.git
cd portfolio
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). `npm run build` produces a
production build; every route is statically prerendered.

## Structure

```
src/
├── app/
│   ├── layout.tsx           # fonts, metadata, mounts the site-wide layers
│   ├── page.tsx             # composes Hero / Projects / About / Contact
│   ├── opengraph-image.tsx  # social card, generated at build time
│   └── icon.svg             # favicon
├── components/              # one file per section + shared site-wide layers
│   ├── Hero.tsx / GoldenHourSky.tsx / HeroEmbers.tsx
│   ├── Projects.tsx / ProjectCard.tsx
│   ├── About.tsx
│   ├── Contact.tsx
│   ├── AmbientBackground.tsx / CursorFollow.tsx   # mounted once, site-wide
│   └── ...
└── lib/                      # hydration-safe hooks (see above)
```

## Contact

[diwakarmishraemail@gmail.com](mailto:diwakarmishraemail@gmail.com) ·
[LinkedIn](https://www.linkedin.com/in/diwakar-mishra-dev) ·
[GitHub](https://github.com/DiwakarMishra-CODER) ·
[LeetCode](https://leetcode.com/u/DiwakarCracksIt/)
