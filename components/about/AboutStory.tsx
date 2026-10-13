"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const team = [
  { name: "Zulfikar Hussain", role: "CEO & Lead Cinematographer", note: "Cinematic films degree · 7+ years on lens." },
  { name: "Noor", role: "Colour & Finish", note: "Velvet shadows, gold highlights, emotional fidelity." },
  { name: "Hassan", role: "Aerial & Movement", note: "Drone poetry with safety-first blocking." },
  { name: "Ayaan", role: "Sound & Score", note: "Wind, fabric, vows — tactile audio design." }
];

export function AboutStory() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <header className="mb-12 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Scene II — Portrait</p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-5xl">Zulfikar Hussain</h1>
        <p className="mt-4 text-sm text-zinc-400">
          Degree in cinematic films. Seven years leading wedding cinema, AKU events, pre-events, and commercial work across
          Pakistan — with a Lahore crew that treats every project like opening night.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10"
        >
          <Image src="https://picsum.photos/seed/zh-about-portrait/900/1120" alt="Zulfikar Hussain portrait" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          <p className="absolute bottom-6 left-6 right-6 text-xs uppercase tracking-[0.35em] text-zh-gold">
            Lead Cinematographer · ZH Films
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.08 }}
          className="space-y-5 text-sm leading-relaxed text-zinc-300"
        >
          <p>
            I did not choose wedding films — they chose me. There is a heartbeat in Pakistani celebrations that Hollywood
            templates cannot touch. My job is to protect that heartbeat inside a blockbuster visual language.
          </p>
          <p>
            From AKU convocations to velvet-draped mehndis, we engineer light like dialogue: every beam should reveal
            character, never flatten it.
          </p>
          <p className="text-zh-gold/90">
            This studio is not a vendor list — it is a director’s chair you invite beside your family.
          </p>
        </motion.div>
      </div>

      <section className="mt-16 border-t border-white/5 pt-12">
        <h2 className="font-serif text-2xl text-white sm:text-3xl">Creative collective</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          A compact, obsessive unit — each role tuned for cinematic weddings, institutional events, and commercial sets.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {team.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5"
            >
              <p className="text-sm font-semibold text-white">{m.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.28em] text-zh-gold/80">{m.role}</p>
              <p className="mt-3 text-sm text-zinc-400">{m.note}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
