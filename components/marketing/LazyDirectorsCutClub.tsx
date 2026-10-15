"use client";

import dynamic from "next/dynamic";

export const LazyDirectorsCutClub = dynamic(
  () => import("./DirectorsCutClub").then((m) => m.DirectorsCutClub),
  { ssr: false }
);
