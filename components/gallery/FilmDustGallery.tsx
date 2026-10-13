"use client";

import { useMemo, useState } from "react";

const hiddenProjects = [
  "Hidden Project: Heirloom Haveli Wedding",
  "Hidden Project: AKU Gala Director’s Cut",
  "Hidden Project: Lahore Rooftop Proposal",
  "Hidden Project: Gold Rain Mehndi"
];

/** CSS-only dust buttons — no Framer Motion loops. */
export function FilmDustGallery() {
  const [caught, setCaught] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);

  const dust = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        x: 8 + ((i * 11) % 84),
        y: 12 + ((i * 17) % 70),
        s: 8 + (i % 3) * 3
      })),
    []
  );

  const reveal = () => {
    setCaught((c) => c + 1);
    setRevealed((prev) => {
      const next = hiddenProjects[prev.length];
      if (!next) return prev;
      return [...prev, next];
    });
  };

  return (
    <section className="relative mx-auto mb-8 max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-black/60 px-4 py-6 sm:px-6">
      <p className="text-[10px] uppercase tracking-[0.4em] text-zh-gold/80">Film Dust Gallery</p>
      <h2 className="mt-2 font-serif text-xl text-white sm:text-2xl">Catch floating dust, reveal hidden projects</h2>
      <p className="mt-2 text-xs text-zinc-400">Caught: {caught}</p>

      <div className="relative mt-4 h-28 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60">
        {dust.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={reveal}
            className="absolute rounded-full bg-zh-gold/50 shadow-[0_0_10px_rgba(200,169,106,0.35)] transition hover:scale-110"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }}
            aria-label="Catch dust"
          />
        ))}
      </div>

      {revealed.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {revealed.map((r) => (
            <div key={r} className="rounded-lg border border-zh-gold/25 bg-black/60 px-3 py-2 text-xs text-zinc-200">
              {r}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
