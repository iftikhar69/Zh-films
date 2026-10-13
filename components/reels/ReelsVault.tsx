"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  REELS_PAGE_SIZE,
  REEL_CATEGORIES,
  type ReelCategory,
} from "@/lib/constants";
import type { Reel } from "@prisma/client";
import {
  TheaterViewer,
  type TheaterItem,
} from "@/components/cinematic/TheaterViewer";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { TiltCard } from "@/components/motion/TiltCard";
import { SplitText } from "@/components/motion/SplitText";
import { CategoryPills } from "@/components/motion/CategoryPills";

type PagePayload = {
  page: number;
  totalPages: number;
  hasMore: boolean;
  category: string;
  items: Reel[];
  loves: Record<string, number>;
};

function duration(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function ReelsVault({
  initial,
  loves: initialLoves,
  total,
  category,
  page,
}: {
  initial: Reel[];
  loves: Record<string, number>;
  total: number;
  category: ReelCategory;
  page: number;
}) {
  const [items, setItems] = useState<Reel[]>(initial);
  const [loves, setLoves] = useState(initialLoves);
  const [stackPage, setStackPage] = useState(page);
  const [hasMore, setHasMore] = useState(
    page < Math.max(1, Math.ceil(total / REELS_PAGE_SIZE)),
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [theaterOpen, setTheaterOpen] = useState(false);
  const [theaterIndex, setTheaterIndex] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const theaterItems: TheaterItem[] = useMemo(
    () =>
      items.map((r) => ({
        id: r.id,
        title: r.title,
        mediaType: "video" as const,
        url: r.videoUrl,
        thumbnail: r.thumbnail,
        meta: r.category,
      })),
    [items],
  );

  const loadNext = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/reels?page=${stackPage + 1}&category=${category}`,
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as PagePayload;
      setItems((prev) => [...prev, ...data.items]);
      setLoves((prev) => ({ ...prev, ...data.loves }));
      setStackPage(data.page);
      setHasMore(data.hasMore);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [category, hasMore, loading, stackPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loadError) return;
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && void loadNext(),
      {
        rootMargin: "300px",
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadNext, loadError]);

  return (
    <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-32 sm:px-6 sm:pt-40">
      <div className="pointer-events-none absolute -top-10 left-1/3 h-96 w-96 rounded-full bg-zh-gold/10 blur-[120px] zh-aurora" />
      <header className="relative mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-zh-gold/80">
            Vault · open theater
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.9] text-white sm:text-8xl">
            <SplitText text="Reel vault" />
          </h1>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">
          {items.length} of {total} reels · {category}
        </p>
      </header>

      <div className="mb-10">
        <CategoryPills
          categories={REEL_CATEGORIES}
          active={category}
          layoutId="reel-cat"
          hrefFor={(c) =>
            c === "all" ? `/reels?page=1` : `/reels?category=${c}&page=1`
          }
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 py-24 text-center text-sm text-zinc-500">
          No reels in this category yet — new films land every month.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((r, i) => (
            <motion.article
              key={r.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-5% 0px" }}
              transition={{
                duration: 0.8,
                delay: (i % 2) * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className={i % 2 === 1 ? "md:mt-16" : ""}>
                <TiltCard className="group rounded-[1.75rem]" max={5}>
                  <button
                    type="button"
                    data-cursor="Play"
                    onClick={() => {
                      setTheaterIndex(i);
                      setTheaterOpen(true);
                    }}
                    className="block w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/60 text-left transition-colors hover:border-zh-gold/40"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={r.thumbnail}
                        alt={r.title}
                        fill
                        className="object-cover transition duration-[1.2s] ease-out group-hover:scale-110"
                        sizes="(max-width:768px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-16 w-16 scale-50 items-center justify-center rounded-full bg-zh-gold/90 text-black opacity-0 transition duration-500 group-hover:scale-100 group-hover:opacity-100">
                          <Play className="ml-1 h-5 w-5 fill-black" />
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.35em] text-zh-gold/90">
                            {r.category}
                          </p>
                          <h2 className="mt-1 line-clamp-2 font-serif text-xl text-white sm:text-2xl">
                            {r.title}
                          </h2>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 font-mono text-[11px] text-zinc-300">
                          <span className="rounded-full border border-white/15 bg-black/60 px-2 py-0.5">
                            {duration(r.durationSec)}
                          </span>
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Eye className="h-3 w-3" />{" "}
                            {r.views.toLocaleString()}
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
                    className="absolute right-4 top-4 z-30"
                  />
                </TiltCard>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-8" />

      <div className="mt-16 flex flex-col items-center gap-3">
        {loadError ? (
          <p className="text-sm text-red-300">
            Couldn&apos;t load more reels. Check your connection.
          </p>
        ) : null}
        <Button
          type="button"
          variant="cinematic"
          size="lg"
          className="rounded-full"
          disabled={!hasMore || loading}
          onClick={() => void loadNext()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading
            ? "Rolling film…"
            : loadError
              ? "Try again"
              : hasMore
                ? "Load more reels"
                : "That's a wrap — end of vault"}
        </Button>
      </div>

      <TheaterViewer
        open={theaterOpen}
        items={theaterItems}
        index={theaterIndex}
        onIndexChange={setTheaterIndex}
        onClose={() => setTheaterOpen(false)}
        favoriteType="reel"
        trackViews
      />
    </div>
  );
}
