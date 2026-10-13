"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

export function Clapperboard3D() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 120, damping: 18 });

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className="relative h-40 w-[min(92vw,520px)] perspective-[1200px] sm:h-48">
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative mx-auto h-full w-full"
      >
        <div
          className="absolute inset-0 rounded-xl border border-zh-gold/30 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 shadow-[0_30px_120px_rgba(0,0,0,0.85)]"
          style={{ transform: "translateZ(0px)" }}
        />
        <motion.div
          className="absolute left-4 right-4 top-3 h-10 origin-left rounded-md bg-gradient-to-r from-zh-gold via-[#e6cf93] to-zh-gold shadow-lg"
          style={{ transform: "translateZ(16px) rotateX(-8deg)" }}
          animate={{ rotateX: [-10, -4, -10] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute inset-x-5 bottom-4 top-16 rounded-md border border-white/10 bg-black/60 p-4 text-center"
          style={{ transform: "translateZ(22px)" }}
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-zh-gold/70">Take 1 · Living Viewfinder</p>
          <p className="mt-3 font-serif text-[11px] uppercase tracking-[0.55em] text-zinc-400 sm:text-xs">
            Directed by
          </p>
          <p className="bg-gradient-to-r from-zh-gold via-[#f0dfb8] to-zh-gold bg-clip-text font-serif text-xl font-semibold uppercase tracking-[0.28em] text-transparent sm:text-3xl">
            Zulfikar Hussain
          </p>
        </div>
        <div
          className="absolute -right-2 bottom-6 h-16 w-16 rounded-full border border-zh-gold/25 bg-black/70 blur-[0.2px]"
          style={{ transform: "translateZ(8px)" }}
        />
      </motion.div>
    </div>
  );
}
