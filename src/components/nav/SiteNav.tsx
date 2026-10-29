"use client";

import { useEffect, useState } from "react";
import { toggleXRay, useXRayOn } from "@/components/xray/XRay";

export const NAV_LINKS = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about", wide: true },
  { label: "Contact", href: "#contact" },
];

export function XRaySwitch() {
  const on = useXRayOn();
  return (
    <button
      type="button"
      onClick={() => toggleXRay()}
      aria-pressed={on}
      title="X-ray: show how this page is built (key X)"
      className={`type-label inline-flex items-center gap-1.5 border px-2 py-1 transition-colors max-[700px]:hidden ${on ? "border-signal bg-signal text-white" : "border-ink text-ink hover:border-signal hover:text-signal-ink"}`}
    >
      <span aria-hidden="true">⌖</span> X-ray
    </button>
  );
}

/**
 * The same menu the hero's interface layer carries, pinned once the hero has
 * scrolled away (the hero's own copy rides with its layer while it's on screen).
 */
export default function SiteNav() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const hero = document.querySelector("[data-hero-track]");
    const check = () => {
      const end = hero ? hero.getBoundingClientRect().bottom : 0;
      setShown(end <= 80);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-hairline bg-film/88 backdrop-blur-md transition-transform duration-300 [transition-timing-function:var(--ease-land)] ${shown ? "translate-y-0" : "-translate-y-full"}`}
      inert={!shown}
      data-part="Nav"
    >
      <nav className="mx-auto flex max-w-[calc(1312px+2*var(--gutter))] items-center justify-between px-[var(--gutter)] py-3.5" aria-label="Main">
        <a href="#top" className="type-label text-ink">
          <span className="text-signal-ink">DM</span>&nbsp; Diwakar Mishra
        </a>
        <ul className="type-label flex items-center gap-5 text-ink min-[900px]:gap-8">
          {NAV_LINKS.map((l) => (
            <li key={l.href} className={l.wide ? "max-[560px]:hidden" : undefined}>
              <a href={l.href} className="hover:text-signal-ink">
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a href="/Diwakar-Mishra-Resume.pdf" target="_blank" rel="noreferrer" className="hover:text-signal-ink">
              Résumé ↗
            </a>
          </li>
          <li>
            <XRaySwitch />
          </li>
        </ul>
      </nav>
    </header>
  );
}
