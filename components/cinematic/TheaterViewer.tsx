"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSoundscape } from "@/hooks/useSoundscape";
import { useCinemaStore } from "@/stores/cinema-store";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import type { FavoriteType } from "@/lib/favorites";

export type TheaterItem = {
  id: string;
  title: string;
  mediaType: "video" | "photo";
  url: string;
  thumbnail?: string | null;
  meta?: string;
};

type Props = {
  open: boolean;
  items: TheaterItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  favoriteType?: FavoriteType;
  /** POSTs a view to /api/reels/:id/view each time a reel is shown. */
  trackViews?: boolean;
};

export function TheaterViewer({ open, items, index, onIndexChange, onClose, favoriteType, trackViews }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { applause, shutter } = useSoundscape();
  const soundEnabled = useCinemaStore((s) => s.soundEnabled);
  const item = items[index];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!items.length) return;
      const next = (index + dir + items.length) % items.length;
      onIndexChange(next);
      shutter();
    },
    [index, items.length, onIndexChange, shutter]
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (soundEnabled) applause();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, applause, soundEnabled]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft" || e.key === "h" || e.key === "H") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) void v.play();
        else v.pause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, open]);

  useEffect(() => {
    if (!open || !item || item.mediaType !== "video") return;
    const v = videoRef.current;
    if (!v) return;
    void v.play().catch(() => undefined);
  }, [index, item, open]);

  const itemId = item?.id;
  useEffect(() => {
    if (!open || !trackViews || !itemId) return;
    void fetch(`/api/reels/${itemId}/view`, { method: "POST" }).catch(() => undefined);
  }, [open, trackViews, itemId]);

  if (!open || !item || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Theater: ${item.title}`}
      className="fixed inset-0 z-[120] flex flex-col bg-black animate-in fade-in-0 zoom-in-95 duration-300"
      data-lenis-prevent
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black to-transparent sm:w-16" />

      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg text-white sm:text-xl">{item.title}</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zh-gold/80">
            {index + 1} / {items.length}
            {item.meta ? ` · ${item.meta}` : ""} · ← → space · esc
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {favoriteType ? <FavoriteButton type={favoriteType} id={item.id} title={item.title} size="sm" /> : null}
          <Button type="button" size="sm" variant="outline" onClick={() => go(-1)}>
            Prev
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => go(1)}>
            Next
          </Button>
          <Button type="button" size="sm" variant="cinematic" onClick={onClose}>
            Exit
          </Button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        {item.mediaType === "video" ? (
          <video
            key={item.id}
            ref={videoRef}
            className="max-h-full max-w-full rounded-lg border border-white/10 bg-black shadow-[0_0_80px_rgba(0,0,0,0.8)]"
            src={item.url}
            poster={item.thumbnail ?? undefined}
            controls
            playsInline
            autoPlay
          />
        ) : (
          <div className="relative h-full w-full max-w-5xl">
            <Image
              key={item.id}
              src={item.url}
              alt={item.title}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
