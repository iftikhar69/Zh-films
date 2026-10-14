"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Marquee({
  children,
  reverse = false,
  seconds = 40,
  className
}: {
  children: React.ReactNode;
  reverse?: boolean;
  seconds?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Off-screen marquees keep compositing (and repainting under masks) unless paused.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.offscreen = entry.isIntersecting ? "false" : "true";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-offscreen="true" className={cn("zh-marquee group relative flex overflow-hidden", className)}>
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className={cn("zh-marquee-track flex shrink-0 items-center", reverse && "[animation-direction:reverse]")}
          style={{ animationDuration: `${seconds}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
