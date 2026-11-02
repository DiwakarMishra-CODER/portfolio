// Builds public/data/starweave-faces.json — what the Starweave room's family
// tree shows beside the graph in starweave.json: each artist's photo, their
// 30-second song preview, the year they started, and the photo credit when
// its licence asks for one. Read from the same graph.json as starweave.json
// (run starweave.mjs first, on the same checkout), and aligned with its
// artist list by index.
//
//   node scripts/data/starweave-faces.mjs <path-to-starweave-checkout>
import fs from "node:fs";
import path from "node:path";

const repo = process.argv[2];
if (!repo) {
  console.error("usage: node scripts/data/starweave-faces.mjs <path-to-starweave-checkout>");
  process.exit(1);
}
const LIVE = "https://starweaves.vercel.app";
const base = JSON.parse(fs.readFileSync("public/data/starweave.json", "utf8"));
const graph = JSON.parse(fs.readFileSync(path.join(repo, "public/graph.json"), "utf8"));
const byId = new Map(graph.artists.map((a) => [a.id, a]));

// [photo, preview, song, since, credit] — credit is "author|licence|url" or "".
const faces = base.artists.map(([id]) => {
  const a = byId.get(id);
  if (!a) throw new Error(`${id} missing from graph.json: run starweave.mjs on this checkout first`);
  const photo = a.imageUrl ? (a.imageUrl.startsWith("/") ? LIVE + a.imageUrl : a.imageUrl) : "";
  const c = a.imageCredit;
  return [photo, a.previewUrl ?? "", a.previewTrack ?? "", a.activeFrom ?? 0, c ? `${c.author}|${c.license}|${c.url}` : ""];
});

fs.writeFileSync("public/data/starweave-faces.json", JSON.stringify({ source: base.source, live: LIVE, faces }));
console.log(
  `starweave-faces.json: ${faces.length} artists, ${faces.filter((f) => f[0]).length} photos, ${faces.filter((f) => f[1]).length} previews, from ${base.source}, ${(fs.statSync("public/data/starweave-faces.json").size / 1024).toFixed(0)} KB`,
);
