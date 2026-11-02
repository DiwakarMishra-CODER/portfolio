import type { StarweaveData } from "@/lib/machines/starweave";
import { STARWEAVE as S, fmt } from "@/data/figures";

const TIER = ["in their own words", "reported", "a critic's comparison"];
const hostOf = (src: string) => {
  if (src.startsWith("print:")) return "in print";
  try {
    return new URL(src).hostname.replace(/^www\./, "");
  } catch {
    return src;
  }
};

/**
 * Behind Starweave's screen (the cut): the same artist the recording ends
 * on, as the data the site runs on. Each of Radiohead's influence links, how
 * it's proven, and where it came from, straight from starweave.json. Its
 * rows print in as the screen swings open (--lid, from ProductShot).
 */
export default function Inside({ data, artist = "radiohead", rows = 7 }: { data: StarweaveData; artist?: string; rows?: number }) {
  const a = data.artists.findIndex((x) => x[0] === artist);
  const name = data.artists[a]?.[1] ?? artist;
  const links = data.links
    .filter((l) => l[0] === a)
    .sort((x, y) => x[2] - y[2] || data.artists[x[1]][1].localeCompare(data.artists[y[1]][1]));
  const shown = links.slice(0, rows);
  return (
    <div className="sw-inside">
      <p className="sw-inside-k">Inside Starweave · the data behind that screen</p>
      <p className="sw-inside-h">
        {links.length} artists shaped {name}. Every link carries its proof.
      </p>
      <ol>
        {shown.map((l, i) => (
          <li key={l[1]} style={{ "--at": 0.3 + i * 0.07 } as React.CSSProperties}>
            <span className="sw-inside-who">
              {data.artists[l[1]][1]} <i>→</i> {name}
            </span>
            <span className={`sw-inside-tier t${l[2]}`}>{TIER[l[2]]}</span>
            <span className="sw-inside-src">{hostOf(l[4])}</span>
          </li>
        ))}
      </ol>
      <p className="sw-inside-more" style={{ "--at": 0.3 + rows * 0.07 } as React.CSSProperties}>
        + {links.length - shown.length} more for {name} · {fmt(S.links)} links like these, every one with a source
      </p>
    </div>
  );
}
