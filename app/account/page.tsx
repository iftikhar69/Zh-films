"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Payload = {
  ok: boolean;
  error?: string;
  bookings?: Array<{
    confirmationCode: string;
    names: string;
    eventDate: string;
    city: string;
    status: string;
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
          <Link href="/sign-in">Sign in</Link>
        </Button>
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

      <section className="mt-10 space-y-3">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Bookings</h2>
        {(data.bookings ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No date locks yet.</p>
        ) : (
          data.bookings?.map((b) => (
            <article key={b.confirmationCode} className="zh-callsheet rounded-xl border border-white/10 p-4">
              <p className="font-mono text-xs text-zh-gold">{b.confirmationCode}</p>
              <p className="font-serif text-lg text-white">{b.names}</p>
              <p className="text-sm text-zinc-400">
                {b.eventDate} · {b.city} · {b.status}
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
