"use client";

import { useEffect } from "react";

/** Compare board finishes live: /?mask=black swaps the default green mask. */
export default function MaskToggle() {
  useEffect(() => {
    if (new URLSearchParams(location.search).get("mask") !== "black") return;
    const img = document.querySelector<HTMLImageElement>(".hb-mask");
    if (!img) return;
    img.src = "/board/board-black.svg";
    img.parentElement?.querySelector("source")?.setAttribute("srcset", "/board/board-black-p.svg");
  }, []);
  return null;
}
