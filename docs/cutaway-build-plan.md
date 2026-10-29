# Cutaway — build plan

> **Status (2026-10-29):** steps 1–8 below were built as Cutaway v1. The hero was then replaced twice — the Drop → "Assembly" → **"The Board"** (current; see `CLAUDE.md`). **Next:** the scroll hand-off from the board (a display module lifts off into its teardown), then the lower sections (Work, Test bench, Layer 0, title block) rebuilt in the board's language. The table is kept as the record of v1.

Design: see "The concept — Cutaway" in `CLAUDE.md`. Built directly in the real site, one step at a time; each step is checked in a headless browser (once, targeted) and shown before the next starts.

| # | Step | Needs | Check |
| --- | --- | --- | --- |
| 1 | **Foundation** — remove Golden Hour (sky, embers, aurora, star cursor, bento, old cards); tokens, Archivo + Martian Mono, film base, layout shell | — | typecheck + lint, page renders |
| 2 | **The Drop** — five real layers (base, grid, work, type, interface) in a CSS 3D stage; load animation on CSS alone (plays before hydration); alignment marks coincide on lock; any input skips; short version on return visits (pre-paint `data-visit` script); static under reduced motion | screenshots of both projects | frames at 0 / 0.6 / 1.2 / 2.0s; 390px + 1440px |
| 3 | **Exploded view** — scroll-linked (native scroll) tilt + spread; flat 2D callouts tracked to each layer's projected anchor; live viewport-width dimension line | — | frames across the scroll track; no horizontal scroll |
| 4 | **Starweave teardown** — cover lifts; "Connect two" machine runs the site's real weighted Dijkstra (`findBestSourcedPath`, hop costs 0.10/0.35/0.60) on the real 296-artist / 945-link graph, expansion animated in settle order; best route with its quotes and sources; data layer; parts list | `public/data/starweave.json` built from Starweave's `graph.json` by a script | path matches Starweave's own result for a known pair |
| 5 | **Arthouse teardown** — cover lifts; "Pick three films" machine runs the site's real `rankCandidates` (EASE neighbours) client-side; per-seed contribution bars (hatch patterns, colour-blind safe); top pick with its real co-love count | `public/data/arthouse.json` built from `neighbours.json` + `together.json` + titles/stills | ranking matches the backend function for a known seed set |
| 6 | **Test bench, Layer 0, title block** — live checks on the shipped data + page weight; recorded results labelled with dates; portrait + facts + spec table; title-block footer with email, links, résumé, revision | link check at build time | every `href` resolves; `curl` shows real numbers |
| 7 | **X-ray mode + New Game+** — `X` key / nav toggle outlines named parts, HUD with live fps, page weight, DOM count; return visit gets the short Drop and a "since you were here" note | — | toggle on/off, reduced motion, no-JS read |
| 8 | **Finish** — OG card + favicon in the new language, README, CLAUDE.md architecture, full pass at 390 / 1024 / 1440, reduced motion, JS off | — | one final pass |
