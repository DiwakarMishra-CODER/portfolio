// The Starweave room's family tree: one artist, the artists they learned from
// ("shaped by") and the artists who learned from them ("went on to shape"),
// each tie carrying its proof. The same rule as Starweave's own family view
// (starweave/lib/family.ts): an artist who is both, because they cite each
// other, counts as a parent.
import type { StarweaveData } from "./starweave";

/** public/data/starweave-faces.json, aligned with StarweaveData.artists. */
export type Faces = {
  source: string;
  live: string;
  /** [photo URL, 30 s preview URL, song, year they started, "author|licence|url" or ""] */
  faces: [string, string, string, number, string][];
};

export type Member = {
  i: number;
  id: string;
  name: string;
  /** The artist's star colour on the live map. */
  color: string;
  photo: string;
  since: number;
  /** "author|licence|url" when the photo's licence asks for a credit, else "". */
  credit: string;
  /** The tie to the centre: its tier (0 own words, 1 reported, 2 critic), the citation, where it's from. */
  tier: number;
  quote: string;
  source: string;
  /** The citation's verbatim line, when it reads as a clean statement on its own (see `cleanLine`). */
  line: string | null;
  /** Who said it, where: the citation's words before that line ("Thom Yorke to The Guardian, 2019"). */
  said: string;
  /** How well the citation reads: 0 a clean line, 1 a plain sentence, 2 a name-check list or a cut-off quote. */
  reads: number;
};

export type Family = {
  centre: Omit<Member, "tier" | "quote" | "source" | "line" | "said" | "reads"> & { preview: string; song: string };
  parents: Member[];
  children: Member[];
  /** How many more than shown (the rest are on Starweave). */
  moreParents: number;
  moreChildren: number;
};

/** The artists a stranger is likeliest to know, all with full families, for the "Try" chips. */
export const TRY = ["Radiohead", "Nirvana", "David Bowie", "The Cure", "Björk", "Tame Impala"];

export function familyOf(data: StarweaveData, faces: Faces, i: number, max = 6): Family {
  const person = (j: number) => {
    const [id, name, , , , color] = data.artists[j];
    const [photo, , , since, credit] = faces.faces[j];
    return { i: j, id, name, color, photo, since, credit };
  };
  const ties = new Map<number, Member>();
  const kids = new Map<number, Member>();
  for (const [influenced, influencer, tier, quote, source] of data.links) {
    const line = tier === 0 ? cleanLine(quote, data.artists[influencer][1]) : null;
    const said = line ? quote.slice(0, Math.max(0, quote.indexOf(line) - 1)).replace(/[\s:,"“]+$/, "") : "";
    const reads = line ? 0 : [...quote.matchAll(QUOTED)].some((m) => isList(m[1].trim())) ? 2 : 1;
    const tie = { tier, quote, source, line, said, reads };
    if (influenced === i) ties.set(influencer, { ...person(influencer), ...tie });
    else if (influencer === i) kids.set(influenced, { ...person(influenced), ...tie });
  }
  for (const j of ties.keys()) kids.delete(j);
  // The strongest proof first (their own words), and among equals the proof
  // that reads best (a clean line, then a plain sentence); then the artists
  // most cited across the map.
  const score = (m: Member) => data.artists[m.i][6];
  // A name-check list goes last whatever its tier: it proves the tie but
  // doesn't read as one.
  const order = (ms: Member[]) => ms.sort((a, b) => Number(a.reads === 2) - Number(b.reads === 2) || a.tier - b.tier || a.reads - b.reads || score(b) - score(a));
  // The row shows readable ties first; name-check lists wait in "+N more"
  // unless fewer than three readable ones are left to show.
  const arrange = (all: Member[]) => {
    const ordered = order(all);
    const readable = ordered.filter((m) => m.reads < 2);
    const show = (readable.length >= 3 ? readable : ordered).slice(0, max);
    return { show, more: all.length - show.length };
  };
  const up = arrange([...ties.values()]);
  const down = arrange([...kids.values()]);
  const [, preview, song] = faces.faces[i];
  return {
    centre: { ...person(i), preview, song },
    parents: up.show,
    children: down.show,
    moreParents: up.more,
    moreChildren: down.more,
  };
}

/** "rollingstone.com", or null for a print source. */
export const sourceHost = (src: string) => {
  if (src.startsWith("print:")) return null;
  try {
    return new URL(src).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

// A line that can stand on its own as an artist's words: Starweave's own test
// (its lib/home-story.ts ownWords: a verbatim passage of 6+ words that names
// the influence, in the first person, at most 170 characters, not a list),
// made a little stricter so a name-check doesn't pass as a statement.
const QUOTED = /["“]([^"”]+)["”]/g;
const FIRST_PERSON = /\b(I|I'm|I've|I'd|I'll|me|my|myself|we|we're|we've|we'd|us|our)\b/i;
const cutOff = (q: string) => /(\.\.\.|…)\s*$/.test(q);
/** A name-check: names in a row ("Radiohead, The Beatles, Aphex Twin"), or
 *  one name after another that trails off ("Radiohead, My Chemical Romance…"). */
const isList = (q: string) => {
  const names = q.match(/[A-Z][\w'’.&-]*(?:\s+[A-Z][\w'’.&-]*)*(?=,\s+[A-Z])/g)?.length ?? 0;
  return names >= 2 || (names >= 1 && cutOff(q)) || (q.match(/\//g)?.length ?? 0) >= 2;
};
const nameToken = (name: string) =>
  (name.replace(/^the\s+/i, "").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3).sort((a, b) => b.length - a.length)[0] ?? name).toLowerCase();

export function cleanLine(citation: string, naming: string): string | null {
  const token = nameToken(naming);
  for (const m of citation.matchAll(QUOTED)) {
    const text = m[1].trim();
    if (text.split(/\s+/).length < 6 || !text.toLowerCase().includes(token)) continue;
    const commas = text.match(/,/g)?.length ?? 0;
    return text.length <= 170 && FIRST_PERSON.test(text) && commas < 3 && !isList(text) && !cutOff(text) ? text : null;
  }
  return null;
}
