"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import opening from "@/data/arthouse-opening.json";
import { ARTHOUSE, fmt } from "@/data/figures";
import { sampleLight } from "@/lib/filmLight";

/*
 * Arthouse Atlas's film page, playing its own opening titles — rebuilt with
 * the live site's exact materials: projected black, 12fps grain, the claw
 * pull-down through the gate, a one-frame shutter, the iris on the director,
 * credits rising card by card. The film is Diwakar's favourite director's.
 *
 * The page's accent ("the light of the film") is sampled from the landing
 * frame live, with Arthouse's own function, the moment it decodes.
 */
export default function ArthousePanel() {
  const panelRef = useRef<HTMLAnchorElement>(null);
  const [f1, f2, f3] = opening.frames;

  return (
    <a
      ref={panelRef}
      href="#arthouse"
      className="p-ah"
      style={{ ["--light-film" as string]: opening.light } as CSSProperties}
      aria-label={`Arthouse Atlas — a film recommender for ${fmt(ARTHOUSE.films)} arthouse films, playing the opening titles of ${opening.title}. Scroll to take it apart.`}
      data-part="02 · Arthouse Atlas (its own opening titles)"
    >
      <div className="ah-gate once" aria-hidden="true">
        <div className="ah-strip once">
          <div className="ah-frame">
            <Image src={f1} alt="" fill sizes="(min-width: 900px) 42vw, 100vw" />
          </div>
          <div className="ah-frame">
            <Image src={f2} alt="" fill sizes="(min-width: 900px) 42vw, 100vw" />
          </div>
          <div className="ah-frame is-land">
            <Image
              src={f3}
              alt=""
              fill
              priority
              sizes="(min-width: 900px) 42vw, 100vw"
              className="once"
              onLoad={(e) => {
                const light = sampleLight(e.currentTarget);
                panelRef.current?.style.setProperty("--light-film", light);
              }}
            />
          </div>
        </div>
      </div>
      <div className="ah-scrim" aria-hidden="true" />
      <div className="ah-grain" aria-hidden="true" />
      <div className="ah-shutter once" aria-hidden="true" />

      <div className="ah-bar" aria-hidden="true">
        <span className="ah-logo">
          <span>A</span>
          Arthouse <i>Atlas</i>
        </span>
        <span className="ah-links max-[1180px]:hidden">
          <span>Explore</span>
          <span>Directors</span>
          <span>Movements</span>
        </span>
      </div>

      <div className="ah-credits" aria-hidden="true">
        <span className="ah-face">
          <span className="once">
            {/* eslint-disable-next-line @next/next/no-img-element -- 185px TMDB portrait, already its final size */}
            <img src={opening.portrait} alt="" />
          </span>
        </span>
        <div className="ah-rise once" style={{ "--at": "2000ms" } as CSSProperties}>
          <p className="ah-kicker">{opening.role}</p>
          <p className="ah-director">{opening.director}</p>
        </div>
        <p className="ah-film ah-rise once" style={{ "--at": "2160ms" } as CSSProperties}>
          {opening.title}
        </p>
        <p className="ah-meta ah-rise once" style={{ "--at": "2280ms" } as CSSProperties}>
          {opening.meta.join("  ·  ")}
        </p>
      </div>
      <span className="ah-credit" aria-hidden="true">
        Pictures from TMDB
      </span>
    </a>
  );
}
