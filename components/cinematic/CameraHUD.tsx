"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function CameraHUD() {
  const [iso, setIso] = useState(800);
  const [timecode, setTimecode] = useState("00:00:00:00");

  useEffect(() => {
    const id = window.setInterval(() => {
      setIso((v) => (v === 800 ? 640 : 800));
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      const elapsedMs = performance.now() - start;
      const totalFrames = Math.floor((elapsedMs / 1000) * 24);
      const hh = String(Math.floor(totalFrames / (24 * 3600))).padStart(2, "0");
      const mm = String(Math.floor((totalFrames % (24 * 3600)) / (24 * 60))).padStart(2, "0");
      const ss = String(Math.floor((totalFrames % (24 * 60)) / 24)).padStart(2, "0");
      const ff = String(totalFrames % 24).padStart(2, "0");
      setTimecode(`${hh}:${mm}:${ss}:${ff}`);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex justify-between px-6 text-[10px] font-mono uppercase tracking-[0.35em] text-zh-gold/80 sm:text-xs">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          Rec
        </span>
        <span className="text-zinc-500">Scene 01</span>
        <span className="text-zinc-500">{timecode}</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-right text-zinc-400"
      >
        <div>
          ISO {iso} · f/1.4 · 4K UHD
        </div>
        <div className="text-[9px] text-zh-gold/60">Lahore · Pakistan</div>
      </motion.div>
    </div>
  );
}
