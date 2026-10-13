"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Booking = {
  id: string;
  confirmationCode: string;
  names: string;
  city: string;
  eventDate: string;
  email: string;
  phone: string;
  coverage: string;
  status: string;
};

type Overview = {
  ok: boolean;
  error?: string;
  bookings: Booking[];
  bookingsByDate: Record<string, Booking[]>;
  hires: Array<{ id: string; crewName: string; eventDate: string; clientName: string; email: string; phone: string; brief: string; status: string }>;
  rentals: Array<{ id: string; gearName: string; category: string; startDate: string; clientName: string; email: string; phone: string; status: string }>;
  sells: Array<{ id: string; gearName: string; category: string; clientName: string; email: string; phone: string; status: string }>;
  counts: { bookings: number; hires: number; rentals: number; sells: number };
};

export function AdminDesk() {
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<"bookings" | "hires" | "rentals" | "sells">("bookings");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/overview");
    const json = (await res.json()) as Overview;
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Unauthorized");
      setData(null);
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void load();
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-28">
        <h1 className="font-serif text-3xl text-white">Production Office</h1>
        <p className="mt-4 text-sm text-red-400">{error}</p>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in with a Clerk account whose email is in ADMIN_EMAILS, or set publicMetadata.role = &quot;admin&quot;.
        </p>
        <Button className="mt-6" asChild>
          <a href="/sign-in">Sign in</a>
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 text-sm text-zinc-400">Loading production board…</div>
    );
  }

  const dates = Object.keys(data.bookingsByDate).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Admin · Production office</p>
          <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Call Sheet Board</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Same-day clients stay separate. Bookings never block the calendar for others.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Bookings", data.counts.bookings],
          ["Hires", data.counts.hires],
          ["Rentals", data.counts.rentals],
          ["Sell leads", data.counts.sells]
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{label}</p>
            <p className="mt-2 font-serif text-3xl text-zh-gold">{n as number}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(["bookings", "hires", "rentals", "sells"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.22em] ${
              tab === t ? "border-zh-gold/70 bg-zh-gold text-black" : "border-white/10 text-zinc-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {tab === "bookings" &&
          dates.map((date) => (
            <section key={date} className="rounded-2xl border border-white/10 bg-zinc-950/40 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-mono text-sm text-zh-gold">{date}</h2>
                <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  {data.bookingsByDate[date].length} client(s) · day still open
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {data.bookingsByDate[date].map((b) => (
                  <article key={b.id} className="rounded-xl border border-zh-gold/20 bg-black/40 p-4">
                    <p className="font-mono text-[10px] text-zh-gold">{b.confirmationCode}</p>
                    <p className="mt-1 font-serif text-lg text-white">{b.names}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {b.city} · {b.coverage}
                    </p>
                    <p className="mt-2 text-xs text-zinc-300">
                      {b.email} · {b.phone}
                    </p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">{b.status}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}

        {tab === "hires" &&
          data.hires.map((h) => (
            <article key={h.id} className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
              <p className="font-serif text-lg text-white">{h.crewName}</p>
              <p className="text-sm text-zinc-400">
                {h.clientName} · {h.eventDate}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{h.brief}</p>
              <p className="mt-2 text-xs text-zinc-300">
                {h.email} · {h.phone}
              </p>
            </article>
          ))}

        {tab === "rentals" &&
          data.rentals.map((r) => (
            <article key={r.id} className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
              <p className="font-serif text-lg text-white">{r.gearName}</p>
              <p className="text-sm text-zinc-400">
                {r.category} · {r.startDate} · {r.clientName}
              </p>
              <p className="mt-2 text-xs text-zinc-300">
                {r.email} · {r.phone}
              </p>
            </article>
          ))}

        {tab === "sells" &&
          data.sells.map((s) => (
            <article key={s.id} className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
              <p className="font-serif text-lg text-white">{s.gearName}</p>
              <p className="text-sm text-zinc-400">
                {s.category} · {s.clientName}
              </p>
              <p className="mt-2 text-xs text-zinc-300">
                {s.email} · {s.phone}
              </p>
            </article>
          ))}
      </div>
    </div>
  );
}
