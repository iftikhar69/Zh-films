"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowRight, CalendarHeart, Heart, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { SplitText } from "@/components/motion/SplitText";
import { useFavorites } from "@/stores/favorites-store";
import { FAVORITE_LABELS, FAVORITE_TYPES, type FavoriteCard, type FavoriteType } from "@/lib/favorites";
import { cn } from "@/lib/utils";

type Tab = "all" | FavoriteType;

export function FavoritesBoard() {
  const keys = useFavorites((s) => s.keys);
  const hydrated = useFavorites((s) => s.hydrated);
  const clearAll = useFavorites((s) => s.clearAll);
  const [cards, setCards] = useState<FavoriteCard[] | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/favorites?expand=1", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { cards: FavoriteCard[] };
        if (!cancelled) setCards(data.cards);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => {
    setError(false);
    setCards(null);
    setAttempt((a) => a + 1);
  };

  // Un-hearting anywhere removes the card live; the store is the source of truth once hydrated.
  const live = useMemo(
    () => (cards ?? []).filter((c) => !hydrated || keys[c.key]),
    [cards, hydrated, keys]
  );
  const counts = useMemo(() => {
    const out: Record<Tab, number> = { all: live.length, reel: 0, gallery: 0, crew: 0, gear: 0 };
    for (const c of live) out[c.type] += 1;
    return out;
  }, [live]);
  const shown = tab === "all" ? live : live.filter((c) => c.type === tab);

  const bookHref = useMemo(() => {
    const reels = live.filter((c) => c.type === "reel").map((c) => c.title);
    const crew = live.filter((c) => c.type === "crew").map((c) => c.title);
    const parts = [
      reels.length ? `Loved reels: ${reels.slice(0, 5).join(", ")}` : "",
      crew.length ? `Crew: ${crew.slice(0, 4).join(", ")}` : ""
    ].filter(Boolean);
    return parts.length ? `/book?references=${encodeURIComponent(parts.join(" · "))}` : "/book";
  }, [live]);

  return (
    <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-32 sm:px-6 sm:pt-36">
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-rose-500/10 blur-[100px]" />

      <header className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-rose-300/80">
            <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" /> Your watchlist
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.9] text-white sm:text-7xl">
            <SplitText text="Favorites" />
          </h1>
          <p className="mt-4 text-sm text-zinc-400">
            Every reel, frame, crew member and camera you hearted — saved to this browser
            {" "}(and to your account when you sign in). Use it as a mood board when you book.
          </p>
        </div>
        {live.length ? (
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full tracking-[0.15em]">
              <Link href={bookHref}>
                <CalendarHeart className="h-4 w-4" /> Plan a shoot with these
              </Link>
            </Button>
            {confirmClear ? (
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-red-400/50 text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  setConfirmClear(false);
                  void clearAll();
                }}
              >
                Tap again to clear all
              </Button>
            ) : (
              <Button variant="ghost" size="lg" className="rounded-full border border-white/10" onClick={() => setConfirmClear(true)}>
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        ) : null}
      </header>

      <LayoutGroup>
        <div className="relative mt-10 flex flex-wrap gap-2">
          {(["all", ...FAVORITE_TYPES] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "relative rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors",
                tab === t ? "border-transparent text-black" : "border-white/10 text-zinc-400 hover:text-white"
              )}
            >
              {tab === t ? (
                <motion.span layoutId="fav-tab" className="absolute inset-0 -z-0 rounded-full bg-zh-gold" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              ) : null}
              <span className="relative">
                {t === "all" ? "All" : FAVORITE_LABELS[t].plural}
                <span className={cn("ml-2 font-mono", tab === t ? "text-black/60" : "text-zinc-600")}>{counts[t]}</span>
              </span>
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-16 rounded-3xl border border-red-400/20 bg-red-500/5 p-10 text-center">
            <p className="text-sm text-red-200">We couldn&apos;t load your favorites. The projector might be warming up.</p>
            <Button className="mt-5 rounded-full" variant="outline" onClick={retry}>
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
          </div>
        ) : cards === null ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-950">
                <div className="aspect-[4/3] animate-pulse bg-gradient-to-br from-zinc-900 to-zinc-950" />
                <div className="space-y-2 p-5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800" />
                  <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState filtered={tab !== "all" && live.length > 0} />
        ) : (
          <motion.div layout className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {shown.map((c, i) => (
                <motion.article
                  key={c.key}
                  layout
                  initial={{ opacity: 0, y: 30, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(i, 8) * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.3 } }}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70"
                >
                  <Link href={c.href} data-cursor="Open" className="block">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={c.image}
                        alt={c.title}
                        fill
                        sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                        className="object-cover transition duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                      <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zh-gold">
                        {FAVORITE_LABELS[c.type].singular}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-3 p-5">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] uppercase tracking-[0.25em] text-zinc-500">{c.subtitle}</p>
                        <h2 className="mt-1 truncate font-serif text-xl text-white group-hover:text-zh-gold">{c.title}</h2>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-zh-gold" />
                    </div>
                  </Link>
                  <FavoriteButton type={c.type} id={c.id} title={c.title} className="absolute right-4 top-4 z-10" />
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </LayoutGroup>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 flex flex-col items-center rounded-[2rem] border border-dashed border-white/10 bg-zinc-950/40 px-6 py-20 text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-16 w-16 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10"
      >
        <Heart className="h-7 w-7 text-rose-400" />
      </motion.div>
      <h2 className="mt-6 font-serif text-2xl text-white">
        {filtered ? "Nothing saved in this reel yet" : "Your watchlist is empty"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Tap the heart on any reel, gallery frame, crew member or camera. We&apos;ll keep them here for when you&apos;re ready to book.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="rounded-full">
          <Link href="/reels">Browse reels</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/hire">Meet the family</Link>
        </Button>
      </div>
    </motion.div>
  );
}
