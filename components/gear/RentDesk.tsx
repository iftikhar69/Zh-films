"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarRange, MessageCircle } from "lucide-react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { GearEnquiry, gearWhatsApp } from "@/components/gear/GearEnquiry";
import { GEAR_CATEGORIES, RENT_BACKDROP, RENT_UNITS, formatPrice, type GearCategory, type PublicGear } from "@/lib/gear";
import { waLink } from "@/lib/film-family";
import { cn } from "@/lib/utils";

const AVAILABILITY: Record<string, { label: string; dot: string }> = {
  available: { label: "Available to book", dot: "bg-emerald-400" },
  enquiry: { label: "Ask for dates", dot: "bg-sky-400" },
  unavailable: { label: "Out on a shoot", dot: "bg-amber-400" }
};

/** For rent: a rental desk — kit grouped by type, day rates up front, dates in the request. */
export function RentDesk({ items }: { items: PublicGear[] }) {
  const [active, setActive] = useState<PublicGear | null>(null);
  const groups = Object.keys(GEAR_CATEGORIES).filter((c) => items.some((i) => i.category === c));

  return (
    <div className="pb-24">
      <header className="relative isolate overflow-hidden">
        <Image src={RENT_BACKDROP} alt="Wedding couple filmed in the mountains of Hunza Gojal" fill priority sizes="100vw" className="-z-10 object-cover object-center opacity-50" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950/40 via-zinc-950/70 to-zinc-950" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-36 sm:px-6 sm:pt-48">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-sky-200/80">Rental desk · Gilgit-Baltistan & Lahore</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold uppercase leading-[0.88] text-white sm:text-7xl">Take our kit to your shoot</h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-300">
            Rent the same equipment we use on weddings in the mountains. Pick an item, tell us your dates, and we confirm availability
            and the rate.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {items.length === 0 ? (
          <div className="mt-6 grid gap-6 rounded-3xl border border-white/10 bg-zinc-950/70 p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-serif text-2xl text-white">Rental listings are being prepared</p>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                We haven&apos;t published rental kit yet. Message us with what you need and your dates — we&apos;ll tell you what we can
                offer.
              </p>
            </div>
            <a
              href={waLink("Assalam o Alaikum ZH Films! I'd like to rent equipment. Dates: … Gear needed: …")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sky-200 px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-black"
            >
              <MessageCircle className="h-4 w-4" /> Ask about rentals
            </a>
          </div>
        ) : (
          <div className="space-y-14">
            {groups.map((c) => (
              <section key={c} aria-labelledby={`rent-${c}`}>
                <h2 id={`rent-${c}`} className="mb-4 flex items-baseline gap-3 border-b border-white/10 pb-3 font-display text-2xl font-bold uppercase text-white">
                  {GEAR_CATEGORIES[c as GearCategory]}
                  <span className="font-mono text-xs font-normal text-zinc-500">{items.filter((i) => i.category === c).length}</span>
                </h2>
                <ul className="divide-y divide-white/5">
                  {items
                    .filter((i) => i.category === c)
                    .map((g) => {
                      const a = AVAILABILITY[g.status] ?? AVAILABILITY.enquiry;
                      return (
                        <li key={g.id} className="grid gap-4 py-5 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-900 sm:w-[120px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={g.imageThumb || g.image} alt={g.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            <FavoriteButton type="gear" id={g.id} title={g.name} size="sm" className="absolute right-1.5 top-1.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-[11px] text-zinc-400">
                              <span className={cn("h-2 w-2 rounded-full", a.dot)} aria-hidden /> {a.label}
                              {g.brand ? <span className="text-zinc-600">· {g.brand}</span> : null}
                            </p>
                            <h3 className="mt-1 text-lg text-white">{g.name}</h3>
                            {g.description ? <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{g.description}</p> : null}
                            {g.includes ? <p className="mt-1 text-xs text-zinc-500">Includes: {g.includes}</p> : null}
                            {g.priceLabel ? <p className="mt-1 text-xs text-zinc-500">{g.priceLabel}</p> : null}
                          </div>
                          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                            <p className="flex-1 font-mono text-lg text-sky-100 sm:flex-none">
                              {formatPrice(g.rentPrice) ? (
                                <>
                                  {formatPrice(g.rentPrice)} <span className="text-xs text-zinc-500">{RENT_UNITS[g.rentUnit as keyof typeof RENT_UNITS] ?? ""}</span>
                                </>
                              ) : (
                                <span className="text-sm text-zinc-400">Rate on request</span>
                              )}
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setActive(g)}
                                disabled={g.status === "unavailable"}
                                className="inline-flex h-10 items-center gap-2 rounded-full bg-sky-200 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-black disabled:opacity-40"
                              >
                                <CalendarRange className="h-4 w-4" /> Dates
                              </button>
                              <a
                                href={gearWhatsApp(g, "rent")}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Ask about ${g.name} on WhatsApp`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-200 hover:border-sky-200/60"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      <GearEnquiry item={active} mode="rent" onClose={() => setActive(null)} />
    </div>
  );
}
