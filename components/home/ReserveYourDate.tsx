import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { SERVICES, SERVICE_TYPES } from "@/lib/booking-rules";

/**
 * `confirmedDates` comes straight from the booking table (confirmed, in production or delivered
 * in the next 90 days). It is only shown when there is something true to say.
 */
export function ReserveYourDate({ confirmedDates }: { confirmedDates: number }) {
  return (
    <section aria-labelledby="reserve-heading" className="relative overflow-hidden border-t border-white/5 py-24 sm:py-32">
      <Image
        src="/media/instagram/C0HH-nXIP6k-1.jpg"
        alt=""
        fill
        sizes="100vw"
        loading="lazy"
        className="pointer-events-none object-cover opacity-[0.12] grayscale"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
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
          </Reveal>
        </div>

        <Reveal delay={0.45} className="relative">
          <div className="rounded-3xl border border-zh-gold/25 bg-black/70 p-6 shadow-[0_0_60px_rgba(200,169,106,0.08)] sm:p-8">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              <span>Call sheet · Request</span>
              <CalendarClock className="h-4 w-4 text-zh-gold/70" aria-hidden />
            </div>
            <ul className="mt-5 flex flex-wrap gap-2">
              {SERVICE_TYPES.map((t) => (
                <li key={t}>
                  <Link
                    href={`/book?service=${t}`}
                    className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 transition-colors hover:border-zh-gold/50 hover:text-zh-gold"
                  >
                    {SERVICES[t].label.split(" (")[0]}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/book"
              className="group mt-7 flex items-center justify-between rounded-full bg-zh-gold px-6 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-black transition-colors hover:bg-[#d8bb7e]"
            >
              Reserve your date
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-zinc-400">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
              Limited availability on popular dates · Booking is subject to confirmation
            </p>
            {confirmedDates > 0 ? (
              <p className="mt-2 pl-3.5 text-[11px] text-zinc-500">
                {confirmedDates} {confirmedDates === 1 ? "date is" : "dates are"} already confirmed in the next 90 days.
              </p>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
