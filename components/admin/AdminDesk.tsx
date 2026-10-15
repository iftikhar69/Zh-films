"use client";

import Link from "next/link";
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
  paymentStatus: string;
  serviceType: string;
  startTime: string | null;
  endTime: string | null;
  holdExpiresAt: string | null;
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
  const [tab, setTab] = useState<"hires" | "rentals" | "sells">("hires");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch; load() only sets state after the network round-trip
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
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 text-sm text-zinc-400">Loading production board…</div>
    );
  }

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Enquiries</p>
          <h1 className="mt-3 font-serif text-3xl text-white">Crew, rental &amp; sell leads</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Booking requests live under Bookings.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
      </header>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
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
        {(["hires", "rentals", "sells"] as const).map((t) => (
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
