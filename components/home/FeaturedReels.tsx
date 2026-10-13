"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Eye, Play } from "lucide-react";
import type { Reel } from "@prisma/client";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { TheaterViewer, type TheaterItem } from "@/components/cinematic/TheaterViewer";
import { SplitText } from "@/components/motion/SplitText";

function duration(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function FeaturedReels({ reels, loves }: { reels: Reel[]; loves: Record<string, number> }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      setDistance(Math.max(0, track.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [reels.length]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const x = useTransform(smooth, [0, 1], [0, -distance]);
  const progress = useTransform(smooth, [0, 1], ["0%", "100%"]);

  const theaterItems: TheaterItem[] = useMemo(
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

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  const card = (r: Reel, i: number, mobile = false) => (
    <article
      key={r.id}
      className={
        mobile
          ? "group relative w-[82vw] max-w-sm shrink-0 snap-center"
          : "group relative w-[min(46vw,640px)] shrink-0"
      }
    >
      <button
        type="button"
        onClick={() => openAt(i)}
        data-cursor="Play"
        className="block w-full text-left"
        aria-label={`Play ${r.title}`}
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-white/10">
          <Image
            src={r.thumbnail}
            alt={r.title}
            fill
            sizes={mobile ? "82vw" : "46vw"}
            className="object-cover transition duration-[1.2s] ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-500 group-hover:opacity-100 max-md:hidden">
            <span className="flex h-20 w-20 scale-75 items-center justify-center rounded-full bg-zh-gold/90 text-black transition duration-500 group-hover:scale-100">
              <Play className="ml-1 h-6 w-6 fill-black" />
            </span>
          </div>
          <span className="absolute left-5 top-5 font-display text-6xl font-bold text-white/15">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.35em] text-zh-gold">{r.category}</p>
              <h3 className="mt-2 font-serif text-2xl text-white sm:text-3xl">{r.title}</h3>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 font-mono text-[11px] text-zinc-300">
              <span>{duration(r.durationSec)}</span>
              <span className="flex items-center gap-1 text-zinc-500">
                <Eye className="h-3 w-3" /> {r.views.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </button>
      <FavoriteButton
        type="reel"
        id={r.id}
        title={r.title}
        count={loves[r.id] ?? 0}
        showCount
        className="absolute right-5 top-5 z-10"
      />
    </article>
  );

  const heading = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.45em] text-zh-gold/80">Now showing</p>
        <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none text-white sm:text-6xl">
          <SplitText text="Featured reels" inView />
        </h2>
      </div>
      <Link href="/reels" className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-400 hover:text-zh-gold">
        Enter the vault <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );

  return (
    <>
      {/* Desktop: vertical scroll drives a horizontal film strip */}
      <section id="featured" ref={sectionRef} className="relative hidden md:block" style={{ height: `calc(100vh + ${distance}px)` }}>
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          <div className="mx-auto mb-10 w-full max-w-7xl px-6">{heading}</div>
          <motion.div ref={trackRef} style={{ x }} className="flex gap-8 pl-6 pr-[10vw] will-change-transform lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
            {reels.map((r, i) => card(r, i))}
          </motion.div>
          <div className="mx-auto mt-10 w-full max-w-7xl px-6">
            <div className="zh-filmstrip relative h-3 overflow-hidden rounded-full bg-white/5">
              <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-zh-gold/40 to-zh-gold" style={{ width: progress }} />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile: native swipe carousel */}
      <section id="featured-mobile" className="py-16 md:hidden">
        <div className="px-4">{heading}</div>
        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none]">
          {reels.map((r, i) => card(r, i, true))}
        </div>
      </section>

      <TheaterViewer
        open={open}
        items={theaterItems}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setOpen(false)}
        favoriteType="reel"
        trackViews
      />
    </>
  );
}
