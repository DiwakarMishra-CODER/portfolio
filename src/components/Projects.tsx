"use client";

import { motion, type Variants } from "motion/react";
import ProjectCard, { type Project } from "./ProjectCard";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// The spine (type, cream base, layout, motion, structure) is fixed across
// every project card. Each project owns exactly ONE accent color — used as
// a soft tinted-panel wash plus a deepened text shade — that's the only
// point of difference here. See CLAUDE.md's "Design system:
// cohesive-yet-different" note.
//
// Every headline stat below is a real, checkable number from the shipped
// app, and where a claim is a delta the baseline sits in the description
// rather than being left implied ("from 70% to 11%", not "84% better").
const PROJECTS: Project[] = [
  {
    slug: "starweave",
    image: "starweave",
    title: "Starweave",
    tagline: "An influence map of indie music, with every link sourced",
    year: "2026",
    stat: "1,053",
    label: "influence edges across 297 artists",
    // States the PRINCIPLE, not the example. An earlier draft opened with
    // "Elliott Smith sounds nothing like Fugazi" — true, and the strongest
    // line in the author's own LinkedIn post, but it spent the most valuable
    // sentence on the flagship card on two artists a reviewer has never heard
    // of and cannot evaluate. A portfolio visitor arrives with zero context, so
    // every line has to stand alone: numbers are legible to a stranger, band
    // names are not.
    //
    // 71% -> 11% IS MEASURED, NOT ESTIMATED, and the methodology has to stay
    // defensible because this is the number an interviewer will push on first:
    // 1,776 artist pairs compared, BFS (fewest hops) against Dijkstra weighted
    // by sourcing tier. "Weak" means a hop that is uncited or critic-tier —
    // including critic-tier is what puts the baseline at 71% rather than
    // something lower, so the definition is stated rather than implied.
    // Re-runnable against the live graph in ~0.4ms.
    //
    // The cost clause ("for about one extra artist in between", measured
    // +1.13 on a 3.02-step average) is load-bearing, not padding: without it
    // this reads as a free win, and the first question is "at what cost?". It
    // also explains why the floor is 11% and not 0% — some pairs simply have
    // no well-sourced route. Don't trim it.
    //
    // "Dijkstra" is deliberately NAMED while "hop"/"path" are not — they are
    // two different kinds of technical word. "hop" BLOCKS comprehension: the
    // reader needs the concept and hasn't got it. "Dijkstra" is SKIPPABLE — a
    // non-technical reader passes over three words, an engineer reads a
    // credential. An earlier pass stripped both and left the card stating a
    // result with no indication of how, which gave an engineer nothing to
    // latch onto. Name techniques; don't use jargon to explain things.
    //
    // NO OTHER GRAPH VOCABULARY IN THE USER-FACING STRING. A draft used "hop",
    // "path" and "priced" — imported straight from the benchmark notes — which
    // is meaningless to anyone who hasn't worked with graphs, i.e. most of the
    // people reading this page. It is "chain", "link", and "one extra artist
    // in between" out here; "hop"/"path"/"Dijkstra" stay in the comments and
    // the code, where the audience is a developer. Note the résumé bullet
    // manages the same claim jargon-free ("poorly-sourced links on the average
    // path... keeping paths nearly as short") — match that register.
    //
    // NOTE: the résumé bullet says 70% -> 11%, measured on the earlier
    // 293-artist graph. The site describes the current 297-artist graph, whose
    // benchmark is 71%. Keep this figure matched to whatever graph size the
    // card states.
    description:
      "Influence isn't the same as sounding similar — a band can shape another that sounds nothing like it, so no audio algorithm can find these links. They have to be sourced: 908 of 1,053 cite a named source, 562 the artist's own words. Ask how two artists connect and a Dijkstra search, weighted by how well each link is sourced, traces the best-documented chain rather than the shortest — chains with a poorly-sourced link fell from 71% to 11%, for about one extra artist in between.",
    stack: ["Next.js", "TypeScript", "d3-force", "Canvas API"],
    liveUrl: "https://starweaves.vercel.app/",
    repoUrl: "https://github.com/DiwakarMishra-CODER/starweave",
    accentHex: "#8B6FC9", // purple — pulled from the graph's own nebula palette
  },
  {
    slug: "arthouse-atlas",
    image: "arthouse-atlas",
    title: "Arthouse Atlas",
    tagline: "A film recommender for people new to arthouse cinema",
    year: "2026",
    stat: "497",
    label: "curated films across 12 movements",
    // Names the SOURCES the list was built from, so "trimmed" has something to
    // be trimmed from. A previous draft said only "cutting the mainstream
    // titles that had crept in" — crept in from where? The reader had no way
    // to know a list was being assembled from critics' polls in the first place.
    description:
      "497 films kept from a much longer list — built up from critics' polls and festival canons, then trimmed whenever something too mainstream slipped in. A taste profile weights what you did rather than what you clicked: favorites 3x, watched 1.5x, watchlist 1x, scoring 200 candidates per request.",
    stack: ["React", "Node.js", "Express", "MongoDB", "TMDB API"],
    liveUrl: "https://arthouse-atlas.vercel.app/",
    repoUrl: "https://github.com/DiwakarMishra-CODER/Arthouse-Atlas",
    accentHex: "#E4674F", // coral — matches the site's own warm copper accents
  },
  {
    slug: "careersaarthi",
    image: "careersaarthi",
    title: "CareerSaarthi",
    tagline: "Six career tools that share one context",
    year: "2025",
    stat: "6",
    label: "AI tools behind one career workflow",
    // Team credit is structural (first sentence), not a footnote — this was a
    // hackathon project and "what did YOU build?" is a guaranteed interview
    // question. TODO: swap the generic team credit for the specific personal
    // contribution once supplied.
    description:
      "Built with a team at my first hackathon. A teacher asked what made our resume analyser unique and we had no answer, so we built the other five tools around it — these exist scattered across the internet behind separate logins, and here they share context. The voice coach speaks each question, transcribes live, auto-submits on the timer, and scores clarity, STAR structure, and keyword density.",
    stack: ["React", "Supabase", "Web Speech API", "GPT-4o-mini"],
    liveUrl: "https://careersaarthi.vercel.app/",
    repoUrl: "https://github.com/DiwakarMishra-CODER/CareerSaarthi",
    accentHex: "#6B8CAE", // twilight — matches its blue/cyan product UI
  },
];

function reveal(delay: number, reduced: boolean): Variants {
  if (reduced) {
    return { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } };
  }
  return {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay, ease: EASE_OUT },
    },
  };
}

export default function Projects() {
  const reduced = usePrefersReducedMotion();

  return (
    <section id="projects" className="relative px-6 py-24 sm:px-10 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.p
          initial="hidden"
          whileInView="visible"
          // See CLAUDE.md: `initial`/`whileInView` resolves its hidden pose
          // against the pre-hydration `reduced === false` variants, and an
          // element that never intersects stays stuck there. `animate`
          // outranks `whileInView`, so this force-corrects it.
          animate={reduced ? "visible" : undefined}
          viewport={{ once: true, amount: 0.6 }}
          variants={reveal(0, reduced)}
          className="font-body text-xs font-semibold uppercase tracking-[0.35em] text-muted sm:text-sm"
        >
          Projects
        </motion.p>

        <motion.p
          initial="hidden"
          whileInView="visible"
          // See CLAUDE.md: `initial`/`whileInView` resolves its hidden pose
          // against the pre-hydration `reduced === false` variants, and an
          // element that never intersects stays stuck there. `animate`
          // outranks `whileInView`, so this force-corrects it.
          animate={reduced ? "visible" : undefined}
          viewport={{ once: true, amount: 0.6 }}
          variants={reveal(0.1, reduced)}
          className="mt-4 max-w-2xl font-body text-xl text-ink sm:text-2xl"
        >
          Three web apps built end to end &mdash; music, film, and careers.
          Each card links to the live site and its source.
        </motion.p>

        <div className="mt-16 flex flex-col gap-10 sm:mt-20 sm:gap-14 lg:gap-16">
          {PROJECTS.map((project, index) => (
            <ProjectCard
              key={project.slug}
              project={project}
              reversed={index % 2 === 1}
              reduced={reduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
