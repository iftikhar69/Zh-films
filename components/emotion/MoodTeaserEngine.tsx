"use client";

import { useMemo, useState } from "react";
import { InViewVideo } from "@/components/motion/InViewVideo";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSoundscape } from "@/hooks/useSoundscape";
import { useCinemaStore } from "@/stores/cinema-store";

const MOODS = [
  {
    id: "romance",
    label: "Romance",
    grade: "from-zh-gold/25 via-black to-black",
    tag: "Velvet vows. Gold hour. Soft flares.",
    video: "/media/instagram/DeRWT51oN9B.mp4"
  },
  {
    id: "prestige",
    label: "Prestige",
    grade: "from-white/10 via-black to-black",
    tag: "Institutional dignity. AKU protocol. Clean audio.",
    video: "/media/instagram/DdjUxjLAsza.mp4"
  },
  {
    id: "hype",
    label: "Hype",
    grade: "from-zh-ember/20 via-black to-black",
    tag: "Pre-event chaos. Neon grade. Fast cuts.",
    video: "/media/instagram/DddgxEABOoG.mp4"
  },
  {
    id: "brand",
    label: "Brand Film",
    grade: "from-zh-gold/15 via-black to-black",
    tag: "Product poetry. Movement. Luxury pacing.",
    video: "/media/instagram/Dd1Z2MMBpsU.mp4"
  }
] as const;

export function MoodTeaserEngine() {
  const [mood, setMood] = useState<(typeof MOODS)[number]>(MOODS[0]);
  const cinemaMode = useCinemaStore((s) => s.cinemaMode);
  const { shutter, pianoSwell } = useSoundscape();

  const badge = useMemo(
    () => (cinemaMode ? "Cinema Mode Viewer" : "Teaser Generator"),
    [cinemaMode]
  );

  return (
    <section className="relative border-t border-white/5 bg-black py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(200,169,106,0.14),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">{badge}</p>
            <h2 className="mt-3 font-serif text-2xl text-white sm:text-3xl">Emotion Engine</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Choose a mood — we generate a custom “trailer vibe” teaser. Minimal text. Maximum feeling.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const active = m.id === mood.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMood(m);
                    shutter();
                    pianoSwell();
                  }}
                  className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition ${
                    active
                      ? "border-zh-gold/70 bg-zh-gold text-black shadow-[0_0_30px_rgba(200,169,106,0.35)]"
                      : "border-white/10 text-zinc-400 hover:border-zh-gold/40 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/60">
            <AnimatePresence mode="wait">
              <motion.div
                key={mood.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="relative"
              >
                <div className="relative aspect-video">
                  <InViewVideo className="h-full w-full object-cover" src={mood.video} preload="none" />
                  <div className={`absolute inset-0 bg-gradient-to-b ${mood.grade}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(255,255,255,0.08),transparent_55%)]" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-[10px] uppercase tracking-[0.45em] text-zh-gold/80">Generated teaser</p>
                    <p className="mt-2 font-serif text-xl text-white sm:text-2xl">{mood.tag}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="rounded-3xl border border-zh-gold/25 bg-gradient-to-b from-black to-zinc-950 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-zh-gold/80">Director’s note</p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              This is the exact way we start real projects: mood first, then blocking, then light. Zulfikar’s team builds
              a cinematic language for your story — not generic coverage.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild size="lg" className="tracking-[0.18em]">
                <a href="/book">Book this mood</a>
              </Button>
              <Button asChild size="lg" variant="cinematic" className="tracking-[0.18em]">
                <a href="/reels">Browse matching reels</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

