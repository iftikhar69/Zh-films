"use client";

import { useState } from "react";
import Link from "next/link";
import { InViewVideo } from "@/components/motion/InViewVideo";

const MOODS = [
  {
    id: "romance",
    label: "Romance",
    line: "Soft light, close frames, slow moments.",
    video: "/media/instagram/DeRWT51oN9B.mp4",
    poster: "/media/instagram/DeRWT51oN9B.jpg",
    alt: "A couple walking hand in hand, filmed by ZH Films"
  },
  {
    id: "tradition",
    label: "Tradition",
    line: "Family, ceremony and the details people remember.",
    video: "/media/instagram/DdjUxjLAsza.mp4",
    poster: "/media/instagram/DdjUxjLAsza.jpg",
    alt: "A groom in a traditional cap with the bride beside him, filmed by ZH Films"
  },
  {
    id: "energy",
    label: "Energy",
    line: "Music, movement and faster cuts.",
    video: "/media/instagram/DddgxEABOoG.mp4",
    poster: "/media/instagram/DddgxEABOoG.jpg",
    alt: "A woman framed in a warm-lit archway, filmed by ZH Films"
  }
] as const;

export function MoodTeaserEngine() {
  const [mood, setMood] = useState<(typeof MOODS)[number]>(MOODS[0]);

  return (
    <section aria-labelledby="mood-heading" className="border-t border-white/5 bg-black py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-16">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 md:order-none">
          <InViewVideo
            key={mood.id}
            className="h-full w-full object-cover"
            src={mood.video}
            poster={mood.poster}
            preload="metadata"
            aria-label={mood.alt}
          />
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Find your mood</p>
          <h2 id="mood-heading" className="mt-3 font-serif text-3xl text-white sm:text-4xl">
            Every film has a feeling.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
            Pick one to see a clip from our work. It&apos;s where we start on real projects: the feeling first, then the
            light and the shots.
          </p>
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Choose a mood">
            {MOODS.map((m) => {
              const active = m.id === mood.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMood(m)}
                  className={`rounded-full border px-4 py-2 text-xs transition ${
                    active ? "border-zh-gold bg-zh-gold text-black" : "border-white/15 text-zinc-300 hover:border-zh-gold/50 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="mt-5 min-h-[3rem] font-serif text-xl text-white" aria-live="polite">
            {mood.line}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/book" className="inline-flex h-11 items-center rounded-full bg-zh-gold px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-black">
              Start a booking
            </Link>
            <Link href="/reels" className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-[11px] uppercase tracking-[0.2em] text-zinc-200 hover:border-zh-gold/50">
              See more films
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
