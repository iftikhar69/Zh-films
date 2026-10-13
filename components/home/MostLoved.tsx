"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { LovedReel } from "@/lib/queries";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { TheaterViewer, type TheaterItem } from "@/components/cinematic/TheaterViewer";
import { SplitText } from "@/components/motion/SplitText";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";

export function MostLoved({ reels }: { reels: LovedReel[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 200, damping: 24 });
  const y = useSpring(my, { stiffness: 200, damping: 24 });

  const items: TheaterItem[] = useMemo(
    () =>
      reels.map((r) => ({
        id: r.id,
        title: r.title,
        mediaType: "video" as const,
        url: r.videoUrl,
        thumbnail: r.thumbnail,
        meta: r.category
      })),
    [reels]
  );

  if (!reels.length) return null;

  return (
    <section className="relative border-t border-white/5 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.45em] text-rose-300/80">
              <TrendingUp className="h-3.5 w-3.5" /> Audience favorites · live
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none text-white sm:text-6xl">
              <SplitText text="Most loved" inView />
            </h2>
          </div>
          <p className="max-w-sm text-sm text-zinc-400">
            Ranked by hearts from people like you. Tap the heart to cast your vote — the board updates in real time.
          </p>
        </div>

        <div
          className="relative mt-12"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            mx.set(e.clientX - r.left);
            my.set(e.clientY - r.top);
          }}
          onPointerLeave={() => setHover(null)}
        >
          <AnimatePresence>
            {hover !== null ? (
              <motion.div
                key="preview"
                className="pointer-events-none absolute left-0 top-0 z-20 hidden h-56 w-80 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-zh-gold/30 shadow-[0_30px_80px_rgba(0,0,0,0.7)] lg:block"
                style={{ x, y }}
                initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={reels[hover].id}
                    className="absolute inset-0"
                    initial={{ y: "100%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "-100%" }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Image src={reels[hover].thumbnail} alt="" fill sizes="320px" className="object-cover" />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Stagger className="divide-y divide-white/10 border-y border-white/10" stagger={0.06}>
            {reels.map((r, i) => (
              <StaggerItem key={r.id}>
                <div
                  className="group relative flex items-center gap-4 py-5 sm:gap-8 sm:py-7"
                  onPointerEnter={() => setHover(i)}
                >
                  <div className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-zh-gold/10 to-transparent transition-transform duration-500 group-hover:scale-x-100" />
                  <span className="relative w-10 font-mono text-sm text-zinc-600 sm:w-16 sm:text-base">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    data-cursor="Play"
                    onClick={() => {
                      setIndex(i);
                      setOpen(true);
                    }}
                    className="relative flex min-w-0 flex-1 items-center gap-4 text-left"
                  >
                    <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg lg:hidden">
                      <Image src={r.thumbnail} alt="" fill sizes="80px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-xl text-white transition-transform duration-500 group-hover:translate-x-2 group-hover:text-zh-gold sm:text-3xl">
                        {r.title}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-[0.3em] text-zinc-500">{r.category}</span>
                    </span>
                  </button>
                  <FavoriteButton type="reel" id={r.id} title={r.title} count={r.loves} showCount className="relative" size="sm" />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>

      <TheaterViewer
        open={open}
        items={items}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setOpen(false)}
        favoriteType="reel"
        trackViews
      />
    </section>
  );
}
