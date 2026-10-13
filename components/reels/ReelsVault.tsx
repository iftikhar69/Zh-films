"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { REELS_PAGE_SIZE, REEL_CATEGORIES, type ReelCategory } from "@/lib/constants";
import type { Reel } from "@prisma/client";
import { cn } from "@/lib/utils";
import { TheaterViewer, type TheaterItem } from "@/components/cinematic/TheaterViewer";

type PagePayload = {
  page: number;
  totalPages: number;
  hasMore: boolean;
  category: string;
  items: Reel[];
};

export function ReelsVault({
  initial,
  total,
  category,
  page
}: {
  initial: Reel[];
  total: number;
  category: ReelCategory;
  page: number;
}) {
  const [items, setItems] = useState<Reel[]>(initial);
  const [stackPage, setStackPage] = useState(page);
  const [hasMore, setHasMore] = useState(page < Math.max(1, Math.ceil(total / REELS_PAGE_SIZE)));
  const [loading, setLoading] = useState(false);
  const [theaterOpen, setTheaterOpen] = useState(false);
  const [theaterIndex, setTheaterIndex] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / REELS_PAGE_SIZE)), [total]);

  const theaterItems: TheaterItem[] = useMemo(
    () =>
      items.map((r) => ({
        id: r.id,
        title: r.title,
        mediaType: "video" as const,
        url: r.videoUrl,
        thumbnail: r.thumbnail,
        meta: r.category
      })),
    [items]
  );

  const loadNext = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const next = stackPage + 1;
    const res = await fetch(`/api/reels?page=${next}&category=${category}`);
    const data = (await res.json()) as PagePayload;
    setItems((prev) => [...prev, ...data.items]);
    setStackPage(data.page);
    setHasMore(data.hasMore);
    setLoading(false);
  }, [category, hasMore, loading, stackPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadNext();
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadNext]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <header className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Vault · open theater</p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">The Reel Vault</h1>
        <p className="mt-2 text-xs font-mono uppercase tracking-[0.25em] text-zinc-500">
          Page {stackPage} / {totalPages} · {total} reels
        </p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2">
        {REEL_CATEGORIES.map((c) => {
          const href = c === "all" ? `/reels?page=1` : `/reels?category=${c}&page=1`;
          const active = c === category;
          return (
            <Link
              key={c}
              href={href}
              scroll={false}
              className={cn(
                "rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition",
                active
                  ? "border-zh-gold/70 bg-zh-gold text-black"
                  : "border-white/10 text-zinc-400 hover:border-zh-gold/40 hover:text-white"
              )}
            >
              {c}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {items.map((r, i) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setTheaterIndex(i);
              setTheaterOpen(true);
            }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 text-left transition hover:border-zh-gold/40"
          >
            <div className="relative aspect-video">
              <Image
                src={r.thumbnail}
                alt={r.title}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
                sizes="(max-width:768px) 100vw, 50vw"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                <span className="rounded-full border border-zh-gold/50 bg-black/70 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-zh-gold">
                  Open Theater
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-zh-gold/80">{r.category}</p>
                  <h2 className="mt-1 line-clamp-2 font-serif text-lg text-white">{r.title}</h2>
                </div>
                <span className="rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[10px] font-mono text-zinc-300">
                  {Math.floor(r.durationSec / 60)}:{String(r.durationSec % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div ref={sentinelRef} className="h-8" />

      <div className="mt-8 flex justify-center">
        <Button type="button" variant="cinematic" size="lg" disabled={!hasMore || loading} onClick={() => void loadNext()}>
          {loading ? "Loading…" : hasMore ? "Load more reels" : "End of vault"}
        </Button>
      </div>

      <TheaterViewer
        open={theaterOpen}
        items={theaterItems}
        index={theaterIndex}
        onIndexChange={setTheaterIndex}
        onClose={() => setTheaterOpen(false)}
      />
    </div>
  );
}
