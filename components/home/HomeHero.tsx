"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, Play, Star } from "lucide-react";
import { CameraHUD } from "@/components/cinematic/CameraHUD";
import { SplitText } from "@/components/motion/SplitText";
import { Magnetic } from "@/components/motion/Magnetic";
import { CountUp } from "@/components/motion/CountUp";
import { scrollToTarget } from "@/components/motion/SmoothScroll";
import { useUi } from "@/stores/ui-store";

const HERO_VIDEO =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL ??
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

const EASE = [0.16, 1, 0.3, 1] as const;

export function HomeHero({
  reviewAverage,
  reviewCount,
  reelCount
}: {
  reviewAverage: number;
  reviewCount: number;
  reelCount: number;
}) {
  const ready = useUi((s) => s.introDone);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.35]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.8], [0.6, 0.1]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const stats = [
    { value: 7, suffix: "+", label: "Years behind the lens" },
    { value: reelCount * 14, suffix: "+", label: "Films delivered" },
    { value: reviewAverage || 5, decimals: 1, suffix: "", label: `Rating · ${reviewCount} reviews`, star: true },
    { value: 8, suffix: "", label: "Seats in the family" }
  ];

  return (
    <section ref={ref} className="relative flex min-h-[100svh] flex-col overflow-hidden">
      <motion.div className="absolute inset-0" style={{ scale: videoScale, opacity: videoOpacity }}>
        <video className="h-full w-full object-cover" src={HERO_VIDEO} autoPlay muted loop playsInline preload="auto" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-zh-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(200,169,106,0.18),transparent_60%)]" />
      <div className="zh-hero-grain absolute inset-0" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-zh-ember/15 blur-[120px] zh-aurora" />

      {/* Letterbox bars "open" like a projector gate */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 z-30 bg-black"
        initial={{ height: "50%" }}
        animate={ready ? { height: "0%" } : undefined}
        transition={{ duration: 1.3, delay: 0, ease: [0.76, 0, 0.24, 1] }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-30 bg-black"
        initial={{ height: "50%" }}
        animate={ready ? { height: "0%" } : undefined}
        transition={{ duration: 1.3, delay: 0, ease: [0.76, 0, 0.24, 1] }}
      />

      <div className="relative z-20 mt-20 h-12 sm:mt-24">
        <CameraHUD />
      </div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-20 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-10 pt-6 sm:px-6"
      >
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.5, duration: 0.8, ease: EASE }}
          className="mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.5em] text-zh-gold sm:text-xs"
        >
          <span className="h-px w-10 bg-zh-gold/60" />
          ZH Films · Directed by Zulfikar Hussain
        </motion.p>

        <h1 className="font-display text-[clamp(3.2rem,12vw,10.5rem)] font-bold uppercase leading-[0.86] tracking-[-0.03em] text-white">
          <SplitText text="We film" delay={0.55} play={ready} className="block" />
          <span className="block">
            <SplitText text="feelings." delay={0.8} play={ready} charClassName="zh-text-shimmer" />
          </span>
        </h1>

        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay: 1.2, duration: 0.9, ease: EASE }}
            className="max-w-md text-balance text-sm leading-relaxed text-zinc-300 sm:text-base"
          >
            Wedding epics, AKU ceremonies, pre-events and brand films from Lahore — shot like cinema, cut like a trailer,
            and remembered for a lifetime.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay: 1.35, duration: 0.9, ease: EASE }}
            className="flex flex-wrap items-center gap-4"
          >
            <Magnetic>
              <Link
                href="/reels"
                data-cursor="Watch"
                className="group flex items-center gap-4 rounded-full border border-white/15 bg-white/5 py-2 pl-2 pr-6 backdrop-blur-md transition hover:border-zh-gold/50"
              >
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
                  <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                  <Play className="relative ml-0.5 h-4 w-4 fill-black" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white">Watch the reels</span>
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                href="/book"
                data-cursor="Book"
                className="group relative flex h-16 items-center overflow-hidden rounded-full bg-zh-gold px-8 text-xs font-bold uppercase tracking-[0.25em] text-black"
              >
                <span className="absolute inset-0 translate-y-full rounded-full bg-white transition-transform duration-500 ease-out group-hover:translate-y-0" />
                <span className="relative">Book your date</span>
              </Link>
            </Magnetic>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ delay: 1.6, duration: 1 }}
        className="relative z-20 border-t border-white/10 bg-black/40 backdrop-blur-md"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-[repeat(4,1fr)_auto]">
          {stats.map((s, i) => (
            <div key={s.label} className={`py-5 ${i % 2 ? "pl-5" : ""} ${i > 0 ? "lg:border-l lg:border-white/10 lg:pl-6" : ""}`}>
              <div className="flex items-center gap-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
                <CountUp to={s.value} decimals={s.decimals ?? 0} suffix={s.suffix} />
                {s.star ? <Star className="h-5 w-5 fill-zh-gold text-zh-gold" /> : null}
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-zinc-500">{s.label}</p>
            </div>
          ))}
          <button
            type="button"
            onClick={() => scrollToTarget("#featured")}
            className="hidden items-center gap-3 pl-6 text-[10px] uppercase tracking-[0.3em] text-zinc-400 hover:text-zh-gold lg:flex"
          >
            Scroll
            <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
              <ArrowDown className="h-4 w-4" />
            </motion.span>
          </button>
        </div>
      </motion.div>
    </section>
  );
}
