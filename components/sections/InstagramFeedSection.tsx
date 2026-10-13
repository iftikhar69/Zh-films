"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { FILM_FAMILY } from "@/lib/film-family";
import { cn } from "@/lib/utils";

type IgItem = {
  id: string;
  caption: string;
  mediaUrl: string;
  permalink: string;
  likeCount?: number;
  timestamp?: string;
};

type Sort = "latest" | "famous";

export function InstagramFeedSection({ variant = "home" }: { variant?: "home" | "page" }) {
  const [items, setItems] = useState<IgItem[]>([]);
  const [sort, setSort] = useState<Sort>("latest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await fetch(`/api/instagram?sort=${sort}`);
      const data = (await res.json()) as { items?: IgItem[] };
      if (!cancelled) {
        setItems(data.items ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sort]);

  return (
    <section className="relative border-t border-white/5 bg-gradient-to-b from-black via-zinc-950 to-black py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">
              {variant === "page" ? "Public dailies · no login" : "Live from set"}
            </p>
            <h2 className={`mt-2 font-serif text-white ${variant === "page" ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>
              Instagram — Latest & Famous
            </h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Everyone can watch the wall. Sort newest drops or the frames the city already loves.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full border border-white/10 p-1">
              {(["latest", "famous"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.22em]",
                    sort === s ? "bg-zh-gold text-black" : "text-zinc-400"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            {variant === "home" ? (
              <Link
                href="/instagram"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zh-gold hover:text-white"
              >
                Full wall
              </Link>
            ) : (
              <Link
                href={FILM_FAMILY.instagram}
                target="_blank"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zh-gold hover:text-white"
              >
                @zulfiqar_hussain.films <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading frames…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((it) => (
              <article key={it.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                <Link href={it.permalink} target="_blank" className="block">
                  <div className="relative aspect-[9/16]">
                    <Image
                      src={it.mediaUrl}
                      alt={it.caption}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width:1024px) 50vw, 25vw"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-80" />
                    {typeof it.likeCount === "number" ? (
                      <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/60 px-2 py-1 font-mono text-[10px] text-zh-gold">
                        ♥ {it.likeCount.toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <p className="line-clamp-3 px-3 py-3 text-xs text-zinc-300">{it.caption}</p>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
