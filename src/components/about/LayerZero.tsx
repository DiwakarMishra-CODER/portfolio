import Image from "next/image";
import leetcode from "@/data/leetcode.json";

// Must agree with the résumé in public/ — a reviewer who opens both will
// cross-check. Two claims are deliberately weaker than they could be; do not
// "restore" them: CGPA carries no class rank (unconfirmed), and CodeX is the
// "Neighbourly Choice" award, not overall first place. LeetCode comes from his
// real profile (src/data/leetcode.json — refresh with scripts/data/leetcode.mjs),
// the same numbers the hero shows; Knight is LeetCode's badge for ≥ 1850.
const SPEC = [
  { k: "CGPA", v: "9.43 / 10", note: "B.Tech CSE-AI" },
  { k: "LeetCode", v: `${leetcode.rating >= 1850 ? "Knight · " : ""}${leetcode.rating}`, note: `Contest rating · ${leetcode.solved.All} solved` },
  { k: "Flipkart GRiD 8.0", v: "Semi-finalist", note: "National" },
  { k: "CodeX Hackathon", v: "Neighbourly Choice", note: "Award · MAIT" },
];

const TOOLKIT = ["C++", "TypeScript", "JavaScript", "SQL", "React", "Next.js", "Node.js", "Express", "MongoDB", "PostgreSQL", "Tailwind CSS", "Canvas", "D3", "Git"];

/*
 * Layer 0. Everything above comes apart; this doesn't. One solid sheet, no
 * registration marks, no callouts — the warm breath in the page.
 */
export default function LayerZero() {
  return (
    <section className="relative bg-sheet px-[var(--gutter)] py-28" aria-labelledby="layer0-title" data-part="Layer 0 · About">
      <div className="mx-auto grid max-w-[1312px] grid-cols-12 gap-x-[clamp(12px,1.7vw,24px)] gap-y-12">
        <div className="col-span-12 min-[900px]:col-span-4">
          <p className="type-label text-graphite">
            <span className="text-signal-ink">Layer 0</span>&nbsp; The one that doesn&apos;t come apart
          </p>
          <div className="relative mt-6 aspect-[4/5] max-w-[360px] overflow-hidden rounded-[3px] bg-film">
            <Image
              src="/diwakar-mishra-cutout.png"
              alt="Diwakar Mishra"
              fill
              sizes="(min-width: 900px) 360px, 80vw"
              className="object-contain object-bottom"
            />
          </div>
        </div>

        <div className="col-span-12 min-[900px]:col-span-8 min-[900px]:pt-12">
          <h2 id="layer0-title" className="max-w-[17ch] text-[clamp(32px,4.2vw,64px)] font-[780] leading-[1.0] [font-variation-settings:'wdth'_112]">
            I pick problems that need{" "}
            <span className="underline decoration-signal decoration-[0.09em] underline-offset-[0.12em]">more than a database</span>.
          </h2>
          <p className="mt-7 max-w-[52ch] text-[clamp(17px,1.4vw,20px)] leading-relaxed">
            B.Tech CSE-AI at Maharaja Agrasen Institute of Technology, Delhi. Class of 2028. Both projects come down to a scoring system:
            how much a source is worth, how much a film you loved is worth. Both show their working.
          </p>
          <p className="mt-5 text-[15px] text-graphite">Starweave and Arthouse Atlas both came out of the same sleepless night.</p>

          <dl className="mt-12 grid grid-cols-2 border-t border-ink min-[700px]:grid-cols-4">
            {SPEC.map((s) => (
              <div key={s.k} className="border-b border-hairline py-5 pr-4">
                <dt className="type-label text-graphite">{s.k}</dt>
                <dd className="mt-2">
                  <span className="block text-[clamp(20px,1.8vw,26px)] font-[750] leading-tight [font-variation-settings:'wdth'_110]">{s.v}</span>
                  <span className="mt-1 block text-[13.5px] text-graphite">{s.note}</span>
                </dd>
              </div>
            ))}
          </dl>

          <p className="type-label mt-8 text-graphite">Works in</p>
          <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed">{TOOLKIT.join(" · ")}</p>
        </div>
      </div>
    </section>
  );
}
