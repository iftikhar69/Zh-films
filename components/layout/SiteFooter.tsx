import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { FILM_FAMILY } from "@/lib/film-family";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-black py-10 text-xs text-zinc-500">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <div className="text-sm font-semibold tracking-[0.25em] text-zinc-200">{BRAND.name}</div>
          <div className="mt-1 uppercase tracking-[0.28em]">Film Family · Lahore</div>
          <p className="mt-3 max-w-xs text-[11px] leading-relaxed normal-case tracking-normal text-zinc-500">
            Directed by {FILM_FAMILY.ceo}. Hire the house, rent the glass, book the day.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 uppercase tracking-[0.22em]">
          <Link href="/instagram" className="hover:text-zh-gold">Dailies</Link>
          <Link href="/hire" className="hover:text-zh-gold">Family</Link>
          <Link href="/rent" className="hover:text-zh-gold">Rent</Link>
          <Link href="/sell" className="hover:text-zh-gold">Sell</Link>
          <Link href="/book" className="hover:text-zh-gold">Book</Link>
          <Link href="/account" className="hover:text-zh-gold">Call sheet</Link>
        </div>
      </div>
    </footer>
  );
}
