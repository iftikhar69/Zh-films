"use client";

import { useRef } from "react";
import { useInViewVideo } from "@/hooks/useInViewVideo";

export function InViewVideo(props: Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "autoPlay">) {
  const ref = useRef<HTMLVideoElement>(null);
  useInViewVideo(ref);
  return <video ref={ref} muted loop playsInline {...props} />;
}
