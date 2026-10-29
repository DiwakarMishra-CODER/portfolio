// "Connect two" — Starweave's real route finder, ported line for line from
// starweave/lib/graph-utils.ts (findBestSourcedPath + HOP_COST) so the
// portfolio answers exactly what the live site answers. The only addition is
// a trace of the search (which artist was settled when), for the drawing.

export type StarweaveData = {
  source: string;
  sourceDate: string;
  realms: string[];
  /** [id, name, x, y, realmIndex] */
  artists: [string, string, number, number, number][];
  /** [influenced, influencer, tier (0 first-person, 1 reported, 2 critic), quote, source] */
  links: [number, number, number, string, string][];
  /** [artist, the artist they denied was an influence] */
  denials: [number, number][];
};

// Same ladder as the live site: an artist saying it themselves is the
// cheapest hop, so the search walks a long way round to avoid weaker claims.
export const HOP_COST = [0.1, 0.35, 0.6] as const;
export const TIER_LABEL = ["in their own words", "reported by a publication", "a critic's comparison"] as const;

type Adj = { to: number; cost: number; link: number }[][];

export function buildAdjacency(data: StarweaveData): Adj {
  const adj: Adj = data.artists.map(() => []);
  data.links.forEach(([a, b, tier], link) => {
    const cost = HOP_COST[tier];
    adj[a].push({ to: b, cost, link });
    adj[b].push({ to: a, cost, link });
  });
  return adj;
}

export type Trace = { node: number; parent: number; dist: number }[];

/**
 * Dijkstra over the undirected influence graph, weighted by HOP_COST, with a
 * linear-scan frontier exactly like the original (O(V²) at 296 artists runs in
 * well under a millisecond). Returns the route as artist indexes plus the
 * settle order, or null when the two are not connected.
 */
export function bestSourcedPath(adj: Adj, src: number, dst: number): { path: number[]; trace: Trace } | null {
  const trace: Trace = [];
  if (src === dst) return { path: [src], trace: [{ node: src, parent: -1, dist: 0 }] };
  const dist = new Map<number, number>([[src, 0]]);
  const prev = new Map<number, number>();
  const settled = new Set<number>();
  for (;;) {
    let node = -1;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (!settled.has(id) && d < best) {
        best = d;
        node = id;
      }
    }
    if (node === -1) return null;
    trace.push({ node, parent: prev.get(node) ?? -1, dist: best });
    if (node === dst) break;
    settled.add(node);
    for (const { to, cost } of adj[node]) {
      const next = best + cost;
      if (next < (dist.get(to) ?? Infinity)) {
        dist.set(to, next);
        prev.set(to, node);
      }
    }
  }
  const path = [dst];
  let cur = dst;
  while (cur !== src) {
    const parent = prev.get(cur);
    if (parent === undefined) return null;
    cur = parent;
    path.unshift(cur);
  }
  return { path, trace };
}

/** Fewest hops (plain breadth-first search) — the route a naive map would show. */
export function fewestHopsPath(adj: Adj, src: number, dst: number): number[] | null {
  const prev = new Map<number, number>([[src, -1]]);
  const queue = [src];
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node === dst) break;
    // Visit neighbours in a stable order (cheapest evidence first) so ties
    // resolve the same way every time.
    for (const { to } of [...adj[node]].sort((x, y) => x.cost - y.cost || x.to - y.to)) {
      if (!prev.has(to)) {
        prev.set(to, node);
        queue.push(to);
      }
    }
  }
  if (!prev.has(dst)) return null;
  const path = [dst];
  let cur = dst;
  while (cur !== src) {
    cur = prev.get(cur)!;
    path.unshift(cur);
  }
  return path;
}

/** The link used between two consecutive route artists: the best-sourced one if there are two. */
export function hopLink(adj: Adj, a: number, b: number) {
  let best: { to: number; cost: number; link: number } | null = null;
  for (const e of adj[a]) if (e.to === b && (!best || e.cost < best.cost)) best = e;
  return best;
}
