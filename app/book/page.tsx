import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { getCatalog, publicCatalog } from "@/lib/catalog";
import { EVENT_TYPES, EVENT_TYPE_KEYS } from "@/lib/enquiry";
import { PackageCards, PackagesFinePrint } from "@/components/packages/PackageCards";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Book Your Film",
  description: "Choose a ZH Films wedding package or book an event in advance — Nikah, engagement, birthday, corporate or a custom cinematic shoot.",
  path: "/book"
});

/** Older links used /book?service=…; send them to the matching new flow. */
const LEGACY: Record<string, string> = {
  wedding: "/book/wedding",
  nikah: "/book/event?type=nikah",
  event: "/book/event?type=other",
  shoot: "/book/event?type=shoot",
  photography: "/book/event?type=shoot",
  videography: "/book/event?type=shoot"
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string; references?: string }> }) {
  const { service, references } = await searchParams;
  const refs = references ? `references=${encodeURIComponent(references.slice(0, 500))}` : "";
  if (service && LEGACY[service]) {
    const target = LEGACY[service];
    redirect(refs ? `${target}${target.includes("?") ? "&" : "?"}${refs}` : target);
  }
  const { packages } = publicCatalog(await getCatalog());

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Book", path: "/book" }])} />
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Booking suite</p>
          <h1 className="mt-3 font-serif text-3xl text-white sm:text-5xl">Book your film</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Pick a wedding package, or book a single event in advance. Every request is reviewed by ZH Films — all dates
            are subject to confirmation.
          </p>
        </header>

        <section aria-labelledby="pkg-heading" className="mt-10">
          <h2 id="pkg-heading" className="mb-5 text-[11px] uppercase tracking-[0.3em] text-zinc-400">
            Wedding packages
          </h2>
          <PackageCards packages={packages} />
          <PackagesFinePrint />
        </section>

        <section aria-labelledby="event-heading" className="mt-14">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <Image src="/media/cinema-camera.jpg" alt="" fill sizes="100vw" className="object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
            <div className="relative grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-zh-gold/80">
                  <CalendarClock className="h-4 w-4" /> No full package needed
                </p>
                <h2 id="event-heading" className="mt-3 font-display text-3xl font-bold uppercase leading-[0.95] text-white sm:text-5xl">
                  Book an event in advance
                </h2>
                <p className="mt-3 max-w-lg text-sm text-zinc-300">
                  Share the date, time and location. We check our calendar and send you a quote — or talk it through on
                  WhatsApp.
                </p>
                <Link
                  href={`/book/event${refs ? `?${refs}` : ""}`}
                  className="mt-6 inline-flex h-12 items-center gap-3 rounded-full bg-zh-gold px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-black hover:bg-[#d8bb7e]"
                >
                  Request a quote <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <ul className="flex flex-wrap gap-2">
                {EVENT_TYPE_KEYS.map((t) => (
                  <li key={t}>
                    <Link
                      href={`/book/event?type=${t}${refs ? `&${refs}` : ""}`}
                      className="inline-flex rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs text-zinc-200 transition hover:border-zh-gold/50 hover:text-zh-gold"
                    >
                      {EVENT_TYPES[t].label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
