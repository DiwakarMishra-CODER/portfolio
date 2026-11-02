// Adds `ids` to public/data/arthouse.json: for each film there (keyed by TMDB
// id), the live site's own id, so the portfolio can deep-link /movie/<id>.
// Matched on the TMDB still path, else on title + year, from the site's
// frontend/public/meta/films.json (read from the working tree, or from
// origin/main when the checkout is behind).
//
//   node scripts/data/arthouse-ids.mjs <path-to-arthouse-atlas-checkout>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.argv[2];
if (!repo) {
  console.error("usage: node scripts/data/arthouse-ids.mjs <path-to-arthouse-atlas-checkout>");
  process.exit(1);
}
const rel = "frontend/public/meta/films.json";
const onDisk = path.join(repo, rel);
const raw = fs.existsSync(onDisk) ? fs.readFileSync(onDisk, "utf8") : execFileSync("git", ["-C", repo, "show", `origin/main:${rel}`], { encoding: "utf8", maxBuffer: 64 << 20 });
const meta = JSON.parse(raw); // id → [ "Title (year)", line, still, { n, y, … } ]
const byStill = new Map();
const byTitle = new Map();
for (const [id, [, , still, info]] of Object.entries(meta)) {
  if (still) byStill.set(still, id);
  if (info?.n) byTitle.set(`${info.n}|${info.y}`, id);
}
const file = "public/data/arthouse.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const ids = {};
let missing = 0;
for (const [tmdb, [title, year, , still]] of Object.entries(data.films)) {
  const id = byStill.get(still) ?? byTitle.get(`${title}|${year}`);
  if (id) ids[tmdb] = id;
  else missing++;
}
data.ids = ids;
fs.writeFileSync(file, JSON.stringify(data));
console.log(`arthouse.json: ${Object.keys(ids).length} site ids, ${missing} unmatched`);
