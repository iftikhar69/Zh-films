"use client";

import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowRight, CalendarHeart, Heart, Images, LayoutDashboard, Plus } from "lucide-react";
import { useMe } from "@/components/auth/use-me";
import { useFavoriteCount } from "@/stores/favorites-store";
import { bookingStatusLabel } from "@/lib/booking-status";

const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function daysUntil(d: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  return Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function CustomerWelcomeInner() {
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const me = useMe(isSignedIn ? userId : null);
  const saved = useFavoriteCount();
  if (!isSignedIn) return null;

  const name = me?.firstName ?? user?.firstName ?? null;
  const next = me?.next ?? null;
  const days = next ? daysUntil(next.eventDate) : null;

  return (
    <section aria-label="Your ZH Films desk" data-testid="customer-desk" className="relative z-10 border-y border-zh-gold/15 bg-gradient-to-b from-zinc-950 to-black">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_1.4fr] lg:items-center lg:py-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-zh-gold/80">Your desk</p>
          <h2 className="mt-2 font-serif text-3xl text-white sm:text-4xl">{name ? `Welcome back, ${name}` : "Welcome back"}</h2>
          {me?.emailVerified === false ? (
            <p className="mt-2 text-sm text-amber-200/90">Verify your email in account settings so we can match your bookings and galleries.</p>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">Your bookings, galleries and saved films — all in one place.</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
          {next ? (
            <Link
              href={`/booking/${next.confirmationCode}`}
              className="group rounded-2xl border border-zh-gold/30 bg-zh-gold/[0.06] p-5 transition hover:border-zh-gold/60"
            >
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zh-gold">
                <CalendarHeart className="h-3.5 w-3.5" /> Next on your calendar
              </p>
              <p className="mt-2 font-serif text-xl text-white">{next.packageName ?? "Your booking"}</p>
              <p className="mt-1 text-sm text-zinc-300">{longDate(next.eventDate)}</p>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-zh-gold/40 px-2.5 py-0.5 uppercase tracking-[0.15em] text-zh-gold">
                  {bookingStatusLabel(next.status)}
                </span>
                {days != null && days >= 0 ? <span className="text-zinc-400">{days === 0 ? "Today" : `in ${days} day${days === 1 ? "" : "s"}`}</span> : null}
                <span className="ml-auto inline-flex items-center gap-1 text-zh-gold transition group-hover:translate-x-0.5">
                  Status &amp; payment <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </p>
            </Link>
          ) : (
            <Link href="/book" className="group rounded-2xl border border-dashed border-white/15 p-5 transition hover:border-zh-gold/50">
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zinc-400">
                <Plus className="h-3.5 w-3.5" /> No upcoming booking
              </p>
              <p className="mt-2 font-serif text-xl text-white">Plan your wedding film</p>
              <p className="mt-1 text-sm text-zinc-400">Pick a package and your functions — we confirm every date with you.</p>
            </Link>
          )}

          <nav aria-label="Your account" className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            <DeskLink href="/account#bookings" icon={<CalendarHeart className="h-4 w-4" />} label="My bookings" count={me?.bookings} />
            <DeskLink href="/galleries" icon={<Images className="h-4 w-4" />} label="Family galleries" count={me?.galleries} highlight={(me?.galleries ?? 0) > 0} />
            <DeskLink href="/favorites" icon={<Heart className="h-4 w-4" />} label="Saved" count={saved} />
            {me?.isAdmin ? <DeskLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Admin dashboard" /> : null}
          </nav>
        </div>
      </div>
    </section>
  );
}

function DeskLink({ href, icon, label, count, highlight }: { href: string; icon: React.ReactNode; label: string; count?: number; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200 transition hover:border-zh-gold/40 hover:text-white"
    >
      <span className={highlight ? "text-zh-gold" : "text-zinc-400"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {count != null ? <span className={`font-mono text-xs ${highlight ? "text-zh-gold" : "text-zinc-500"}`}>{count}</span> : null}
    </Link>
  );
}
