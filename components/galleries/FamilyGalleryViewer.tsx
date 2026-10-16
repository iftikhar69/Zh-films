"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

type Photo = { id: string; width: number; height: number; thumb: string | null; display: string | null };

export function FamilyGalleryViewer({
  galleryId,
  initial,
  initialCursor,
  total,
  downloads
}: {
  galleryId: string;
  initial: Photo[];
  initialCursor: string | null;
  total: number;
  downloads: boolean;
}) {
  const [photos, setPhotos] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/galleries/${galleryId}/photos?cursor=${encodeURIComponent(cursor)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Couldn't load more photos");
      setPhotos((p) => [...p, ...json.photos]);
      setCursor(json.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load more photos");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, galleryId]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  if (!photos.length) {
    return (
      <p className="rounded-3xl border border-dashed border-white/15 p-12 text-center text-sm text-zinc-400">
        Your photos are being prepared. Check back soon.
      </p>
    );
  }

  return (
    <>
      <ul className="columns-2 gap-2 sm:columns-3 sm:gap-3 lg:columns-4">
        {photos.map((p, i) => (
          <li key={p.id} className="mb-2 break-inside-avoid sm:mb-3">
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full overflow-hidden rounded-lg bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zh-gold"
              style={{ aspectRatio: `${p.width} / ${p.height}` }}
              aria-label={`Open photo ${i + 1} of ${total}`}
            >
              {p.thumb ? (
                // Signed, expiring URLs from private storage; next/image would cache them publicly.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.thumb}
                  alt=""
                  width={p.width}
                  height={p.height}
                  loading={i < 8 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="py-10 text-center text-xs text-zinc-500" aria-live="polite">
        {error ? (
          <button type="button" onClick={() => void loadMore()} className="text-red-300 underline">
            {error} — try again
          </button>
        ) : loading ? (
          "Loading more photos…"
        ) : cursor ? (
          ""
        ) : (
          `All ${total} photos`
        )}
      </div>
      {open !== null && photos[open] ? (
        <Lightbox photos={photos} index={open} onIndex={setOpen} galleryId={galleryId} downloads={downloads} total={total} onNearEnd={loadMore} />
      ) : null}
    </>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  galleryId,
  downloads,
  total,
  onNearEnd
}: {
  photos: Photo[];
  index: number;
  onIndex: (i: number | null) => void;
  galleryId: string;
  downloads: boolean;
  total: number;
  onNearEnd: () => void;
}) {
  const p = photos[index];
  const [loaded, setLoaded] = useState<string | null>(null);
  const touch = useRef<number | null>(null);
  const prev = useCallback(() => onIndex(Math.max(0, index - 1)), [index, onIndex]);
  const next = useCallback(() => {
    if (index >= photos.length - 3) onNearEnd();
    onIndex(Math.min(photos.length - 1, index + 1));
  }, [index, photos.length, onIndex, onNearEnd]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndex(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [prev, next, onIndex]);

  useEffect(() => {
    const ahead = photos[index + 1]?.display;
    if (ahead) new Image().src = ahead;
  }, [index, photos]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${total}`}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
        touch.current = null;
      }}
    >
      <div className="flex items-center justify-between p-3 text-xs text-zinc-400 sm:p-4">
        <span className="font-mono">
          {index + 1} / {total}
        </span>
        <div className="flex items-center gap-2">
          {downloads ? (
            <a
              href={`/api/galleries/${galleryId}/photos/${p.id}/download`}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-4 text-zinc-200 hover:border-zh-gold/60 hover:text-zh-gold"
            >
              <Download className="h-4 w-4" /> Original
            </a>
          ) : null}
          <button type="button" onClick={() => onIndex(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-zinc-200" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.thumb ?? ""} alt="" aria-hidden className={`absolute max-h-full max-w-full object-contain blur-sm transition-opacity ${loaded === p.id ? "opacity-0" : "opacity-60"}`} />
        {p.display ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.id}
            src={p.display}
            alt={`Photo ${index + 1}`}
            onLoad={() => setLoaded(p.id)}
            className={`relative max-h-full max-w-full object-contain transition-opacity duration-300 ${loaded === p.id ? "opacity-100" : "opacity-0"}`}
          />
        ) : null}
        <button type="button" onClick={prev} disabled={index === 0} aria-label="Previous photo" className="absolute left-2 hidden h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white disabled:opacity-30 sm:flex">
          <ChevronLeft />
        </button>
        <button type="button" onClick={next} disabled={index >= photos.length - 1} aria-label="Next photo" className="absolute right-2 hidden h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white disabled:opacity-30 sm:flex">
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
