"use client";

import { Moon, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCinemaStore } from "@/stores/cinema-store";
import { useEffect } from "react";
import { useSoundscape } from "@/hooks/useSoundscape";

export function CinemaModeToggle() {
  const cinemaMode = useCinemaStore((s) => s.cinemaMode);
  const toggleCinema = useCinemaStore((s) => s.toggleCinemaMode);
  const soundEnabled = useCinemaStore((s) => s.soundEnabled);
  const toggleSound = useCinemaStore((s) => s.toggleSound);
  const { filmWind } = useSoundscape();

  useEffect(() => {
    document.documentElement.classList.toggle("zh-cinema-mode", cinemaMode);
  }, [cinemaMode]);

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-pressed={soundEnabled}
        className="rounded-full border border-white/10"
        onClick={() => {
          toggleSound();
          if (!soundEnabled) filmWind();
        }}
      >
        {soundEnabled ? <Volume2 className="h-4 w-4 text-zh-gold" /> : <VolumeX className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-pressed={cinemaMode}
        className="rounded-full border border-white/10"
        onClick={() => toggleCinema()}
        title="Cinema mode"
      >
        {cinemaMode ? <Sparkles className="h-4 w-4 text-zh-gold" /> : <Moon className="h-4 w-4" />}
      </Button>
    </div>
  );
}
