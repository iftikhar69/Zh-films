"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { GALLERY_CATEGORIES, GALLERY_PAGE_SIZE, type GalleryCategory } from "@/lib/constants";
import type { GalleryItem } from "@prisma/client";
import { cn } from "@/lib/utils";
import { TheaterViewer, type TheaterItem } from "@/components/cinematic/TheaterViewer";

type GalleryPayload = {
  page: number;
  totalPages: number;
  hasMore: boolean;
  category: string;
  items: GalleryItem[];
};

export function GalleryExperience({
  initial,
  total,
  category,
  page
}: {
  initial: GalleryItem[];
  total: number;
  category: GalleryCategory;
  page: number;
}) {
  const [items, setItems] = useState(initial);
  const [stackPage, setStackPage] = useState(page);
  const [hasMore, setHasMore] = useState(page < Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE)));
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const [theaterOpen, setTheaterOpen] = useState(false);
  const [theaterIndex, setTheaterIndex] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE)), [total]);

  const theaterItems: TheaterItem[] = useMemo(
    () =>
      items.map((g) => ({
        id: g.id,
        title: g.title,
        mediaType: g.mediaType === "video" ? ("video" as const) : ("photo" as const),
        url: g.url,
        thumbnail: g.thumbnail,
        meta: g.category
      })),
    [items]
  );

  async function loadMoreAppend() {
    if (loading || !hasMore) return;
    setLoading(true);
    const next = stackPage + 1;
    const res = await fetch(`/api/gallery?page=${next}&category=${category}`);
    const data = (await res.json()) as GalleryPayload;
    setItems((prev) => [...prev, ...data.items]);
    setStackPage(data.page);
    setHasMore(data.hasMore);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Still + motion</p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Gallery</h1>
        <p className="mt-3 text-sm text-zinc-400">Tap any frame to enter full-screen theater.</p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2">
        {GALLERY_CATEGORIES.map((c) => {
          const href = c === "all" ? `/gallery?page=1` : `/gallery?category=${c}&page=1`;
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g, i) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              setTheaterIndex(i);
              setTheaterOpen(true);
            }}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 text-left transition hover:border-zh-gold/40"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src={g.thumbnail ?? g.url}
                alt={g.title}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
                sizes="(max-width:1024px) 100vw, 33vw"
                loading="lazy"
              />
              <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-zh-gold">
                {g.mediaType}
              </div>
            </div>
            <div className="border-t border-white/5 p-3 text-sm text-zinc-200">{g.title}</div>
          </button>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, idx) => {
            const p = idx + 1;
            const href =
              category === "all" ? `/gallery?page=${p}` : `/gallery?category=${category}&page=${p}`;
            return (
              <Link
                key={p}
                href={href}
                scroll={false}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-xs transition",
                  p === page
                    ? "border-zh-gold/70 bg-zh-gold text-black"
                    : "border-white/10 text-zinc-300 hover:border-zh-gold/40 hover:text-white"
                )}
              >
                {p}
              </Link>
            );
          })}
        </div>
        <Button
          type="button"
          variant="cinematic"
          disabled={!hasMore || loading}
          onClick={() => startTransition(() => void loadMoreAppend())}
        >
          {loading ? "Loading…" : hasMore ? "Load more" : "Complete"}
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
