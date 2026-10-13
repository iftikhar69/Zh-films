"use client";

import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function CountUp({
  to,
  decimals = 0,
  suffix = "",
  duration = 2
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setValue
    });
    return () => controls.stop();
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
