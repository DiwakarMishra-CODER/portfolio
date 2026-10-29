"use client";

import { useId, useMemo, useState } from "react";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^the\s+/, "");

type Props = {
  label: string;
  names: string[];
  value: number | null;
  onChange: (index: number) => void;
};

/** A small accessible combobox: type to filter, arrows to move, Enter to pick. */
export default function ArtistPicker({ label, names, value, onChange }: Props) {
  const id = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const shown = query ?? (value != null ? names[value] : "");
  const matches = useMemo(() => {
    const q = norm(query ?? "");
    const all = names.map((n, i) => [n, i] as const);
    const hits = q ? all.filter(([n]) => norm(n).includes(q)) : all;
    return hits
      .sort((a, b) => Number(!norm(a[0]).startsWith(q)) - Number(!norm(b[0]).startsWith(q)) || a[0].localeCompare(b[0]))
      .slice(0, 8);
  }, [names, query]);

  const pick = (i: number) => {
    onChange(i);
    setQuery(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="type-label text-graphite">
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-${matches[active][1]}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={shown}
        placeholder="Type an artist"
        onFocus={(e) => {
          e.currentTarget.select();
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery(null);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault();
            pick(matches[active][1]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery(null);
          }
        }}
        className="mt-1.5 w-full border-b border-ink bg-transparent py-2 text-[17px] outline-none placeholder:text-graphite/60 focus:border-signal"
      />
      {open && matches.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-auto border border-hairline bg-sheet py-1 shadow-[0_18px_40px_-20px_rgba(20,20,19,.45)]"
        >
          {matches.map(([n, i], k) => (
            <li
              key={i}
              id={`${id}-${i}`}
              role="option"
              aria-selected={k === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(i);
              }}
              onMouseEnter={() => setActive(k)}
              className={`cursor-pointer px-3 py-1.5 text-[15px] ${k === active ? "bg-ink text-film" : ""}`}
            >
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
