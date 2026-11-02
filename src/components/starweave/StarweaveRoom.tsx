import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import graph from "../../../public/data/starweave.json";
import faceData from "../../../public/data/starweave-faces.json";
import { mapPlace, type StarweaveData } from "@/lib/machines/starweave";
import { familyOf, TRY, type Faces } from "@/lib/machines/family";
import { PROJECTS } from "@/data/site";
import { STARWEAVE as S, fmt } from "@/data/figures";
import { HostSaid } from "@/components/home/HostSaid";
import FamilyTree from "./FamilyTree";
import HowItWorks from "./HowItWorks";
import { ProductShot } from "@/components/rooms/ProductShot";
import Inside from "./Inside";
import "@/components/work/work.css";
import "@/components/rooms/rooms.css";
import "./starweave.css";

// Starweave's own type, for its parts of the room (the proof clippings).
const serif = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-sw-serif", preload: false });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-sw-mono", preload: false });

const data = graph as unknown as StarweaveData;
const faces = faceData as unknown as Faces;
const p = PROJECTS.find((x) => x.id === "starweave")!;
// From the Starweave repo (tests/, run by its CI on every push).
const TESTS = { cases: 174, files: 22 };

/**
 * Starweave's room. The idea first, in a shape anyone knows (a family tree
 * for music, every branch backed by a quote), shown in a guided run of two
 * taps; then the depth, on the back of a record sleeve. The night sky behind is the real map: every star is an
 * artist, where the live site puts them, in their colour.
 */
export default function StarweaveRoom({ n }: { n: number }) {
  const at = (name: string) => data.artists.findIndex((a) => a[1] === name);
  const tries = TRY.map((name) => ({ name, i: at(name) })).filter((t) => t.i >= 0);
  const initial = familyOf(data, faces, tries[0].i);

  // The sky: the live map's layout, scaled into the room.
  const place = mapPlace(data);
  const W = 1600;
  const H = 900;
  const stars = data.artists.map((a, k) => ({
    cx: Math.round(place(k).x * (W - 80) + 40),
    cy: Math.round(place(k).y * (H - 80) + 40),
    r: 1.2 + Math.min(2.4, a[6] / 18),
    fill: a[5],
    twinkle: k % 11 === 0,
  }));

  return (
    <section id="starweave" className={`sw-room ${serif.variable} ${mono.variable}`} aria-labelledby="starweave-title" data-host-dark>
      <svg className="sw-sky" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {stars.map((s, k) => (
          <circle key={k} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} className={s.twinkle ? "sw-twinkle" : undefined} style={s.twinkle ? { animationDelay: `${(k % 7) * 0.6}s` } : undefined} />
        ))}
      </svg>
      <div className="pg-wrap room-grid">
        <div className="sw-main">
          <p className="pg-kicker">
            Project {n}, {p.year}
          </p>
          <h2 id="starweave-title">{p.name}</h2>
          {/* The front: what it is, the real site being used, where to open it. */}
          <p className="pg-proj-line">{p.line}</p>
          <p className="room-spec">
            {fmt(S.artists)} artists · {fmt(S.links)} links, every one with a source · {p.parts.find((x) => x.k === "Built with")?.v}
          </p>
          <p className="room-own">Designed, built and shipped by me.</p>
          <p className="room-actions">
            <a href={p.live} target="_blank" rel="noreferrer">
              Open Starweave ↗
            </a>
            <a href={p.source} target="_blank" rel="noreferrer">
              Read the code ↗
            </a>
          </p>
          <ProductShot id="starweave" url={p.live} {...p.footage} inside={<Inside data={data} />} />
          <div className="sw-said">
            <HostSaid spot="starweave" />
            {/* Narrower screens: he stands beside his line (the lane is hidden). */}
            <div className="pg-spot sw-spot-inline" data-host-spot="starweave" data-size="inline" data-host-stop aria-hidden="true" />
          </div>

          {/* Then the inside: the same data and code, in your hands. */}
          <div className="room-try">
            <h3>Try it here</h3>
            <p>Starweave’s real data and code, running in this page. Every link opens its source.</p>
          </div>
          <div data-host-cue="starweave:tree">
            <FamilyTree initial={initial} tries={tries} live={faces.live} />
          </div>

          <div data-host-cue="starweave:sleeve">
            <HowItWorks source={p.source} tests={TESTS} />
          </div>
        </div>

        {/* His lane: he stays here (sticky) while you read the room. On wide
            screens it's where meaning lives: the tree's proof shows up here
            (FamilyTree puts it in the slot), over his bubble and him. */}
        <aside className="room-lane" data-host-lane aria-label="What Diwakar says">
          <div className="room-lane-inner">
            <div className="room-slot" data-held-slot />
            <div className="room-host-row">
              <p className="host-bubble" aria-live="polite" />
              <div className="pg-spot" data-host-spot="starweave" data-size="lane" data-host-stop />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
