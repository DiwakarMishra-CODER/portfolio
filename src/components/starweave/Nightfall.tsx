import graph from "../../../public/data/starweave.json";
import { mapPlace, type StarweaveData } from "@/lib/machines/starweave";
import "./nightfall.css";

const data = graph as unknown as StarweaveData;
// Names a stranger knows, said as their stars come out.
const NAMED = ["Radiohead", "Nirvana", "David Bowie"];
const COUNT = 40;

/**
 * Between the hero and the Starweave room, night falls: the sand sky runs
 * through dusk into the room's night, and the stars come out as you scroll,
 * the most-cited artists, where the live map puts them, in their colours.
 * Three are named as they appear; then real influence lines (in the artists'
 * own words) weave between them, so the sky becomes a star-weave just before
 * the room's title says "Starweave". The host flies across it
 * (HostLayer's flight). All of it is in the HTML; scroll-driven CSS only
 * reveals it, and without that support (or with reduced motion) it shows lit.
 */
export default function Nightfall() {
  const place = mapPlace(data);
  const named = NAMED.map((n) => data.artists.findIndex((a) => a[1] === n)).filter((i) => i >= 0);
  const top = data.artists
    .map((a, i) => ({ i, score: a[6] }))
    .filter((a) => !named.includes(a.i))
    .sort((a, b) => b.score - a.score)
    .slice(0, COUNT - named.length)
    .map((a) => a.i);

  // When each star comes out, as a share of the band's pass across the
  // screen: the brightest first, the named ones on their own beats.
  const at = (k: number) => 24 + (k / (COUNT - named.length)) * 38;
  const stars = [
    ...top.map((i, k) => ({ i, at: at(k), name: "" })),
    ...named.map((i, k) => ({ i, at: 30 + k * 9, name: data.artists[i][1] })),
  ].map((s) => {
    const p = place(s.i);
    return {
      ...s,
      // Into the darkening lower part of the band, kept off its edges.
      left: 4 + p.x * 92,
      top: 38 + p.y * 50,
      size: 4 + Math.min(6, data.artists[s.i][6] / 7),
      color: data.artists[s.i][5],
    };
  });

  // The weave: own-words links between stars on show, the named ones first.
  const shown = new Map(stars.map((s) => [s.i, s]));
  const weave = data.links
    .filter(([a, b, tier]) => tier === 0 && shown.has(a) && shown.has(b))
    .sort((x, y) => Number(named.includes(y[0]) || named.includes(y[1])) - Number(named.includes(x[0]) || named.includes(x[1])))
    .slice(0, 16)
    .map(([a, b], k) => ({ from: shown.get(b)!, to: shown.get(a)!, at: 50 + k * 1.1 }));

  return (
    <section className="nf" data-nightfall aria-label="The night sky of Starweave: artists as stars, linked by who influenced whom">
      <svg className="nf-weave" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {weave.map((w, k) => (
          <line key={k} x1={w.from.left} y1={w.from.top} x2={w.to.left} y2={w.to.top} style={{ "--a": `${w.at.toFixed(1)}%` } as React.CSSProperties} />
        ))}
      </svg>
      <div className="nf-sky">
        {stars.map((s) => (
          <span
            key={s.i}
            className={`nf-star${s.name ? " is-named" : ""}${s.left > 80 ? " is-left" : ""}`}
            style={{ left: `${s.left}%`, top: `${s.top}%`, "--c": s.color, "--s": `${s.size}px`, "--a": `${s.at.toFixed(1)}%` } as React.CSSProperties}
          >
            {s.name && <b>{s.name}</b>}
          </span>
        ))}
      </div>
    </section>
  );
}
