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
const PROJECTS: Project[] = [
  {
    slug: "ai-resume-score",
    image: "ai-resume",
    title: "AI Resume Score",
    stat: "60%",
    label: "increase in interview shortlists",
    description:
      "Fixed ATS failures, upgraded scoring logic, and introduced AI rewriting to turn resumes into recruiter-ready documents.",
    accentHex: "#6B8CAE", // twilight, pulled from the image's blue/purple gradient
  },
  {
    slug: "go-social",
    image: "go-social",
    title: "Go Social",
    stat: "52%",
    label: "increase in social shares",
    description:
      "Turned student wins into share-worthy moments, making achievements easy and rewarding to post.",
    accentHex: "#E4674F", // coral
  },
  {
    slug: "coins",
    image: "coins",
    title: "Coins",
    stat: "30%",
    label: "increase in adherence",
    description:
      "Gamified the student experience with a coin-based reward system to boost engagement and consistency.",
    accentHex: "#8B6FC9", // purple, pulled from the image
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
          viewport={{ once: true, amount: 0.6 }}
          variants={reveal(0, reduced)}
          className="font-body text-xs font-semibold uppercase tracking-[0.35em] text-muted sm:text-sm"
        >
          Projects
        </motion.p>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={reveal(0.1, reduced)}
          className="mt-4 max-w-2xl font-body text-xl text-ink sm:text-2xl"
        >
          Solving real-world problems through research-driven design, rapid
          iteration, and scalable solutions.
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
