"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Aperture, Clapperboard, Palette, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";

const STEPS = [
  {
    icon: Palette,
    take: "Take 01",
    title: "Mood first",
    copy: "A call with Zulfikar to find the feeling — romance, prestige, hype or brand poetry. We build a reference board from reels you love."
  },
  {
    icon: Clapperboard,
    take: "Take 02",
    title: "Blocking the day",
    copy: "Shot lists, entrances, drone corridors and golden-hour windows mapped to your timeline. Nothing left to chance."
  },
  {
    icon: Aperture,
    take: "Take 03",
    title: "Lights, camera, family",
    copy: "Cinematographers, photographers, sound, drone and styling move as one crew — invisible on the floor, everywhere on screen."
  },
  {
    icon: Sparkles,
    take: "Take 04",
    title: "The premiere",
    copy: "Teaser in days, feature film in weeks. Graded in warm cinema gold and delivered for the big screen and the vertical one."
  }
];

export function ProcessTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  return (
    <section className="relative border-t border-white/5 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="text-xs uppercase tracking-[0.45em] text-zh-gold/80">How a ZH film is made</p>
          <h2 className="mt-4 font-display text-4xl font-bold uppercase leading-[0.95] text-white sm:text-6xl">
            <SplitText text="Four takes." inView />
            <br />
            <span className="zh-text-outline">
              <SplitText text="One story." inView delay={0.3} />
            </span>
          </h2>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-zinc-400">
              Every project — a three-day wedding or a sixty-second spot — runs on the same call sheet. Scroll through the
              production.
            </p>
          </Reveal>
        </div>

        <div ref={ref} className="relative pl-10 sm:pl-14">
          <div className="absolute bottom-0 left-[14px] top-0 w-px bg-white/10 sm:left-[22px]" />
          <motion.div
            className="absolute bottom-0 left-[14px] top-0 w-px origin-top bg-gradient-to-b from-zh-gold via-zh-gold to-zh-ember sm:left-[22px]"
            style={{ scaleY }}
          />
          <div className="space-y-16">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05} className="relative">
                <span className="absolute -left-10 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-zh-gold/50 bg-zh-black sm:-left-14 sm:h-11 sm:w-11">
                  <s.icon className="h-3.5 w-3.5 text-zh-gold sm:h-5 sm:w-5" />
                </span>
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500">{s.take}</p>
                <h3 className="mt-2 font-serif text-3xl text-white">{s.title}</h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">{s.copy}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
