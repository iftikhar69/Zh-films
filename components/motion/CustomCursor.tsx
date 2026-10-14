"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/**
 * Trailing viewfinder ring for mouse users. Any element with data-cursor="Label"
 * expands the ring and shows the label (e.g. "Play", "View").
 */
export function CustomCursor() {
  const fine = useMediaQuery("(pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const enabled = fine && !reduced;
  const [label, setLabel] = useState<string | null>(null);
  const [hoverLink, setHoverLink] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 420, damping: 34, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 420, damping: 34, mass: 0.5 });

  useEffect(() => {
    if (!enabled) return;

    // pointermove only feeds motion values (no React render); hover targets are resolved
    // on pointerover, which fires once per element boundary instead of every frame.
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      const labelled = el?.closest?.("[data-cursor]") as HTMLElement | null;
      setLabel(labelled?.dataset.cursor ?? null);
      setHoverLink(Boolean(el?.closest?.("a, button, [role='button'], input, textarea, select")));
    };
    const press = () => setDown(true);
    const release = () => setDown(false);
    const leave = () => {
      x.set(-100);
      y.set(-100);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const size = label ? 88 : hoverLink ? 46 : 28;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[200]">
      <motion.div className="absolute left-0 top-0" style={{ x: sx, y: sy }}>
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full border border-zh-gold/70"
          animate={{
            width: size,
            height: size,
            scale: down ? 0.82 : 1,
            backgroundColor: label ? "rgba(200,169,106,0.92)" : "rgba(200,169,106,0)"
          }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        >
          <AnimatePresence>
            {label ? (
              <motion.span
                key={label}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.25em] text-black"
              >
                {label}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </motion.div>
      <motion.div
        className="absolute left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zh-gold"
        style={{ x, y }}
        animate={{ opacity: label ? 0 : 1 }}
      />
    </div>
  );
}
