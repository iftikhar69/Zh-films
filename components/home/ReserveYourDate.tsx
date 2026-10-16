import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

/**
 * `confirmedDates` comes straight from the booking table (confirmed or completed in the next
 * 90 days). It is only shown when there is something true to say.
 */
export function ReserveYourDate({ confirmedDates }: { confirmedDates: number }) {
  return (
    <section aria-labelledby="reserve-heading" className="relative isolate overflow-hidden border-t border-white/5 bg-black">
      <Image
        src="/media/instagram/C0HH-nXIP6k-1.jpg"
        alt="A bride and groom stand together in front of snow-capped mountains"
        fill
        sizes="100vw"
        className="-z-10 object-cover object-[50%_38%]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/60 to-black/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      <div className="mx-auto flex min-h-[32rem] max-w-7xl items-center px-4 py-20 sm:min-h-[36rem] sm:px-6 sm:py-28">
        <Reveal className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.4em] text-zh-gold">Bookings</p>
          <h2 id="reserve-heading" className="mt-4 font-serif text-4xl leading-tight text-white sm:text-6xl">
            Your date. Your story.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-zinc-200">
            Tell us the date and what you&apos;re planning. We&apos;ll check the calendar and come back to you with an
            honest answer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/book/wedding"
              className="group inline-flex h-12 items-center gap-3 rounded-full bg-zh-gold px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-black transition-colors hover:bg-[#d8bb7e]"
            >
              Check your date
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/book/event"
              className="inline-flex h-12 items-center rounded-full border border-white/30 bg-black/30 px-6 text-[11px] uppercase tracking-[0.22em] text-white backdrop-blur-sm transition hover:border-zh-gold/60 hover:text-zh-gold"
            >
              Other events
            </Link>
          </div>
          {confirmedDates > 0 ? (
            <p className="mt-6 text-xs text-zinc-300">
              {confirmedDates} {confirmedDates === 1 ? "date is" : "dates are"} already confirmed in the next 90 days.
            </p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
