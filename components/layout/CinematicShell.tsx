"use client";

import { FilmBurnTransition } from "@/components/layout/FilmBurnTransition";
import { CinemaStage } from "@/components/layout/CinemaStage";

export function CinematicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FilmBurnTransition />
      <div className="zh-grain" />
      <div className="zh-light-leak" />
      <div className="zh-vignette" />
      <div className="zh-scanlines" />
      <CinemaStage />
      {children}
    </>
  );
}
