// "Pick three films" — Arthouse Atlas's real recommender, ported from
// arthouse-atlas/backend/services/recommender.js (rankCandidates). Each film
// you love votes for its 50 EASE neighbours with that learned weight:
//
//   score(c) = Σ weight(s) · w(s, c) / Σ weight(s)
//
// The port also keeps each pick's per-film parts, the breakdown the live
// site's For You page shows ("how much of its score that film gave").

export type ArthouseData = {
  source: string;
  sourceDate: string;
  params: { model: string; lambda: number; beta: number; gamma: number; k: number };
  shelf: number[];
  /** tmdbId → [title, year, director, TMDB still path] */
  films: Record<string, [string, number, string, string]>;
  /** tmdbId → [[neighbour tmdbId, weight, reason]] */
  neighbours: Record<string, [number, number, string][]>;
  prior: Record<string, number>;
  /** How many MovieLens people loved each shelf film (4+ stars). */
  loved: Record<string, number | null>;
  /** shelf film → neighbour → how many people loved both. */
  both: Record<string, Record<string, number>>;
  minimumBoth: number;
};

export type Ranked = { tmdbId: number; score: number; prior: number; parts: number[]; because: number };

/** seeds: the picked shelf films, equal weight (as For You treats "loved"). */
export function rankCandidates(data: ArthouseData, seeds: number[], limit = 6): Ranked[] {
  const gamma = data.params.gamma ?? 0;
  const exclude = new Set(seeds);
  const total = seeds.length;
  const acc = new Map<number, { sum: number; best: number; seed: number; parts: number[] }>();
  seeds.forEach((seed, si) => {
    for (const [tmdbId, sim] of data.neighbours[seed] ?? []) {
      if (exclude.has(tmdbId)) continue;
      const part = 1 * sim;
      const a = acc.get(tmdbId);
      if (!a) {
        const parts = seeds.map(() => 0);
        parts[si] = part / total;
        acc.set(tmdbId, { sum: part, best: part, seed, parts });
      } else {
        a.sum += part;
        a.parts[si] += part / total;
        if (part > a.best || (part === a.best && seed < a.seed)) Object.assign(a, { best: part, seed });
      }
    }
  });
  const ranked: Ranked[] = [];
  for (const [tmdbId, a] of acc) {
    const prior = data.prior[tmdbId] ?? 0;
    ranked.push({ tmdbId, prior, score: a.sum / total + gamma * prior, parts: a.parts, because: a.seed });
  }
  return ranked
    .sort((x, y) => y.score - x.score || y.prior - x.prior || x.tmdbId - y.tmdbId)
    .slice(0, limit);
}

export const stillUrl = (path: string, size: "w300" | "w780" = "w300") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
