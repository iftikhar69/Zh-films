"use client";

import { useEffect } from "react";
import { useCinemaStore } from "@/stores/cinema-store";
import { useSoundscape } from "@/hooks/useSoundscape";

/** CSS-only curtains when Cinema Mode is ON — no Framer springs on scroll. */
export function CinemaStage() {
  const cinemaMode = useCinemaStore((s) => s.cinemaMode);
  const soundEnabled = useCinemaStore((s) => s.soundEnabled);
  const { projectorHumOn, projectorHumOff } = useSoundscape();

  useEffect(() => {
    if (!cinemaMode || !soundEnabled) {
      projectorHumOff();
      return;
    }
    projectorHumOn();
    return () => projectorHumOff();
  }, [cinemaMode, projectorHumOff, projectorHumOn, soundEnabled]);

  if (!cinemaMode) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[55]" style={{ contain: "strict" }} aria-hidden>
      <div className="absolute inset-y-0 left-0 w-[8%] max-w-[96px] bg-gradient-to-r from-black via-black/85 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[8%] max-w-[96px] bg-gradient-to-l from-black via-black/85 to-transparent" />
      <div className="absolute left-[10%] top-[6%] h-[55%] w-[50%] origin-top-left rotate-[-8deg] bg-[conic-gradient(from_200deg_at_0%_0%,transparent,rgba(200,169,106,0.06),transparent)] opacity-70" />
    </div>
  );
}
