import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, MessageCircle } from "lucide-react";
import type { PublicCatalog } from "@/lib/catalog-shared";
import { waLink } from "@/lib/film-family";
import { enquiryWhatsAppText, formatPkr } from "@/lib/enquiry";

export function PackageCards({ packages, headingLevel = "h3" }: { packages: PublicCatalog["packages"]; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  if (!packages.length) {
    return (
      <p className="rounded-2xl border border-white/10 p-6 text-sm text-zinc-400">
        Wedding packages are being updated. <Link href="/book/event" className="text-zh-gold">Request a custom quote</Link> instead.
      </p>
    );
  }
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {packages.map((p, i) => (
        <li
          key={p.id}
          className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:border-zh-gold/50 hover:shadow-[0_24px_70px_-20px_rgba(200,169,106,0.35)]"
        >
          <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[4/4.4]">
            <Image
              src={p.image}
              alt={`${p.name} — ZH Films wedding coverage`}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              loading="lazy"
              className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-200">
              {String(i + 1).padStart(2, "0")} · Package
            </span>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <Heading className="font-display text-2xl font-bold uppercase leading-[0.95] text-white sm:text-[1.65rem]">{p.name}</Heading>
              <p className="mt-2 text-xs text-zinc-300">{p.tagline}</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4 p-5 pt-3">
            <p className="font-display text-3xl font-bold text-zh-gold">
              {formatPkr(p.price)}
            </p>
            {p.inclusions.length ? (
              <ul className="space-y-1.5 text-sm text-zinc-300">
                {p.inclusions.slice(0, 6).map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-zh-gold" /> {x}
                  </li>
                ))}
                {p.inclusions.length > 6 ? <li className="pl-6 text-xs text-zinc-500">+ {p.inclusions.length - 6} more</li> : null}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400">
                {p.description || "Inclusions are being finalised — ask us what this package covers for your functions."}
              </p>
            )}
            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Link
                href={`/book/wedding?package=${p.id}`}
                className="inline-flex h-11 items-center justify-between rounded-full bg-zh-gold px-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-black transition-colors hover:bg-[#d8bb7e]"
              >
                Select package <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a
                href={waLink(enquiryWhatsAppText({ packageName: p.name, packagePrice: p.price, customDeal: true }))}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-[11px] uppercase tracking-[0.22em] text-zinc-200 transition hover:border-zh-gold/50 hover:text-zh-gold"
              >
                <MessageCircle className="h-4 w-4" /> Discuss on WhatsApp
              </a>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PackagesFinePrint() {
  return (
    <p className="mt-6 max-w-3xl text-xs leading-relaxed text-zinc-500">
      Prices are the advertised package rates. Extra costs or negotiated discounts apply only after ZH Films approves a
      final quote. Opening WhatsApp doesn&apos;t book or reserve a date — every booking is confirmed by ZH Films.
    </p>
  );
}
