"use client";

import { useEffect, useState } from "react";

export const NAV_LINKS = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about", wide: true },
  { label: "Contact", href: "#contact" },
];

/**
 * The hero's own top line, pinned once the hero has scrolled away (while it's
 * on screen, the hero carries the menu itself).
 */
export default function SiteNav() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
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
          Diwakar Mishra
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
              Resume ↗
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
