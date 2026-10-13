"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Lightweight fade flash — previous Framer film-burn was expensive on every nav. */
export function FilmBurnTransition() {
  const pathname = usePathname();
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(true);
    const t = window.setTimeout(() => setOn(false), 280);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!on) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90] bg-[radial-gradient(circle_at_50%_45%,rgba(255,140,60,0.45),transparent_55%)] opacity-70 transition-opacity duration-200"
      aria-hidden
    />
  );
}
