import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { EVENT_TYPES, EVENT_TYPE_KEYS } from "@/lib/enquiry";

/**
 * `confirmedDates` comes straight from the booking table (confirmed or completed in the next
 * 90 days). It is only shown when there is something true to say.
 */
export function ReserveYourDate({ confirmedDates }: { confirmedDates: number }) {
  return (
    <section aria-labelledby="reserve-heading" className="relative overflow-hidden border-t border-white/5 bg-black py-24 sm:py-32">
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div>
          <p className="flex items-center gap-3 text-xs uppercase tracking-[0.45em] text-zh-gold/80">
            <span className="h-px w-10 bg-zh-gold/60" />
            Advance bookings
          </p>
          <h2
            id="reserve-heading"
            className="mt-5 font-display text-[clamp(2.6rem,7vw,6.5rem)] font-bold uppercase leading-[0.9] text-white"
          >
            <SplitText text="Your Date." inView />
            <br />
            <span className="zh-text-outline">
              <SplitText text="Your Story." inView delay={0.25} />
            </span>
          </h2>
          <Reveal delay={0.5} y={24}>
            <p className="zh-text-shimmer mt-3 font-display text-[clamp(1.9rem,4.6vw,4.25rem)] font-bold uppercase leading-[0.95]">
              Book It Before It&apos;s Gone.
            </p>
          </Reveal>
          <Reveal delay={0.35}>
            <p className="mt-8 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              Weddings, Nikah ceremonies, events and cinematic shoots deserve the right team and the right date. Reserve
              your date in advance to help us plan your moments without last-minute stress.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/book/wedding"
                className="group inline-flex h-12 items-center gap-3 rounded-full bg-zh-gold px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-black transition-colors hover:bg-[#d8bb7e]"
              >
                Wedding packages
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/book/event"
                className="inline-flex h-12 items-center rounded-full border border-white/15 px-6 text-[11px] uppercase tracking-[0.22em] text-zinc-200 transition hover:border-zh-gold/50 hover:text-zh-gold"
              >
                Book an event in advance
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2">
              {EVENT_TYPE_KEYS.map((t) => (
                <li key={t}>
                  <Link
                    href={`/book/event?type=${t}`}
                    className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-zh-gold/50 hover:text-zh-gold"
                  >
                    {EVENT_TYPES[t].label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[11px] leading-relaxed text-zinc-500">
              Every booking is subject to confirmation by ZH Films.
              {confirmedDates > 0
                ? ` ${confirmedDates} ${confirmedDates === 1 ? "date is" : "dates are"} already confirmed in the next 90 days.`
                : ""}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="relative">
          <figure className="group relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
            <Image
              src="/media/cinema-camera.jpg"
              alt="Cinema camera rig with matte box and follow focus, ready on set"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              loading="lazy"
              className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-[1.04]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            <div aria-hidden className="pointer-events-none absolute inset-4 sm:inset-6">
              <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-zh-gold/70" />
              <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-zh-gold/70" />
              <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-zh-gold/70" />
              <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-zh-gold/70" />
              <span className="absolute left-3 top-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/80">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Rec
              </span>
              <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2">
                <span className="absolute left-1/2 top-0 h-full w-px bg-white/30" />
                <span className="absolute left-0 top-1/2 h-px w-full bg-white/30" />
              </span>
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 p-5 text-xs uppercase tracking-[0.3em] text-zinc-300 sm:p-7">
              Lights. Camera. Your story.
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
