"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { GearEnquiry, gearWhatsApp } from "@/components/gear/GearEnquiry";
import { GEAR_CATEGORIES, SELL_BACKDROP, formatPrice, type GearCategory, type PublicGear } from "@/lib/gear";
import { FILM_FAMILY, waLink } from "@/lib/film-family";
import { cn } from "@/lib/utils";

/** For sale: an editorial "vault" — each piece gets a spec sheet, like a camera store's window card. */
export function SellShowroom({ items }: { items: PublicGear[] }) {
  const [active, setActive] = useState<PublicGear | null>(null);
  const [cat, setCat] = useState("all");
  const cats = [...new Set(items.map((i) => i.category))];
  const shown = items.filter((i) => cat === "all" || i.category === cat);

  return (
    <div className="pb-24">
      <header className="relative isolate overflow-hidden border-b border-white/10">
        <Image src={SELL_BACKDROP} alt="Cinema camera rig on set" fill priority sizes="100vw" className="-z-10 object-cover object-[60%_40%] opacity-55" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/30" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-32 sm:px-6 sm:pt-40 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-zh-gold">The ZH vault · for sale</p>
            <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.88] text-white sm:text-7xl">
              Gear that has
              <br />
              filmed weddings
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-zinc-300">
              Cameras, lenses and lighting from the ZH Films kit, sold directly by {FILM_FAMILY.ceo}. Ask anything about condition
              and history before you buy.
            </p>
          </div>
          <ol className="grid gap-2 text-xs text-zinc-300 sm:grid-cols-3 lg:grid-cols-1">
            {["Send an enquiry or WhatsApp", "We share condition, photos and price", "Inspect, pay and collect"].map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                <span className="font-mono text-zh-gold">0{i + 1}</span> {s}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {items.length === 0 ? (
          <div className="mx-auto mt-16 max-w-xl text-center">
            <p className="font-serif text-3xl text-white">Nothing in the vault right now</p>
            <p className="mt-3 text-sm text-zinc-400">
              New pieces are listed here as they leave our kit. Tell us what you&apos;re looking for and we&apos;ll let you know.
            </p>
            <a
              href={waLink("Assalam o Alaikum ZH Films! I'm looking to buy camera gear. Please let me know when something is available.")}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-zh-gold px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-black"
            >
              <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
            </a>
          </div>
        ) : (
          <>
            {cats.length > 1 ? (
              <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="Categories">
                {["all", ...cats].map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={cat === c}
                    onClick={() => setCat(c)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors",
                      cat === c ? "border-zh-gold bg-zh-gold text-black" : "border-white/10 text-zinc-400 hover:text-white"
                    )}
                  >
                    {c === "all" ? "Everything" : (GEAR_CATEGORIES[c as GearCategory] ?? c)}
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="mt-10 grid gap-x-8 gap-y-14 md:grid-cols-2">
              {shown.map((g, i) => (
                <li key={g.id} className={cn("group", i % 2 === 1 && "md:mt-16")}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.image} alt={g.name} loading={i < 2 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    {g.status !== "available" ? (
                      <span className="absolute left-4 top-4 rounded-full bg-black/75 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-200">
                        {g.status === "unavailable" ? "Sold / on hold" : "Enquiry only"}
                      </span>
                    ) : null}
                    <FavoriteButton type="gear" id={g.id} title={g.name} size="sm" className="absolute right-3 top-3" />
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                        {[g.brand, GEAR_CATEGORIES[g.category as GearCategory]].filter(Boolean).join(" · ")}
                      </p>
                      <h2 className="mt-1 font-serif text-2xl text-white">{g.name}</h2>
                    </div>
                    <p className="font-display text-2xl font-bold text-zh-gold sm:text-right">{formatPrice(g.salePrice) ?? "Price on enquiry"}</p>
                  </div>
                  {g.description ? <p className="mt-3 text-sm leading-relaxed text-zinc-400">{g.description}</p> : null}
                  {g.condition || g.includes || g.priceLabel ? (
                    <dl className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
                      {g.condition ? <Spec label="Condition">{g.condition}</Spec> : null}
                      {g.includes ? <Spec label="Included">{g.includes}</Spec> : null}
                      {g.priceLabel ? <Spec label="Note">{g.priceLabel}</Spec> : null}
                    </dl>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={g.status === "unavailable"}
                      onClick={() => setActive(g)}
                      className="inline-flex h-11 items-center rounded-full bg-white px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-black transition hover:bg-zh-gold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      I&apos;m interested
                    </button>
                    <a
                      href={gearWhatsApp(g, "sell")}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-[11px] uppercase tracking-[0.2em] text-zinc-200 hover:border-zh-gold/50 hover:text-zh-gold"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <GearEnquiry item={active} mode="sell" onClose={() => setActive(null)} />
    </div>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-zinc-200">{children}</dd>
    </div>
  );
}
