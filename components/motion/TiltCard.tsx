"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/** 3D hover tilt with a gold glare that tracks the pointer. Touch devices get a flat card. */
export function TiltCard({
  children,
  className,
  max = 8
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 20 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgba(200,169,106,0.22), transparent 55%)`;
  const glareOpacity = useSpring(0, spring);

  return (
    <motion.div
      ref={ref}
      className={cn("relative [transform-style:preserve-3d]", className)}
      style={{ rotateX, rotateY, transformPerspective: 1100 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
        glareOpacity.set(1);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
        glareOpacity.set(0);
      }}
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{ background: glare, opacity: glareOpacity }}
      />
    </motion.div>
  );
}
