"use client";

import { CinemaStage } from "@/components/layout/CinemaStage";

export function CinematicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="zh-grain" />
      <div className="zh-light-leak" />
      <div className="zh-vignette" />
      <div className="zh-scanlines" />
      <CinemaStage />
      {children}
    </>
  );
}
