"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  GALLERY_CATEGORIES,
  GALLERY_PAGE_SIZE,
  type GalleryCategory,
} from "@/lib/constants";
import type { GalleryItem } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  TheaterViewer,
  type TheaterItem,
} from "@/components/cinematic/TheaterViewer";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { CategoryPills } from "@/components/motion/CategoryPills";
import { SplitText } from "@/components/motion/SplitText";

const ASPECTS = [
  "aspect-[4/5]",
  "aspect-[4/3]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-video",
];

type GalleryPayload = {
  page: number;
  totalPages: number;
  hasMore: boolean;
  category: string;
  items: GalleryItem[];
  loves: Record<string, number>;
};

export function GalleryExperience({
  initial,
  loves: initialLoves,
  total,
  category,
  page,
}: {
  initial: GalleryItem[];
  loves: Record<string, number>;
  total: number;
  category: GalleryCategory;
  page: number;
}) {
  const [items, setItems] = useState(initial);
  const [loves, setLoves] = useState(initialLoves);
  const [stackPage, setStackPage] = useState(page);
  const [hasMore, setHasMore] = useState(
    page < Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE)),
  );
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const [theaterOpen, setTheaterOpen] = useState(false);
  const [theaterIndex, setTheaterIndex] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE)),
    [total],
  );

  const theaterItems: TheaterItem[] = useMemo(
    () =>
      items.map((g) => ({
        id: g.id,
        title: g.title,
        mediaType:
          g.mediaType === "video" ? ("video" as const) : ("photo" as const),
        url: g.url,
        thumbnail: g.thumbnail,
        meta: g.category,
      })),
    [items],
  );

  async function loadMoreAppend() {
    if (loading || !hasMore) return;
    setLoading(true);
    const next = stackPage + 1;
    const res = await fetch(`/api/gallery?page=${next}&category=${category}`);
    const data = (await res.json()) as GalleryPayload;
    setItems((prev) => [...prev, ...data.items]);
    setLoves((prev) => ({ ...prev, ...data.loves }));
    setStackPage(data.page);
    setHasMore(data.hasMore);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-12 sm:px-6">
      <header className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-zh-gold/80">
            Still + motion
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.9] text-white sm:text-8xl">
            <SplitText text="Gallery" />
          </h1>
        </div>
        <p className="max-w-xs text-sm text-zinc-400">
          Tap any frame to enter the theater. Heart the ones you want on your
          mood board.
        </p>
      </header>

      <div className="mb-10">
        <CategoryPills
          categories={GALLERY_CATEGORIES}
          active={category}
          layoutId="gallery-cat"
          hrefFor={(c) =>
            c === "all" ? `/gallery?page=1` : `/gallery?category=${c}&page=1`
          }
        />
      </div>

      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
        {items.map((g, i) => (
          <motion.figure
            key={g.id}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-5% 0px" }}
            transition={{
              duration: 0.7,
              delay: (i % 3) * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="group relative mb-5 break-inside-avoid overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/60"
          >
            <button
              type="button"
              data-cursor={g.mediaType === "video" ? "Play" : "View"}
              onClick={() => {
                setTheaterIndex(i);
                setTheaterOpen(true);
              }}
              className="block w-full text-left"
            >
              <div
                className={cn(
                  "relative overflow-hidden",
                  ASPECTS[i % ASPECTS.length],
                )}
              >
                <Image
                  src={g.thumbnail ?? g.url}
                  alt={g.title}
                  fill
                  className="object-cover transition duration-[1.2s] ease-out group-hover:scale-110"
                  sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-zh-gold backdrop-blur">
                  {g.mediaType === "video" ? (
                    <Play className="h-2.5 w-2.5 fill-zh-gold" />
                  ) : null}
                  {g.mediaType}
                </span>
                <figcaption className="absolute inset-x-4 bottom-4 translate-y-2 opacity-80 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400">
                    {g.category}
                  </p>
                  <p className="font-serif text-lg text-white">{g.title}</p>
                </figcaption>
              </div>
            </button>
            <FavoriteButton
              type="gallery"
              id={g.id}
              title={g.title}
              count={loves[g.id] ?? 0}
              size="sm"
              className="absolute right-4 top-4 z-10"
            />
          </motion.figure>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, idx) => {
            const p = idx + 1;
            const href =
              category === "all"
                ? `/gallery?page=${p}`
                : `/gallery?category=${category}&page=${p}`;
            return (
              <Link
                key={p}
                href={href}
                scroll={false}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-xs transition",
                  p === page
                    ? "border-zh-gold/70 bg-zh-gold text-black"
                    : "border-white/10 text-zinc-300 hover:border-zh-gold/40 hover:text-white",
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
          className="rounded-full"
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
        favoriteType="gallery"
      />
    </div>
  );
}
