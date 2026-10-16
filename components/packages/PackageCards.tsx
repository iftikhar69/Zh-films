import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import type { PublicCatalog } from "@/lib/catalog-shared";
import { waLink } from "@/lib/film-family";
import { enquiryWhatsAppText, formatPkr } from "@/lib/enquiry";
import { NeedHelp } from "@/components/packages/NeedHelp";

export function PackageCards({
  packages,
  headingLevel = "h3",
}: {
  packages: PublicCatalog["packages"];
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const custom = packages.find((p) => p.custom);
  const fixed = packages.filter((p) => !p.custom);
  if (!packages.length) {
    return (
      <p className="rounded-2xl border border-white/10 p-6 text-sm text-zinc-400">
        Wedding packages are being updated.{" "}
        <Link href="/book/event" className="text-zh-gold">
          Request a custom quote
        </Link>{" "}
        instead.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      <ul className="grid gap-5 md:grid-cols-3">
        {fixed.map((p, i) => (
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
              {p.listPrice != null ? (
                <span className="absolute right-4 top-4 rounded-full bg-zh-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black">
                  {p.saleLabel || "Discount"}
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <Heading className="font-display text-2xl font-bold uppercase leading-[0.95] text-white sm:text-[1.65rem]">
                  {p.name}
                </Heading>
                <p className="mt-2 text-xs text-zinc-300">{p.tagline}</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5 pt-3">
              <div>
                <p className="flex flex-wrap items-baseline gap-x-3 font-display text-3xl font-bold text-zh-gold">
                  {formatPkr(p.price)}
                  {p.listPrice != null ? (
                    <s
                      className="text-base font-normal text-zinc-500"
                      aria-label={`Regular price ${formatPkr(p.listPrice)}`}
                    >
                      {formatPkr(p.listPrice)}
                    </s>
                  ) : null}
                </p>
                {p.listPrice != null ? (
                  <p className="mt-1 text-xs text-zinc-400">
                    You save {formatPkr(p.listPrice - p.price)}
                    {p.saleEndsOn
                      ? ` · offer valid until ${new Date(`${p.saleEndsOn}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}`
                      : ""}
                  </p>
                ) : null}
              </div>
              {p.inclusions.length ? (
                <ul className="space-y-1.5 text-sm text-zinc-300">
                  {p.inclusions.slice(0, 6).map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-zh-gold" />{" "}
                      {x}
                    </li>
                  ))}
                  {p.inclusions.length > 6 ? (
                    <li className="pl-6 text-xs text-zinc-500">
                      + {p.inclusions.length - 6} more
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400">
                  {p.description ||
                    "Inclusions are being finalised — ask us what this package covers for your functions."}
                </p>
              )}
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <Link
                  href={`/book/wedding?package=${p.id}`}
                  className="inline-flex h-11 items-center justify-between rounded-full bg-zh-gold px-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-black transition-colors hover:bg-[#d8bb7e]"
                >
                  Select package{" "}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <a
                  href={waLink(
                    enquiryWhatsAppText({
                      packageName: p.name,
                      packagePrice: p.price,
                      customDeal: true,
                    }),
                  )}
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
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {custom ? (
          <div className="group relative flex min-h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
            <Image
              src={custom.image}
              alt="Cinema camera on set"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              loading="lazy"
              className="object-cover opacity-60 transition-transform duration-[1.2s] group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/20" />
            <div className="relative flex max-w-md flex-col justify-end gap-4 p-6 sm:p-8">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-200">
                <SlidersHorizontal className="h-3 w-3" /> Build your own
              </span>
              <Heading className="font-display text-3xl font-bold uppercase leading-[0.95] text-white">
                {custom.name}
              </Heading>
              <p className="text-sm text-zinc-300">
                {custom.description || custom.tagline}
              </p>
              <p className="text-sm text-zh-gold">
                {custom.price > 0
                  ? `From ${formatPkr(custom.price)} + your add-ons`
                  : "Price based on what you choose — final quote from ZH Films"}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/book/wedding?package=${custom.id}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-zh-gold px-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-black transition-colors hover:bg-[#d8bb7e]"
                >
                  Build my package <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a
                  href={waLink(
                    enquiryWhatsAppText({
                      packageName: custom.name,
                      customDeal: true,
                    }),
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-[11px] uppercase tracking-[0.22em] text-zinc-100 transition hover:border-zh-gold/50 hover:text-zh-gold"
                >
                  <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
                </a>
              </div>
            </div>
          </div>
        ) : null}
        <NeedHelp
          context="wedding packages"
          className={custom ? "" : "lg:col-span-2"}
        />
      </div>
    </div>
  );
}

export function PackagesFinePrint() {
  return (
    <p className="mt-6 max-w-3xl text-xs leading-relaxed text-zinc-500">
      Prices are the advertised package rates. Extra costs or negotiated
      discounts apply only after ZH Films approves a final quote. Opening
      WhatsApp doesn&apos;t book or reserve a date — every booking is confirmed
      by ZH Films.
    </p>
  );
}
