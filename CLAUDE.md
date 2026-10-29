# Diwakar Mishra — Portfolio

Personal portfolio for a **software engineer** — B.Tech CSE-AI student (MAIT, 2024–2028), building full-stack apps and shipping them live. Built for an SDE internship / new-grad hunt covering **both big tech (Google, Amazon) and startups / small companies**.

That second audience is the one this site is actually for. At big tech the pipeline is resume screen → online assessment → interviews, and no portfolio helps with the OA — his LeetCode 1875 (Knight) and 9.43 CGPA carry that. **At a startup the portfolio often IS the screen:** a founder or a two-person eng team reviewing 40 applicants will click the link and will play with the live demos, and they weight end-to-end product ownership far above contest rating. So the site optimises for *"this person can build a complete thing by themselves"*.

This file is the **current-state** source of truth for design/technical decisions — what's true now, not how we got here (git history holds that). Follow it for all future work unless the user explicitly changes something. Add a one-line note under **Recent changes** for durable decisions; don't narrate.

## The concept — "Cutaway" (approved 2026-10-29)

**Every product has a finished front and a working inside. This site shows both, and the visitor controls the cut.**

Why this and not something else — don't relitigate without a strong reason:

- His two flagship projects each own a medium: **Starweave** turns indie-music culture into objects (zines, a pocket player, riso prints, dark ink + aged paper); **Arthouse Atlas** turns cinema craft into UI (projector light, leader countdowns, black + one gold). A portfolio in either medium reads as a sequel and breaks the day a new project arrives.
- So the theme comes from **what he does**, not what the projects are about: the medium that is actually his is *software itself*. Every future project also has an inside, so the frame never needs to change.
- **The one rule that makes it land: the inside has to be running, and the visitor has to be able to touch it.** A watch with a glass back is mesmerising because the gears move; a diagram of gears is a textbook. Every "inside" on this site is real code on real data, never an illustration of one.
- The guests keep their own identity. A project's *interface layer* shows it in its own look; everything beneath is drawn in the host's language. The host is deliberately the opposite of both projects: **bright, exact, drawn** where they are dark and full of props.

Each section reveals the inside a different way, borrowed from a different tradition of how engineers show work — related, never repeated:

| Section | Tradition | What happens |
| --- | --- | --- |
| Hero — "The Board" (built) | manufacture | The first screen is one circuit board: the name laser-engraved on the processor, the projects as live display modules, achievements on LED displays. The opening makes it — laser, copper, mask, pick-and-place, the cable plugs in, power-on |
| First scroll — the handoff (next) | cutaway | A project's display module lifts off the board and comes forward into its teardown (not built yet — the earlier "chassis cracks open" idea belonged to the retired Assembly hero) |
| Work — Dissections (next) | dissection | Each part is taken apart in front of you, layer by layer, in its own materials, down to its running algorithm |
| How I work — Test bench | test report | Real checks run on the site's own data and tick in |
| Layer 0 | maker's mark | The one layer that doesn't come apart: him |
| Contact — title block | drawing title block | Drawn by, revision, date — and the email |
| Site-wide — X-ray | x-ray / cutaway illustration | One key makes the whole site show its parts |
| Return visits — New Game+ | (from games) | The site notices a second visit |

## Design system — Cutaway

> **Scope:** this section is the v1 system the **lower sections** still use (judged generic — they are to be rebuilt in the board's language). The hero has its own material, palette and type, described under *Hero — "The Board"* below; where the two disagree, the hero's rules win for new work.

### Material

- **Drafting film:** the page base is a warm-neutral off-white (`film`). Floating layers are translucent sheets (fill alpha scales with how far apart the stack is, so the assembled page reads as one page) with hairline edges and corner **alignment marks**. Assembled, every sheet's marks coincide into one crisp mark — that coincidence *is* the "click".
- **Hairlines, not boxes.** Structure is drawn with 1px ink lines at low alpha, leader lines, dimension lines with end ticks. No cards-with-shadows grammar, no bento.
- **Live drawing:** annotations show real, current values (the viewport-width dimension line reads the actual width and updates on resize). Never a fake number.
- **Banned, because they are the lazy version of this concept:** blueprint blue, graph-paper backgrounds, terminal/CLI styling, monospace everywhere, fake OS chrome.

### Color tokens

CSS variables in `src/app/globals.css`, exposed via Tailwind v4 `@theme inline`.

| Token | Hex | Role |
| --- | --- | --- |
| `film` | `#EDEBE5` | Page base |
| `sheet` | `#F7F6F2` | Raised sheets / plates |
| `ink` | `#141413` | Primary text, strong lines |
| `graphite` | `#5C5B56` | Secondary text (≥ 4.5:1 on film) |
| `hairline` | `rgba(20,20,19,.14)` | Default structural line |
| `signal` | `#FF4F00` | International orange — marks, strokes, large fills, anything pressable. **Never small text** (2.8:1 on film) |
| `signal-ink` | `#B83700` | Signal colour for small text (4.9:1 on film) |

Any other colour on the page comes from the projects themselves (their screenshots / their interface layer).

### Typography

- **Mona Sans Medium** (vendored `src/assets/fonts/MonaSans-Medium.woff2`, `--font-mona`) is the host's one family now: `font-display`, `font-body` and `font-mono` all map to it (globals.css). Archivo + Martian Mono were retired from the page; the Archivo TTFs remain only for the OG card.
- **The name** is Bodoni Moda capitals shipped as path data (`hero/name/outlines.json`), not a font.
- **Guests keep their own fonts inside their screens**, loaded `preload: false`: Starweave — Fraunces, IBM Plex Mono, Permanent Marker; Arthouse — vendored Newsreader (display light + italic), Oswald.

### Motion

Mechanical — distinct from Starweave (springy overshoot) and Arthouse (`steps()` flicker):

- `--ease-glide: cubic-bezier(0.65, 0, 0.35, 1)` — camera moves (in-out glide).
- `--ease-land: cubic-bezier(0.2, 0, 0, 1)` — parts arriving: fast, then a hard exact stop. No overshoot, no bounce, ever.
- `linear` — lines drawing (a plotter pen moves at constant speed).
- Transform + opacity only. No animated blur, no animated box-shadow.
- Everything respects `prefers-reduced-motion`: CSS motion via the media query; JS-driven motion checks `matchMedia` inside its effect (never during render, so there is no hydration mismatch). No animation library — CSS keyframes, `@property`, rAF and canvas only.
- Scroll-linked, never scroll-*jacked*: native scrolling always; a hurried reader passes any scene in a second.

### Performance budget

No WebGL — the 3D is CSS 3D on the real DOM. All text in server HTML; the site reads with JS off. Heavy data (the teardown machines) is fetched only when its section approaches. Target: LCP ≤ 2.5s and smooth on a mid-range phone; the opening animation runs on CSS alone so it plays before hydration.

## Copy & voice (LOCKED)

The site's prose is written **in Diwakar's own voice** — derived from his Starweave LinkedIn post, the Starweave About page, and his film reviews — but written for a reader who **arrives with zero context and about eight seconds.** Those two constraints fight each other, and the second one wins.

**THE RULE THAT OVERRIDES EVERYTHING: every line must stand alone.** Would someone who has never heard of these projects understand this sentence by itself? If not it doesn't ship, however good the writing is. A reviewer meeting a cryptic line thinks *"I don't know what this person does"*, then *"can this person explain a system simply?"* — a real negative signal for an engineer. **Clever writing that fails to communicate is worse than plain writing that succeeds.** This applies to callouts and labels too: a layer label must make sense to someone who doesn't know what a "layer" is.

Shipped, rejected, and not to be reintroduced in any form:

| Rejected line | Why it failed |
| --- | --- |
| *"I build things you can check, not things you have to trust."* | Check *what*? A riddle in the one slot that must say what he does. |
| *"I'd rather you check it than trust me."* | Same riddle. |
| *"Tell me an influence I've missed."* | An influence *of what*. A Starweave-specific ask used as the site's closing CTA. |
| *"Elliott Smith sounds nothing like Fugazi…"* | Two obscure artists in the most valuable sentence. State the principle, not the private example. |
| *"Half the map goes quiet."* | What map, what switch. |

**Specificity only helps when the specific thing is legible to a stranger.** His *numbers* pass that test; his *artist names* mostly do not. In the teardown machines, suggested inputs must be names a stranger knows (The Beatles, The Godfather), not deep cuts.

**No defensive phrasing** ("…myself", "I actually…"). State the thing; don't argue with an imagined charge.

**The register to imitate is a spec table** — CGPA / LeetCode rating / GRiD / CodeX. Hard facts, no adjectives. Sentences under ~12 words; prefer a fragment to a subordinate clause; state a number then stop, never characterise it; no marketing register ("platform", "seamless").

**Accuracy constraints.** Every claim traces to his résumé or the project repos; invent nothing. No adoption/traffic/stars claims. Deltas keep their baseline visible ("34.8%, against 7.4% for the old engine"). Recorded results are labelled as recorded (with their date); only checks that actually run in the browser are shown as live.

**Canonical project figures (as of the 2026-10-26 Starweave source pass and the 2026-10-22 Arthouse evaluation):**

- **Starweave:** 296 artists · 945 influence links, **every one sourced** (935 web pages + 10 print) · 696 in the artist's own words (first-person), 221 reported, 28 critic · 234 distinct source domains · 35 recorded denials · 53 genres · 16 scenes · 293 playable songs. The old 297 / 1,053 / 908 / 562 / 30 and the LinkedIn post's 293 / 1,041 / 887 / 544 are stale — never use them. The "70% → 11%" Dijkstra figure was measured on the old graph and must not be quoted until re-measured.
- **Arthouse Atlas:** 1,120 films (1,118 + 2 series) · 238 directors · 27 movements · 62 studios · 75 countries · 1915–2025 · canon from 20 critics' lists in 7 families (4,187 citations) · recommender is EASE (λ=100, 50 neighbours/film) on MovieLens ml-32m (32,000,204 ratings by 200,948 people) · tested on 11,090 held-out people: next-film-in-top-10 **34.8%**, against 7.4% for the old engine and 20.9% for "most popular". The old "497 films / 12 movements" is stale.

## Current architecture

One page (`src/app/page.tsx`): `SiteNav` · `Hero` · `Work` · `TestBench` · `LayerZero` · `TitleBlock` · `XRay`. Build plan and order: `docs/cutaway-build-plan.md`.

### Hero — "The Board" (`src/components/hero/`)

Approved plan: `~/.claude/plans/so-what-are-you-starry-shore.md`. Replaced "Assembly" (judged generic). The whole hero is **one circuit board**, deep matte green (`?mask=black` shows the black finish).

- **The name is engraved like a watch movement's signature** (`hero/name/`): Bodoni Moda capitals (SIL OFL; a static **text-size cut (opsz 11, weight 600)** subset vendored in `src/assets/fonts/` — the display cut's hairlines were too thin to read; **the name must never cost readability**, outlines extracted to `name/outlines.json` by `scripts/data/name-outlines.mjs` — the page ships path data, not a font), spaced, two lines, plus a DM hallmark in a fine ring. Chosen by the owner from six options rendered on the chip. At rest: a **bright-cut** static SVG (`Engraving.tsx`): light frosted floor (readability — every stroke keeps its weight), the wall facing the light lit with a crisp edge, the far wall in graded shadow, a fine rim on the light's side — all masks (a clipPath can't `use` a group). Drawn twice (lit from upper left / upper right) and blended by the pointer's `--px` (opacity only; own layers after the opening, so the masks never repaint). In the opening, like a real fibre-laser marker (`NameLaser.tsx`): a red guide frame flickers round the job (CSS, so it never waits for JS), then a hairline beam from optics above traces every outline (white-hot, frosted grey within ~0.3 s — no lingering orange) and rasters the fill as **frost forming behind a hot edge** (no visible lines); pale sparks and a faint fume haze drawn off by the extractor; the light pool follows the real pen. **The fill copies strips of the letters pre-rendered once into a small canvas — per-frame `clip()` on the glyph path dropped frames at 2×.** The `h1` carries the text. Rejected, don't retry: bold wide grotesk + orange gradient ("generic"); a hand-built rounded single-line alphabet ("childish"); Michroma engraved ("generic" — stock futuristic caps); routed-gold PCB lettering ("not working"); a drawn laser-head box ("cheap" — show the light, not fake hardware); his real signature was declined (forgery risk). **Gotchas:** an SVG gradient in `objectBoundingBox` units can't paint a perfectly straight stroke; Node's `fs.readFileSync(small).buffer` is the shared pool — slice by `byteOffset` before parsing a font.
- **What's on it, in plain words only** (no designators like R1/U3 — the owner's rule): the name laser-marked on the processor U1; Starweave and Arthouse as live display modules on ribbon cables; CGPA / LeetCode on 7- and 14-segment LED displays, GRiD / CodeX on OLEDs, each with a plain label; the menu as four tact switches; X-ray as a DIP switch.
- **Geometry is real and checked:** `board/spec.ts` (landscape, 176×104 mm) and `board/spec-phone.ts` (portrait, 64×232 mm) are the single sources of truth — same `Spec` shape. U1 legs on a 0.6 mm grid, every trace ends on a pad/leg/via, 45° chamfers, parallel buses. **The DRC (`geom.ts`) runs on both boards in dev** when `/board/board.svg` or `/board/board-p.svg` is requested — a bad route throws.
- **Static layers** are SVG strings (`board/layers.ts`) served by the force-static route `/board/[layer]` — `board`, `board-black`, `silk`, six `parts-<group>` images, `screw`, each with a `-p` phone twin, picked by `<picture><source media>`. **HTML parts carry both boards' coordinates** (`place(l, p)` → `--xl…`/`--xp…`; board.css picks by `(max-width: 699px)`). Phones get a natural-height board scrolled like the page.
- **One lamp, one shadow system** (`.elev`, scaled by `--hgt`), parallax by height, a 3.5° product-shot tilt (desktop only).
- **The bench** (owner's pick — keep it, refine it): a slate-blue anti-static mat (`.hb-bench`, CSS: dot grid on the board's 10 mm, lamp pool, vignette) with props drawn in `benchLayer` (`/board/bench.svg`): rulers printed at true board scale, stainless tweezers on the right, a reel of parts in the corner, loose passives — every prop with a soft blurred shadow down-right. The USB-C cable is its own layer (`cableLayer`, `/board/cable[-p].svg`, sized to its own box via `cableBox`) so it **plugs in during the opening** (`T.plug`: a held beat after the reflow glint, then glide → resistance → a hard-stop click; `plug-in` keyframes ease per stage). **Power-on fires at the click**: the power LED beside the port snaps on (`.led-snap`), a sheen sweeps the port (`.j1-flash`), the spark, current leaves the port. The receptacle is drawn top-down as the real steel tube (no face-on opening). Rejected: stripping the props for a plain black plate ("a black gradient bg") or an optical-breadboard hole grid — **improve what's there, don't remove it**.
- **The opening** (every visit; any key/click/wheel/touch/scroll skips; reduced motion and no-JS show the finished board): black → a red guide light frames the name, then a laser beam **engraves** it (outlines, then the fill), with sparks, then the DM hallmark (the chip held up close) → camera pulls back, copper grows out of the chip → green mask floods out from it, labels print → pick-and-place (parts drop by group, cables latch) → reflow glint → the USB cable plugs in (glide, resistance, click) → power-on at the click: current runs in from the USB port, fans out from U1 along every trace, LEDs and displays light as it reaches them (self-test frames), the room dims while the screens boot → every pressable thing is picked out in reading order (a bright ring closes in and locks on, `T.hint`/`hintStep`) → "Scroll to take it apart".
  - **Pressable = signal orange, always** (not only on hover): switches and the X-ray switch carry a lit orange ring, the project buttons are orange pills, every arrow that goes somewhere is orange. Lock-on rings are `::before` (opening only, `--hint-i` order); resting rings `::after`.
  - **One table of beats**: `timeline.ts` (CSS vars `--t-*`/`--d-*` on `.hb`, per-part `--at`). Current-arrival times come from `board/power.ts`, so a part lights exactly when its pulse reaches it.
  - **One clock**: `clock.ts` — zero is a 0×0 sentinel CSS animation's `startTime`, so canvases (sparks, Starweave stars) never drift from the CSS. `<html data-intro>` is set before first paint (`layout.tsx`): `play`, `play short` (arrived >1.5 s late: only the power-on plays, via `--shift`), `done…` (skipped), absent (reduced motion / no JS / anchor link).
  - **`?t=<ms>` freezes every animation at that moment** (`data-freeze` pauses all from the first frame, then the controller pins them) — use it for every visual check.
  - **Performance rules learned here** (measured as dropped/checkerboarded *displayed* frames from a GPU trace — `PipelineReporter` events — not script frame times, which looked fine while the screen visibly stuttered):
    - **Never zoom the whole board.** A transform animation is drawn at its largest scale × the screen's pixel density for its whole run; zooming the board 2.5× on a 2× Retina screen redrew every layer at 5× and ran the GPU out of memory (missing chip/mask, stutter). Only the chip group is magnified (`.u1-group`/`.u1-burn-group`, `MAC` in Board.tsx); the board only settles from 1.06×.
    - **`will-change: opacity`, never `transform`,** to isolate repainting layers (mask, copper, silk, pulses): a `will-change: transform` layer keeps the resolution it was first drawn at.
    - **Waiting parts start at 1% opacity, not 0** (and are pre-promoted): Chrome doesn't draw a fully transparent layer, so it would be drawn mid-animation with pieces missing.
    - **The opening ends itself** (`BoardController` sets `data-intro="done quiet"` at `T.end`), removing every intro-only layer and its memory.
    - Headless Chrome *with* the GPU (`--use-angle=metal`) reproduces real behaviour; headless-shell (software) does not. Run checks headless (never open a visible window) and at most 2–4 browsers at once.
- **Screens** keep their own identity and boot at their beats (`--t-boot1/2`): Starweave from `src/data/starweave-sky.json` (sprites, twinkle; Diwakar's picks: today's link is My Bloody Valentine, with Tame Impala's Kevin Parker on them — one whole sentence of a sourced quote from the data — the player shows Cocteau Twins' "Cherry-coloured Funk", and both bands' stars glow); Arthouse plays *Mulholland Drive*'s opening (Lynch, the owner's favourite), light sampled live with Arthouse's `readLight`. On phones the Starweave ticket, Arthouse's meta line and the caption notes are hidden to fit.

### Work — Teardowns (`src/components/work/`)

- `Teardown.tsx` is the shared frame: header (part number, name, one line, year) + **dock** (dashed 16:10 drop zone) → **case** (cover over machine) → **03 Data** facts → **04 Parts list**. The cover is the project's own screenshot (`public/work/`); as the case's top edge travels from 78% to 22% of the viewport, the cover lifts (translateZ + tilt arc), carries, and lands in the dock as the thumbnail (uniform scale — cover and dock are both 16:10, so the screenshot never stretches). Its shadow stays on the machine's plane. No pinning.
- **Machines run the live sites' own algorithms on their real data**, fetched only when within 900px of the viewport, auto-running once at 35% visibility:
  - `StarweaveMachine.tsx` — `src/lib/machines/starweave.ts` is a line-for-line port of Starweave's `findBestSourcedPath` + `HOP_COST` (0.10 / 0.35 / 0.60), plus a settle-order trace for the drawing. Canvas map of 296 artists / 945 links (build-time layout coordinates); the search spreads in true settle order, then recedes as the route draws at constant pen speed; the fewest-hops BFS route is dashed beside it when different. Pick via comboboxes (`ArtistPicker.tsx`), suggestion chips (names strangers know), or two clicks on the map. Step cards show the real quote + source for each hop. Default demo: **Bob Dylan → Radiohead** (3 first-person steps vs a 2-step route leaning on a secondhand report).
  - `ArthouseMachine.tsx` — `src/lib/machines/arthouse.ts` ports `rankCandidates` (EASE neighbours; score = Σ w·sim / Σ w) and keeps per-pick parts. Shelf of 18 well-known films (TMDB stills), FIFO max 3; bars stack each pick's share in **hatch patterns** (solid / diagonal / dots — colour-blind safe), growing pick by pick; top pick shows the real MovieLens co-love count.
  - Timings shown ("in 0.21 ms") are the real algorithm, repeated and averaged, never the animation.
- **Parity, verified 2026-10-29:** the ports match the live code on 1,161 Starweave pairs and 321 Arthouse triples. Re-check after regenerating data.
- **Data files** (`public/data/*.json`) are generated, never hand-edited: `node scripts/data/starweave.mjs <starweave checkout>` (reads its built `public/graph.json`) and `node scripts/data/arthouse.mjs <arthouse checkout>` (reads `backend/data/recs/*` and fetches titles from the live catalogue API). Each records its source commit.

### Test bench (`src/components/bench/TestBench.tsx`, section `#about`)

Seven rules, each a check. **Live** checks run in the visitor's browser on `public/data/starweave.json` (every link sourced; no denied influence drawn; every printed Starweave figure in `src/data/figures.ts` re-derived from the data; this page's own transfer size vs a 1,500 KB budget). **Recorded** checks say so and carry their date (port parity; the Arthouse evaluation; the link check from `scripts/check-links.mjs` → `src/data/linkcheck.json`). A failing check renders as a failure — never fake a pass. All page figures live in `src/data/figures.ts`; shared copy in `src/data/copy.ts`.

### Layer 0 (`src/components/about/LayerZero.tsx`) and title block (`src/components/contact/TitleBlock.tsx`)

- Layer 0 is the one solid sheet (no marks, no callouts): portrait, the About statement, the human note, spec table (must match the résumé exactly — see the comment in the file), toolkit.
- The title block is the footer: email as the primary CTA (local-part/`<wbr/>`/domain), then a drawing title block — title, drawn by, built date, links, revision (commit from `next.config.ts` env `NEXT_PUBLIC_REV`), sheet, scale.

### Site-wide

- `SiteNav` (fixed, slides in once the hero track has passed; the hero carries its own copy of the menu in its interface layer).
- **X-ray** (`src/components/xray/`): `X` key or the nav switch toggles `html[data-xray=on]`; every `[data-part]` gets a dashed signal outline and its name (pure CSS). The HUD shows live fps, page weight, script weight, element count, named parts, and the two motion curves. **Every `[data-part]` host must already be positioned** — never force `position` from the X-ray CSS (the hero layers are absolute).
- OG card (`src/app/opengraph-image.tsx`) uses vendored static Archivo TTFs in `src/assets/fonts/` (no network font fetch at build). Favicon is the alignment mark, paths only.

### Measured (production build, 2026-10-29, after the Board hero)

First load: JS ~197 KB, fonts 176 KB, board images ~134 KB (uncompressed by `next start`; Vercel compresses SVG), HTML 53 KB gz. LCP ~0.27 s locally. `/data/starweave.json` (108 KB) loads early only because the old Work section sits right below the hero — it goes when that section is rebuilt. Opening: 60fps headed Chrome, 4× CPU throttle.

## Reusable technical rules

- **An animated value must render its FINAL figure server-side, not its starting frame.** Crawlers and link-preview scrapers often don't run JS; a count-up seeded at 0 ships zeroes to exactly the readers that matter. **Check `curl` output, not the browser.**
- **Set `NEXT_PUBLIC_SITE_URL` explicitly on the Vercel project.** `VERCEL_PROJECT_PRODUCTION_URL` resolves to whatever hostname Vercel auto-assigned and can silently point at a stale host; verify `og:image`, `og:url` and canonical after deploy.
- **A broken primary CTA costs more than any amount of bad copy.** Enumerate every `href` and assert it resolves as a standing verification gate. When an asset is missing, remove the control rather than leave it broken.
- **Undated work reads as "unknown", and reviewers resolve unknowns pessimistically.** Every project carries a `year`; never hardcode a year of study.
- **Never read `matchMedia` (reduced motion, pointer type) during render** — the server can't know it, so the first client render would disagree. Read it inside effects or use CSS media queries.
- **A scripted check of a CSS animation should freeze it, not race it:** `document.getAnimations().forEach(a => { a.pause(); a.currentTime = t })` gives exact frames of the Drop.
- **React-compiler lint rejects ref-mutating callbacks created during render** (`ref={setAnchor(i)}`). Mark DOM points with `data-*` attributes and query them inside the effect instead.
- **Don't put an animated number on a shared line with anything else** — proportional width changes reflow its neighbours mid-count. Stack it alone on its line; keep `tabular-nums`.
- **Any element replayed per run must key off the raw incrementing counter, not a boolean derived from it** — a `false→true` toggle replays once and never again. The machines remount their results with `key={result.run}`.
- **A JSXText child's leading/trailing whitespace is trimmed even with no line break.** `<span>foo</span> bar` can render "foobar". Use `{" "}`.
- **Measuring rendered text width:** use a DOM `Range` over the text node, not the element's bounding box.
- **Absolutely-positioned children ignore a parent's padding** — use explicit insets.
- **Verify layout stability by sampling, not by screenshot** — read `getBoundingClientRect()` in one in-page `requestAnimationFrame` loop across the animation.
- **Playwright round-trip latency can eat a short animation** — sample `getComputedStyle` inside a single in-page rAF loop for ground truth.
- **Verifying "is this visible enough" requires actually looking** (screenshot), not opacity math.
- **A stale `.next` cache can silently serve stale CSS** — if a CSS change seems to have no effect, check `document.styleSheets`, then `rm -rf .next`. Same for `.next/dev/cache/images` after swapping a `public/` image.
- **Favicon letterforms are paths, not `<text>`** — an SVG favicon rasterises at 16px with no font guarantee.

## Working agreement

- This file is the source of truth. Reuse these tokens/patterns; don't introduce new ones without reason.
- Build directly in the real site (no throwaway prototypes), section by section, shown in the browser before moving on.
- **Never commit or push without the user's explicit permission, each time.** When a commit is approved, it is authored by the repo's configured identity only — **no `Co-Authored-By` trailer for Claude or anyone else.**
- Self-verify visual/behavioural changes in a headless browser — **as much as needed, no more**: one targeted check per change, fix what it finds, re-check only what was fixed. Don't re-verify what already looked right.
- Typecheck (`tsc --noEmit`) + lint are the correctness gate for logic.
- If a verification result looks wrong, suspect the measurement first. State uncertainty in one line and move on.
- Maintain this file yourself: one-line note under **Recent changes** for durable decisions; update architecture as sections ship.

## Recent changes

- **2026-10-29 — Concept "Cutaway" approved; Golden Hour retired.** The previous design system (sunset gradient, aurora, custom star cursor, bento About) was inherited from a PM portfolio, and its cursor/aurora/bento were all on the overused-portfolio list. Copy rules and technical rules carried over; numbers updated to the current Starweave/Arthouse figures. **CareerSaarthi removed from the site** (user decision) — the work is Starweave + Arthouse Atlas only. Build plan: `docs/cutaway-build-plan.md`.

- **2026-10-29 — Cutaway v1 built** (on `main`, uncommitted): the Drop + exploded view, two teardowns with live machines (parity-checked against the live sites' code), Test bench, Layer 0, title block, X-ray, New Game+, OG card + favicon. `motion` dependency and the old hooks removed (no animation library; nothing imported them).

- **2026-10-29 — Hero rebuilt as "Assembly"** after v1 was judged generic: one dark machine of live panels that assemble on load (each in its own idiom) and power on; Arthouse panel switched from Persona to Lynch's *Mulholland Drive* at Diwakar's request.

- **2026-10-29 — Readability pass on the hero:** every label ≥ 13 px at full contrast; switches say what they do (↓ section, ↗ résumé), light up in turn as the opening ends, ring on hover/focus; projects get two plain buttons (How it works ↓ · Live site ↗); LeetCode shows Knight + real rating/solved with its logo; phone board grew to 232 mm for roomier labels.
- **2026-10-29 — Hero rebuilt as "The Board"** (green circuit board, plain-words labels) with its opening sequence and a separate portrait board for phones. Next: hover wiring and the scroll handoff, then the lower sections in the board's language (they are still Cutaway v1).
- **2026-10-29 — Hero polish:** bench props restored and refined (soft shadows, aluminium USB-C plug that plugs in before power-on, which fires at the click); everything pressable is signal orange plus a lock-on pass at the end of the opening; the name is now bright-cut at rest and the laser fill is a frost sweep (no stripes, no orange ember). **Next: the scroll hand-off from the hero, then the lower sections rebuilt in the board's language.**

### Still outstanding (needs input from Diwakar)

- A re-measured Starweave weighted-vs-fewest-hops figure on the current 945-link graph, if he wants a delta quoted.
