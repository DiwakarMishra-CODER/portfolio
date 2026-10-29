const EMAIL = "diwakarmishraemail@gmail.com";
const LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/diwakar-mishra-dev" },
  { label: "GitHub", href: "https://github.com/DiwakarMishra-CODER" },
  { label: "LeetCode", href: "https://leetcode.com/u/DiwakarCracksIt/" },
  { label: "Résumé", href: "/Diwakar-Mishra-Resume.pdf" },
];

// Set at build time in next.config.ts: the commit this page was built from.
const REV = process.env.NEXT_PUBLIC_REV || "local";
const BUILT = process.env.NEXT_PUBLIC_BUILT || "";
const builtLabel = BUILT
  ? new Date(BUILT).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  : "—";

function Cell({ k, children, className = "" }: { k: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-hairline p-4 ${className}`}>
      <p className="type-label text-[9.5px] text-graphite">{k}</p>
      <div className="mt-1.5 text-[15px] leading-snug">{children}</div>
    </div>
  );
}

/*
 * Every technical drawing ends in a title block: who drew it, when, which
 * revision. This one also carries the email — the one action the page wants.
 */
export default function TitleBlock() {
  const [local, domain] = EMAIL.split("@");
  return (
    <footer id="contact" className="relative film-surface px-[var(--gutter)] pb-10 pt-28" data-part="Contact · Title block">
      <div className="mx-auto max-w-[1312px]">
        <p className="type-label text-graphite">
          <span className="text-signal-ink">Contact</span>&nbsp; Title block
        </p>
        <h2 className="mt-5 max-w-[20ch] text-[clamp(30px,3.6vw,54px)] font-[750] leading-[1.02] [font-variation-settings:'wdth'_112]">
          Open to SDE internships and new-grad roles.
        </h2>
        <a
          href={`mailto:${EMAIL}`}
          className="mt-8 inline-block break-words text-[clamp(22px,3.4vw,46px)] font-[650] leading-tight text-ink underline decoration-signal decoration-2 underline-offset-[0.18em] transition-colors hover:text-signal-ink [font-variation-settings:'wdth'_105]"
        >
          {local}
          <wbr />@{domain}
        </a>

        <div className="mt-20 grid grid-cols-2 border border-ink min-[900px]:grid-cols-12">
          <Cell k="Title" className="col-span-2 border-b min-[900px]:col-span-6 min-[900px]:border-r">
            Diwakar Mishra — portfolio
          </Cell>
          <Cell k="Drawn by" className="border-b border-r min-[900px]:col-span-3">
            Diwakar Mishra
          </Cell>
          <Cell k="Built" className="border-b min-[900px]:col-span-3">
            {builtLabel}
          </Cell>
          <Cell k="Links" className="col-span-2 border-b min-[900px]:col-span-6 min-[900px]:border-b-0 min-[900px]:border-r">
            <span className="flex flex-wrap gap-x-5 gap-y-1">
              {LINKS.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="underline decoration-hairline underline-offset-4 hover:text-signal-ink hover:decoration-signal">
                  {l.label} ↗
                </a>
              ))}
            </span>
          </Cell>
          <Cell k="Revision" className="border-r min-[900px]:col-span-2">
            <span className="font-mono text-[13px]">{REV}</span>
          </Cell>
          <Cell k="Sheet" className="min-[900px]:col-span-2 min-[900px]:border-r">
            1 of 1
          </Cell>
          <Cell k="Scale" className="col-span-2 border-t min-[900px]:col-span-2 min-[900px]:border-t-0">
            1 : 1
          </Cell>
        </div>

        <div className="type-label mt-6 flex flex-wrap justify-between gap-4 text-graphite">
          <p>© {BUILT.slice(0, 4)} Diwakar Mishra · Delhi</p>
          <a href="#top" className="hover:text-signal-ink">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
