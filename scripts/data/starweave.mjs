// Builds public/data/starweave.json — the slice of Starweave's real graph that
// the portfolio's "Connect two" machine runs on.
//
//   node --experimental-strip-types scripts/data/starweave.mjs <path-to-starweave-checkout>
//
// (--experimental-strip-types lets it import Starweave's own lib/colors.ts, so
// every star gets exactly the colour the live map gives it.)
//
// Reads the checkout's built public/graph.json (the same file the live site
// serves), keeps only what the path search and its hop list need, and records
// the source commit so the portfolio can say exactly which data it shows.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repo = process.argv[2];
if (!repo) {
  console.error("usage: node scripts/data/starweave.mjs <path-to-starweave-checkout>");
  process.exit(1);
}
const graph = JSON.parse(fs.readFileSync(path.join(repo, "public/graph.json"), "utf8"));
const { resolveNodeColor } = await import(path.resolve(repo, "lib/colors.ts"));
const commit = execSync("git log -1 --format=%h", { cwd: repo }).toString().trim();
const commitDate = execSync("git log -1 --format=%cs", { cwd: repo }).toString().trim();

// Same labels the live site uses (starweave lib/colors.ts).
const REALMS = {
  core: "The roots",
  "region-one": "Punk to Shoegaze",
  "american-underground": "American Underground",
  electronic: "Electronic",
  "folk-confessional": "Folk & Confessional",
  "emo-posthardcore": "Emo & Post-Hardcore",
  "post-rock-drone-noise": "Post-Rock, Drone & Noise",
};
const realmIds = Object.keys(REALMS);
const TIERS = ["first-person", "reported", "critic"];

const index = new Map(graph.artists.map((a, i) => [a.id, i]));
// [id, name, x, y, realmIndex, star colour (the live map's), influenceScore]
const artists = graph.artists.map((a) => [
  a.id,
  a.name,
  Math.round(a.x * 10) / 10,
  Math.round(a.y * 10) / 10,
  realmIds.indexOf(a.realm),
  resolveNodeColor(a),
  a.influenceScore ?? 0,
]);
if (artists.some((a) => a[4] < 0)) throw new Error("unknown realm in graph.json");

// Keep the whole quote: the hop list shows it as the proof for that step.
const links = graph.edges
  .filter((e) => e.type === "influence")
  .map((e) => {
    const tier = TIERS.indexOf(e.sourceTier);
    if (tier < 0) throw new Error(`unknown tier ${e.sourceTier}`);
    // [influenced, influencer, tier, quote, source] — "source" is a URL, or the
    // print citation prefixed "print:" for the book sources.
    return [
      index.get(e.source),
      index.get(e.target),
      tier,
      e.citation ?? "",
      e.sourceUrl ?? (e.sourcePrint ? `print:${e.sourcePrint}` : ""),
    ];
  });

const denials = graph.rejectedEdges.map((e) => [index.get(e.source), index.get(e.target)]);

// "Today's link" pool — Starweave's own rule for a line that can be shown as
// an artist's words (lib/home-story.ts ownWords): a verbatim passage of 6+
// words that names the influence, in the first person, not a list, ≤170 chars.
const QUOTE = /["“]([^"”]+)["”]/g;
const FIRST_PERSON = /\b(I|I'm|I've|I'd|I'll|me|my|myself|we|we're|we've|we'd|us|our)\b/i;
const isList = (q) => (q.match(/,/g)?.length ?? 0) >= 3 || (q.match(/\//g)?.length ?? 0) >= 2;
const nameToken = (name) =>
  (name.replace(/^the\s+/i, "").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3).sort((a, b) => b.length - a.length)[0] ?? name).toLowerCase();
const ownWords = (citation, naming) => {
  const token = nameToken(naming);
  for (const m of citation.matchAll(QUOTE)) {
    const text = m[1].trim();
    if (text.split(/\s+/).length < 6 || !text.toLowerCase().includes(token)) continue;
    return text.length <= 170 && FIRST_PERSON.test(text) && !isList(text) ? text : null;
  }
  return null;
};
// [link index, the quote]
const today = links
  .map(([a, b, tier, citation], i) => (tier === 0 ? [i, ownWords(citation, graph.artists[b].name)] : null))
  .filter((x) => x && x[1]);

const out = {
  source: `starweave@${commit}`,
  sourceDate: commitDate,
  realms: realmIds.map((id) => REALMS[id]),
  artists,
  links,
  denials,
  today,
};
fs.mkdirSync("public/data", { recursive: true });
fs.writeFileSync("public/data/starweave.json", JSON.stringify(out));

// The hero's sky: only what the live starfield and the ticket need, small
// enough to ship inside the page bundle (no fetch before the stars can form).
// Twinkle phase is the live map's own: FNV-1a of the artist id, mod 10000.
const fnv1a = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};
const host = (src) => {
  try {
    return src.startsWith("http") ? new URL(src).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};
const sky = {
  source: out.source,
  realms: out.realms,
  // [x, y, colour, influenceScore, realmIndex, twinkle phase 0..1]
  stars: artists.map(([id, , x, y, r, color, score]) => [x, y, color, score, r, (fnv1a(id) % 10000) / 10000]),
  // [a, b, touches a core artist]
  links: links.map(([a, b]) => [a, b, artists[a][4] === 0 || artists[b][4] === 0 ? 1 : 0]),
  // Today's link: [influenced name, influencer name, quote, source url]
  today: today.map(([i, quote]) => {
    const [a, b, , , src] = links[i];
    return [artists[a][1], artists[b][1], quote, src.startsWith("http") ? src : "", host(src)];
  }),
};
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/starweave-sky.json", JSON.stringify(sky));
console.log(`starweave-sky.json: ${(fs.statSync("src/data/starweave-sky.json").size / 1024).toFixed(0)} KB`);
console.log(
  `starweave.json: ${artists.length} artists, ${links.length} links, ${denials.length} denials, ${today.length} today's-link quotes, from ${out.source} (${commitDate}), ${(fs.statSync("public/data/starweave.json").size / 1024).toFixed(0)} KB`
);
