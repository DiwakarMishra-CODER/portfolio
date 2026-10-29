# Diwakar Mishra — Portfolio

**The Board.** The first screen is one working circuit board, and every part on it is something I built or earned.

On load, the board gets made. A laser engraves my name into the processor. Copper grows out of it, the green solder mask floods over, the parts drop into place. The USB cable clicks in and the board powers on: the current runs along every trace, and both projects boot on their own screens. The menu is four real switches; X-ray is a DIP switch.

Below that, each project's real algorithm runs on its real data. Pick two artists and Starweave's route finder searches 945 sourced links for the best-documented chain between them. Pick three films and Arthouse Atlas's recommender scores them while you watch.

## Projects taken apart

| | |
| --- | --- |
| **[Starweave](https://starweaves.vercel.app/)** | An influence map of indie music: 296 artists, 945 links, every one with a named source (696 in the artist's own words). The machine is the live site's weighted Dijkstra, ported line for line. ([source](https://github.com/DiwakarMishra-CODER/starweave)) |
| **[Arthouse Atlas](https://arthouse-atlas.vercel.app/)** | A film recommender for people new to arthouse cinema: 1,120 films, EASE trained on 32,000,204 MovieLens ratings. Tested on 11,090 held-out people: 34.8% found their next favourite in its top 10, against 7.4% for the old engine. ([source](https://github.com/DiwakarMishra-CODER/Arthouse-Atlas)) |

## How it's built

- **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4**. No animation library and no WebGL. The opening is CSS keyframes on one shared clock, so it plays before hydration; the laser, the copper and the current are Canvas.
- **The board is real geometry.** One spec per layout (176 × 104 mm landscape, 64 × 232 mm for phones) generates every layer as SVG. A design-rule check fails the dev build if a trace doesn't end on a pad.
- **Type:** Mona Sans. The name is Bodoni Moda capitals, shipped as path data. Each project keeps its own fonts inside its screen.
- **The machines are the real code.** `src/lib/machines/` ports Starweave's `findBestSourcedPath` and Arthouse's `rankCandidates`. Both were checked against the originals on 1,161 routes and 321 film triples, with identical results.
- **The test bench is real too.** Its live checks run in your browser against the shipped data: every link sourced, no denied influence drawn, every printed figure re-derived. Its recorded checks say so and carry their date.
- **X-ray mode.** Press `X` to outline and name every part, with live frame rate and page weight.
- **Light.** All text in the server HTML, readable with JavaScript off. Nothing animates under reduced motion, and any key, click or scroll skips the opening.

## Updating the data

The machines read generated files in `public/data/`. Regenerate them from local checkouts of the two projects:

```sh
node scripts/data/starweave.mjs ../starweave           # reads its built public/graph.json
node scripts/data/arthouse.mjs ../Arthouse-Atlas       # reads backend/data/recs, fetches titles from the live API
```

Then update the printed figures in `src/data/figures.ts`. The test bench fails loudly if the Starweave ones drift from the data. Re-run the link check with the dev server up:

```sh
npm run dev
node scripts/check-links.mjs http://localhost:3000     # writes src/data/linkcheck.json
```

## Run

```sh
npm install
npm run dev
```

Design and engineering decisions are recorded in [`CLAUDE.md`](CLAUDE.md).
