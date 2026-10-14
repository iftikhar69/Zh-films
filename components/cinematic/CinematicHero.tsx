"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clapperboard3D } from "@/components/cinematic/Clapperboard3D";
import { DustParticles } from "@/components/cinematic/DustParticles";
import { CameraHUD } from "@/components/cinematic/CameraHUD";
import { useSoundscape } from "@/hooks/useSoundscape";
import { useCinemaStore } from "@/stores/cinema-store";
import { useEffect } from "react";

const HERO_VIDEO =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL ??
  "/media/instagram/DdvcGIvhk3U.mp4";

export function CinematicHero() {
  const soundEnabled = useCinemaStore((s) => s.soundEnabled);
  const { pianoSwell } = useSoundscape();

  useEffect(() => {
    if (!soundEnabled) return;
    const t = window.setTimeout(() => pianoSwell(), 900);
    return () => window.clearTimeout(t);
  }, [soundEnabled, pianoSwell]);

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <video
          className="h-full w-full scale-105 object-cover opacity-55"
          src={HERO_VIDEO}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(200,169,106,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,140,60,0.14),transparent_40%)]" />
      </div>

        <DustParticles count={14} />
      <CameraHUD />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pb-24 pt-32 text-center sm:pb-28 sm:pt-36">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="mb-4 max-w-xl text-xs uppercase tracking-[0.55em] text-zh-gold/80 sm:text-sm"
        >
          ZH Films · Lahore
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <Clapperboard3D />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-8 max-w-2xl text-balance text-sm text-zinc-300 sm:text-base"
        >
          Recent degree in <span className="text-zh-gold">Cinematic Films</span>. 7+ years filming wedding epics,{" "}
          <span className="text-zh-gold">AKU</span> events, pre-events, and high-profile commercial stories — led by{" "}
          <span className="text-white">Zulfikar Hussain</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="flex flex-col items-stretch gap-4 sm:flex-row sm:justify-center"
        >
          <Link href="/hire" className="sm:w-auto">
            <Button
              size="xl"
              variant="cinematic"
              className="w-full min-w-[220px] font-semibold tracking-[0.18em]"
            >
              Film Family
            </Button>
          </Link>
          <Link href="/book" className="sm:w-auto">
            <Button size="xl" className="w-full min-w-[220px] font-semibold tracking-[0.18em]">
              Book the Lens
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 1 }}
          className="mt-10 grid max-w-lg grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:text-xs"
        >
          {[
            ["7+ yrs", "Pro cinema"],
            ["8 seats", "Film family"],
            ["Lot", "Rent · Sell"]
          ].map(([a, b]) => (
            <div key={a} className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-3">
              <div className="text-zh-gold">{a}</div>
              <div className="mt-1 text-zinc-500">{b}</div>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-8 left-1/2 h-14 w-[1px] -translate-x-1/2 bg-gradient-to-b from-zh-gold/0 via-zh-gold/70 to-zh-gold/0"
        animate={{ opacity: [0.3, 1, 0.3], height: [40, 64, 40] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </section>
  );
}
