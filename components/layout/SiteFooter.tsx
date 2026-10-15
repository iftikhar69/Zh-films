"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Facebook, Instagram, Mail, MessageCircle, Phone } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { FILM_FAMILY, waLink } from "@/lib/film-family";
import { Marquee } from "@/components/motion/Marquee";
import { Magnetic } from "@/components/motion/Magnetic";
import { scrollToTarget } from "@/components/motion/SmoothScroll";

const columns = [
  {
    title: "Watch",
    links: [
      { href: "/reels", label: "Reel Vault" },
      { href: "/gallery", label: "Gallery" },
      { href: "/instagram", label: "Dailies" },
      { href: "/favorites", label: "Your favorites" }
    ]
  },
  {
    title: "Work with us",
    links: [
      { href: "/book/wedding", label: "Wedding packages" },
      { href: "/book/event", label: "Book an event" },
      { href: "/hire", label: "Hire the family" },
      { href: "/rent", label: "Rent gear" },
      { href: "/sell", label: "Vault sale" }
    ]
  },
  {
    title: "Studio",
    links: [
      { href: "/about", label: "About Zulfikar" },
      { href: "/journal", label: "Film notes" },
      { href: "/account", label: "Call sheet" }
    ]
  }
];

function displayPhone(intl: string) {
  return intl.startsWith("92") && intl.length === 12 ? `+92 ${intl.slice(2, 5)} ${intl.slice(5)}` : `+${intl}`;
}

export function SiteFooter() {
  const socials = [
    FILM_FAMILY.instagram ? { href: FILM_FAMILY.instagram, icon: Instagram, label: "Instagram" } : null,
    FILM_FAMILY.facebook ? { href: FILM_FAMILY.facebook, icon: Facebook, label: "Facebook" } : null,
    FILM_FAMILY.email ? { href: `mailto:${FILM_FAMILY.email}`, icon: Mail, label: "Email" } : null
  ].filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-black">
      <Image
        src="/media/instagram/C0HH-nXIP6k-1.jpg"
        alt=""
        fill
        sizes="100vw"
        loading="lazy"
        className="pointer-events-none object-cover object-[50%_30%] opacity-[0.18] grayscale"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />

      <div className="border-b border-white/5 py-6">
        <Marquee seconds={36}>
          {["Weddings", "AKU Events", "Pre-Events", "Brand Films", "Drone Cinema", "Mehndi", "Walima", "Commercials"].map(
            (w) => (
              <span key={w} className="flex items-center gap-8 pr-8 font-display text-4xl font-bold uppercase text-white/10 sm:text-6xl">
                {w}
                <span className="h-3 w-3 rounded-full bg-zh-gold/40" />
              </span>
            )
          )}
        </Marquee>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.45em] text-zh-gold/80">Next scene</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[0.95] text-white sm:text-6xl">
              Let&apos;s make your
              <br />
              <span className="zh-text-shimmer">story a film.</span>
            </h2>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Magnetic>
                <Link
                  href="/book"
                  data-cursor="Book"
                  className="group inline-flex h-14 items-center gap-3 rounded-full bg-zh-gold px-7 text-sm font-semibold uppercase tracking-[0.2em] text-black"
                >
                  Book your date
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                </Link>
              </Magnetic>
              <a
                href={waLink("Hi ZH Films! I'd like to talk about a project.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-14 items-center gap-2 rounded-full border border-white/15 px-6 text-xs uppercase tracking-[0.22em] text-zinc-300 transition hover:border-zh-gold/50 hover:text-zh-gold"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
            <address className="mt-8 space-y-2 text-sm not-italic text-zinc-400">
              {FILM_FAMILY.whatsapp ? (
                <a href={`tel:+${FILM_FAMILY.whatsapp}`} className="flex items-center gap-2 hover:text-zh-gold">
                  <Phone className="h-4 w-4 text-zh-gold/70" /> {displayPhone(FILM_FAMILY.whatsapp)} · WhatsApp &amp; calls
                </a>
              ) : null}
              {FILM_FAMILY.email ? (
                <a href={`mailto:${FILM_FAMILY.email}`} className="flex items-center gap-2 hover:text-zh-gold">
                  <Mail className="h-4 w-4 text-zh-gold/70" /> {FILM_FAMILY.email}
                </a>
              ) : null}
              <p>{BRAND.location}</p>
            </address>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((c) => (
              <div key={c.title}>
                <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">{c.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="group inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-zh-gold">
                        <span className="relative">
                          {l.label}
                          <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-zh-gold transition-transform duration-300 group-hover:scale-x-100" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-white/5 pt-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-display font-semibold tracking-[0.25em] text-zinc-200">{BRAND.name}</span>
            <span className="ml-3 uppercase tracking-[0.25em]">Directed by {FILM_FAMILY.ceo} · {BRAND.location}</span>
          </div>
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:-translate-y-0.5 hover:border-zh-gold/50 hover:text-zh-gold"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
            <button
              type="button"
              onClick={() => scrollToTarget(0)}
              className="ml-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-zinc-400 hover:text-zh-gold"
            >
              Back to top ↑
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
