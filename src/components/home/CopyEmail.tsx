"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Copies the email (for everyone whose "Email me" opens a mail app they never
 * use). Says so for a moment, and tells the host, who answers. Without the
 * clipboard API it selects the text instead, so it can be copied by hand.
 */
export function CopyEmail({ email, className, children }: { email: string; className?: string; children?: React.ReactNode }) {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const r = document.createRange();
      r.selectNodeContents(e.currentTarget);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(r);
      return;
    }
    setDone(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 2200);
    window.dispatchEvent(new CustomEvent("host:react", { detail: { kind: "copied" } }));
  };
  return (
    <button type="button" className={className} onClick={copy} data-done={done || undefined} aria-live="polite">
      {done ? "Copied ✓" : (children ?? "Copy email")}
    </button>
  );
}
