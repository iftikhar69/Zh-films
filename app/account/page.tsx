"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useFavoriteCount } from "@/stores/favorites-store";
import { bookingStatusLabel, paymentStatusLabel } from "@/lib/booking-status";
import { SERVICES } from "@/lib/booking-rules";

function FavoritesShortcut() {
  const count = useFavoriteCount();
  return (
    <Link
      href="/favorites"
      className="mt-8 flex items-center justify-between rounded-2xl border border-rose-400/20 bg-rose-500/5 p-5 transition hover:border-rose-400/40"
    >
      <span className="flex items-center gap-3">
        <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
        <span>
          <span className="block font-serif text-lg text-white">Your favorites</span>
          <span className="block text-xs text-zinc-400">{count} saved reels, frames, crew and gear</span>
        </span>
      </span>
      <span className="text-xs uppercase tracking-[0.25em] text-rose-300">Open →</span>
    </Link>
  );
}

type Payload = {
  ok: boolean;
  error?: string;
  bookings?: Array<{
    confirmationCode: string;
    names: string;
    eventDate: string;
    city: string;
    coverage: string;
    deliverables: string;
    status: string;
    paymentStatus: string;
    updatedAt: string;
    serviceType: string;
    startTime: string | null;
    endTime: string | null;
    holdExpiresAt: string | null;
  }>;
  hires?: Array<{ crewName: string; eventDate: string; status: string }>;
  rentals?: Array<{ gearName: string; startDate: string; status: string }>;
  sells?: Array<{ gearName: string; status: string }>;
};

export default function AccountPage() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ ok: false, error: "Could not load call sheet" }));
  }, []);

  if (!data) {
    return <div className="px-4 pt-32 text-sm text-zinc-400">Loading your call sheet…</div>;
  }

  if (!data.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-32">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Public account</p>
        <h1 className="mt-3 font-serif text-3xl text-white">Sign in to see your board</h1>
        <p className="mt-3 text-sm text-zinc-400">{data.error}</p>
        <Button className="mt-6" asChild>
          <Link href="/sign-in?redirect_url=%2Faccount">Sign in</Link>
        </Button>
        <FavoritesShortcut />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Your call sheet</p>
      <h1 className="mt-3 font-serif text-3xl text-white">Public desk</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Bookings, hires, and gear requests attached to this Clerk account. Production Office is admin-only.
      </p>

      <FavoritesShortcut />

      <section className="mt-10 space-y-3">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Bookings</h2>
        {(data.bookings ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">
            No bookings yet. Bookings made with your verified email appear here automatically.{" "}
            <Link href="/book" className="text-zh-gold">
              Book a date →
            </Link>
          </p>
        ) : (
          data.bookings?.map((b) => (
            <article key={b.confirmationCode} className="zh-callsheet rounded-xl border border-white/10 p-4">
              <p className="font-mono text-xs text-zh-gold">{b.confirmationCode}</p>
              <p className="font-serif text-lg text-white">{b.names}</p>
              <p className="text-sm text-zinc-400">
                {SERVICES[b.serviceType as keyof typeof SERVICES]?.label ?? b.serviceType} · {b.eventDate}
                {b.startTime && b.endTime ? ` · ${b.startTime}–${b.endTime} PKT` : ""} · {b.city}
              </p>
              {b.status === "pending" ? (
                <p className="mt-1 text-xs text-zinc-400">
                  {b.holdExpiresAt && new Date(b.holdExpiresAt) > new Date()
                    ? `Your time is held until ${new Date(b.holdExpiresAt).toLocaleString()} while we review it.`
                    : "Pending review — this date is not reserved until we confirm it with you."}
                </p>
              ) : null}
              <Link href={`/booking/${b.confirmationCode}`} className="mt-1 inline-block text-xs text-zh-gold">
                View status &amp; payment details →
              </Link>
              <p className="mt-1 text-xs text-zinc-500">
                {b.coverage} · {b.deliverables}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em]">
                <span className="rounded-full border border-zh-gold/30 px-3 py-1 text-zh-gold">
                  {bookingStatusLabel(b.status)}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">
                  {paymentStatusLabel(b.paymentStatus)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-600">
                Updated {new Date(b.updatedAt).toLocaleDateString()}
              </p>
            </article>
          ))
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Hires</h2>
        {(data.hires ?? []).map((h) => (
          <p key={`${h.crewName}-${h.eventDate}`} className="text-sm text-zinc-300">
            {h.crewName} · {h.eventDate} · {h.status}
          </p>
        ))}
      </section>
    </div>
  );
}
