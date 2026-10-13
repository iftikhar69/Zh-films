"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, PenLine, Quote, Star } from "lucide-react";
import { toast } from "sonner";
import type { Review } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Marquee } from "@/components/motion/Marquee";
import { CountUp } from "@/components/motion/CountUp";
import { SplitText } from "@/components/motion/SplitText";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

type Stats = { average: number; count: number };

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("flex gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i < value ? "fill-zh-gold text-zh-gold" : "text-zinc-700")} />
      ))}
    </span>
  );
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <figure className="mx-3 w-[320px] shrink-0 rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-6 sm:w-[380px]">
      <div className="flex items-center justify-between">
        <Stars value={r.rating} />
        <Quote className="h-5 w-5 text-zh-gold/30" />
      </div>
      <blockquote className="mt-4 line-clamp-5 text-sm leading-relaxed text-zinc-300">“{r.message}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zh-gold/15 font-display text-sm font-bold text-zh-gold">
          {r.name.charAt(0)}
        </span>
        <span>
          <span className="block text-sm text-white">{r.name}</span>
          <span className="block text-[10px] uppercase tracking-[0.25em] text-zinc-500">{r.eventType}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function ReviewsWall({ initial, stats: initialStats }: { initial: Review[]; stats: Stats }) {
  const [reviews, setReviews] = useState(initial);
  const [stats, setStats] = useState(initialStats);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", eventType: "", message: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const half = Math.ceil(reviews.length / 2);
  const rowA = reviews.slice(0, half);
  const rowB = reviews.slice(half).length ? reviews.slice(half) : reviews;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rating })
      });
      const data = (await res.json()) as { ok: boolean; error?: string; review?: Review; stats?: Stats };
      if (!res.ok || !data.ok || !data.review) throw new Error(data.error ?? "Could not post review");
      setReviews((prev) => [data.review as Review, ...prev]);
      if (data.stats) setStats(data.stats);
      setForm({ name: "", eventType: "", message: "" });
      setRating(5);
      setOpen(false);
      toast.success("Thank you — your review is on the wall", { description: "It's now scrolling with the others." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post review");
    } finally {
      setBusy(false);
    }
  }

  const shownRating = hoverRating ?? rating;

  return (
    <section className="relative overflow-hidden border-t border-white/5 py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[50rem] -translate-x-1/2 rounded-full bg-zh-gold/10 blur-[120px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-zh-gold/80">Reviews from the front row</p>
          <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none text-white sm:text-6xl">
            <SplitText text="Standing ovation" inView />
          </h2>
        </div>
        <Reveal className="flex items-center gap-6">
          <div>
            <div className="flex items-baseline gap-2 font-display text-6xl font-bold text-white">
              <CountUp to={stats.average} decimals={1} />
              <span className="text-lg text-zinc-500">/5</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={Math.round(stats.average)} />
              <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{stats.count} reviews</span>
            </div>
          </div>
          <Button size="lg" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
            <PenLine className="h-4 w-4" /> Write a review
          </Button>
        </Reveal>
      </div>

      <div className="relative mt-14 space-y-6 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        <Marquee seconds={Math.max(30, rowA.length * 9)}>
          {rowA.map((r) => (
            <ReviewCard key={r.id} r={r} />
          ))}
        </Marquee>
        <Marquee seconds={Math.max(34, rowB.length * 10)} reverse>
          {rowB.map((r) => (
            <ReviewCard key={`b-${r.id}`} r={r} />
          ))}
        </Marquee>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-white">How was your film?</DialogTitle>
            <DialogDescription>Your words go straight onto the wall for the next couple to read.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-400">Rating</p>
              <div className="flex items-center gap-1" onPointerLeave={() => setHoverRating(null)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    whileHover={{ scale: 1.2, rotate: -8 }}
                    whileTap={{ scale: 0.9 }}
                    onPointerEnter={() => setHoverRating(n)}
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        n <= shownRating ? "fill-zh-gold text-zh-gold drop-shadow-[0_0_12px_rgba(200,169,106,0.6)]" : "text-zinc-700"
                      )}
                    />
                  </motion.button>
                ))}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={shownRating}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="ml-3 text-xs uppercase tracking-[0.2em] text-zh-gold"
                  >
                    {["", "Not for us", "It was okay", "Good film", "Loved it", "Blockbuster"][shownRating]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                Your name
                <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ayesha & Umer" />
              </label>
              <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                What we filmed
                <Input required value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))} placeholder="Wedding, AKU, brand…" />
              </label>
            </div>
            <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              Your review
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="The moment we watched the trailer…"
                className="w-full resize-none rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zh-gold/50"
              />
              <span className="block text-right font-mono text-[10px] normal-case text-zinc-600">{form.message.length}/600</span>
            </label>
            {error ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Posting…" : "Post review"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
