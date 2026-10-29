// Builds the hero's Arthouse panel: one film's opening titles, the way the
// live film page plays them. Fetches the film's record from the live API,
// downloads the frames + the director's portrait into public/work/opening/,
// and writes src/data/arthouse-opening.json.
//
//   node scripts/data/arthouse-opening.mjs
//
// The film is Diwakar's choice (his favourite director). FRAMES are TMDB still
// ids from the film's own record: the first ones roll through the gate, the
// last is where it lands and the credits play over it.
import fs from "node:fs";

const API = "https://arthouse-atlas.onrender.com/api";
const FILM = "Mulholland Drive";
const FRAMES = ["g9ClaS5EqU0Hk8WIbMNhld0Bk6f", "9lCoifiRqJIP8gFyGTIjShWtHxA", "1P4vCGTvJc13VxejbRLbHA1dT6f"];
// Arthouse's useFilmLight on the landing frame (src/lib/filmLight.ts runs the
// same function live; this is the value served before it runs).
const LIGHT = "#4c59e6";

const get = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};
const save = async (url, file) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
};

const list = await get(`${API}/movies?search=${encodeURIComponent(FILM)}&limit=5`);
const hit = (Array.isArray(list) ? list : list.movies).find((m) => m.title === FILM);
if (!hit) throw new Error(`${FILM} not in the catalogue`);
const film = await get(`${API}/movies/${hit._id}`).then((b) => b.movie ?? b);
const director = await get(`${API}/directors/${film.directorId}`).then((b) => b.data ?? b);

const stills = film.stills.map((u) => u.match(/\/([A-Za-z0-9]+)\.jpg$/)[1]);
for (const id of FRAMES) if (!stills.includes(id)) throw new Error(`frame ${id} is not one of ${FILM}'s stills`);

fs.mkdirSync("public/work/opening", { recursive: true });
const frames = [];
for (const [i, id] of FRAMES.entries()) {
  const last = i === FRAMES.length - 1;
  const file = `public/work/opening/frame-${i + 1}.jpg`;
  await save(`https://image.tmdb.org/t/p/${last ? "w1280" : "w780"}/${id}.jpg`, file);
  frames.push(file.replace("public", ""));
}
const portraitId = director.profileUrl.match(/\/([A-Za-z0-9]+)\.jpg$/)[1];
await save(`https://image.tmdb.org/t/p/w185/${portraitId}.jpg`, "public/work/opening/director.jpg");

// The credit line Arthouse uses: "Written and directed by" when one person did both.
const writers = [...new Set((film.writers ?? []).map((w) => w.name))];
const role = film.directors.length === 1 && writers.length === 1 && writers[0] === film.directors[0] ? "Written and directed by" : "Directed by";
const country = film.country === "United States of America" ? "United States" : film.country;
const out = {
  source: `arthouse-atlas · ${FILM}`,
  title: film.title,
  year: film.year,
  role,
  director: film.directors[0],
  meta: [country, film.year, `${film.runtime} minutes`, `in ${film.languages.slice(0, 2).join(" and ")}`],
  light: LIGHT,
  frames,
  portrait: "/work/opening/director.jpg",
  link: `https://arthouse-atlas.vercel.app/movie/${hit._id}`,
};
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/arthouse-opening.json", JSON.stringify(out, null, 2) + "\n");
console.log(out);
