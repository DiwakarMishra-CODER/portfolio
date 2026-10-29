// Builds public/data/arthouse.json — the slice of Arthouse Atlas's real
// recommender that the portfolio's "Pick three films" machine runs on.
//
//   node scripts/data/arthouse.mjs <path-to-arthouse-atlas-checkout>
//
// The model is the live site's own: backend/data/recs/neighbours.json (EASE,
// each film's 50 strongest learned links) plus together.json (how many
// MovieLens people loved both films). The portfolio offers a fixed shelf of
// well-known films to pick from, so only those films' neighbour lists ship.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repo = process.argv[2];
if (!repo) {
  console.error("usage: node scripts/data/arthouse.mjs <path-to-arthouse-atlas-checkout>");
  process.exit(1);
}
const read = (p) => JSON.parse(fs.readFileSync(path.join(repo, p), "utf8"));
const model = read("backend/data/recs/neighbours.json");
const together = read("backend/data/recs/together.json");
const resolution = read("backend/data/canon/tmdb-resolution.json");
const mosaic = read("frontend/public/mosaic/mosaic.json");
const commit = execSync("git log -1 --format=%h", { cwd: repo }).toString().trim();
const commitDate = execSync("git log -1 --format=%cs", { cwd: repo }).toString().trim();

// The shelf: films a stranger has heard of, spread across decades and
// countries, so any three picks pull the recommender somewhere different.
// Each must exist in the model; the build fails loudly if one doesn't.
const SHELF = [
  ["The Godfather", 1972],
  ["Pulp Fiction", 1994],
  ["Spirited Away", 2001],
  ["Parasite", 2019],
  ["In the Mood for Love", 2000],
  ["Taxi Driver", 1976],
  ["2001: A Space Odyssey", 1968],
  ["Seven Samurai", 1954],
  ["Mulholland Drive", 2001],
  ["Vertigo", 1958],
  ["Amélie", 2001],
  ["Oldboy", 2003],
  ["Pan's Labyrinth", 2006],
  ["Portrait of a Lady on Fire", 2019],
  ["Stalker", 1979],
  ["Persona", 1966],
  ["Before Sunrise", 1995],
  ["Mad Max: Fury Road", 2015],
];

// tmdbId → title / year / director. The catalogue itself lives in the live
// site's database, so ask its API (paged); the canon's TMDB resolution table
// fills any gap.
const API = "https://arthouse-atlas.onrender.com/api/movies";
const meta = new Map();
for (let page = 1; page < 50; page++) {
  const res = await fetch(`${API}?limit=200&page=${page}`, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`catalogue API ${res.status}`);
  const body = await res.json();
  const movies = Array.isArray(body) ? body : body.movies ?? [];
  if (movies.length === 0) break;
  for (const m of movies) if (m.tmdbId) meta.set(m.tmdbId, { t: m.title, y: m.year, d: m.directors?.[0] ?? "" });
}
for (const r of Object.values(resolution)) {
  if (r?.tmdbId && !meta.has(r.tmdbId)) {
    meta.set(r.tmdbId, { t: r.tmdbTitle || r.title, y: r.year, d: (r.directors || [r.director]).filter(Boolean)[0] || "" });
  }
}
// Stills (TMDB path) and the frame's dominant colour, matched by title + year.
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
const stills = new Map(mosaic.tiles.map((f) => [`${norm(f.t)}|${f.y}`, f.s]));

const films = {};
const addFilm = (id) => {
  if (films[id]) return true;
  const m = meta.get(Number(id));
  if (!m) return false;
  films[id] = [m.t, m.y, m.d, stills.get(`${norm(m.t)}|${m.y}`) || stills.get(`${norm(m.t)}|${m.y - 1}`) || stills.get(`${norm(m.t)}|${m.y + 1}`) || ""];
  return true;
};

const byTitle = new Map();
for (const id of Object.keys(model.films)) {
  const m = meta.get(Number(id));
  if (m) byTitle.set(`${norm(m.t)}|${m.y}`, id);
}

const shelf = [];
const neighbours = {};
const loved = {};
const both = {};
for (const [title, year] of SHELF) {
  const id = byTitle.get(`${norm(title)}|${year}`);
  if (!id) throw new Error(`shelf film not in the model: ${title} (${year})`);
  shelf.push(Number(id));
  addFilm(id);
  // [tmdbId, weight, reason] — reason: v viewers, d director, m movement, c country, y decade.
  neighbours[id] = model.films[id].nb.filter(([nid]) => addFilm(nid));
  loved[id] = together.n[id] ?? null;
  both[id] = Object.fromEntries(
    neighbours[id].map(([nid]) => [nid, together.both[id]?.[nid] ?? null]).filter(([, v]) => v != null)
  );
}
// Canon prior for tie-breaks (rankCandidates' compareRanked).
const prior = Object.fromEntries(Object.keys(films).map((id) => [id, model.films[id]?.prior ?? 0]));

const out = {
  source: `arthouse-atlas@${commit}`,
  sourceDate: commitDate,
  params: model.params,
  shelf,
  films,
  neighbours,
  prior,
  loved,
  both,
  minimumBoth: together.minimum,
};
fs.mkdirSync("public/data", { recursive: true });
fs.writeFileSync("public/data/arthouse.json", JSON.stringify(out));
const missingStills = Object.values(films).filter((f) => !f[3]).length;
console.log(
  `arthouse.json: shelf ${shelf.length}, ${Object.keys(films).length} films (${missingStills} without a still), from ${out.source} (${commitDate}), ${(fs.statSync("public/data/arthouse.json").size / 1024).toFixed(0)} KB`
);
