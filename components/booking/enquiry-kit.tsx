"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { waLink } from "@/lib/film-family";
import { formatPkr } from "@/lib/enquiry";
import { BOOKING_WINDOW, todayIn } from "@/lib/booking-rules";

/** Form state persisted to sessionStorage so going back or reloading never loses input. */
export function useSessionDraft<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
      if (raw) setValue({ ...initial, ...(JSON.parse(raw) as Partial<T>) });
    } catch {
      sessionStorage.removeItem(key);
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (loaded.current) sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  const clear = () => {
    sessionStorage.removeItem(key);
    setValue(initial);
  };
  return [value, setValue, clear] as const;
}

/** Applies ?references=… (e.g. from the favorites board) once, without overwriting typed text. */
export function useQueryReferences(apply: (refs: string) => void) {
  useEffect(() => {
    const refs = new URLSearchParams(window.location.search).get("references");
    if (refs) apply(refs.slice(0, 500));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useDateBounds() {
  const [bounds] = useState(() => {
    const today = todayIn();
    const shift = (days: number) => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    return { minDate: shift(BOOKING_WINDOW.minLeadDays), maxDate: shift(BOOKING_WINDOW.maxAdvanceDays) };
  });
  return bounds;
}

/** Live, anonymised availability for one date from the server-side booking calendar. */
export function AvailabilityNote({ date, refreshKey = 0 }: { date: string; refreshKey?: number }) {
  const [state, setState] = useState<{ date: string; message: string; busy: boolean } | null>(null);
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    let cancelled = false;
    fetch(`/api/bookings?date=${encodeURIComponent(date)}`)
      .then((r) => r.json())
      .then((d: { message?: string; busy?: unknown[] }) => {
        if (!cancelled && d.message) setState({ date, message: d.message, busy: (d.busy?.length ?? 0) > 0 });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [date, refreshKey]);
  if (!state || state.date !== date) return null;
  return (
    <p className={`text-[11px] leading-relaxed ${state.busy ? "text-amber-300" : "text-emerald-300/90"}`} aria-live="polite">
      {state.message}
    </p>
  );
}

export type EnquiryResult = {
  ok: true;
  booking: { id: string; confirmationCode: string; eventDate: string; names: string };
  estimate: { packageName: string | null; packagePrice: number | null; addons: { name: string; price: number }[]; total: number | null };
  confirmationMessage: string;
  statusUrl?: string;
  whatsappText: string;
};

export type EnquiryError = { ok: false; status: number; field?: string; error: string };

/**
 * Saves the enquiry through the booking API. With `whatsapp`, a tab is opened synchronously in
 * the click handler (so pop-up blockers allow it) and only pointed at WhatsApp once the request
 * is safely stored; on failure it is closed again.
 */
export async function submitEnquiry(
  payload: Record<string, unknown>,
  { whatsapp }: { whatsapp: boolean }
): Promise<{ result: EnquiryResult | EnquiryError; whatsappOpened: boolean }> {
  const tab = whatsapp ? window.open("", "_blank") : null;
  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, whatsapp })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      tab?.close();
      return {
        result: { ok: false, status: res.status, field: data.field, error: data.error || "Could not send your request. Please try again." },
        whatsappOpened: false
      };
    }
    let opened = false;
    if (tab && !tab.closed) {
      tab.opener = null;
      tab.location.href = waLink(data.whatsappText);
      opened = true;
    }
    return { result: data as EnquiryResult, whatsappOpened: opened };
  } catch {
    tab?.close();
    return {
      result: { ok: false, status: 0, error: "You appear to be offline. Your details are saved here — try again when you're connected." },
      whatsappOpened: false
    };
  }
}

export function EnquirySuccess({
  result,
  whatsappOpened,
  onReset
}: {
  result: EnquiryResult;
  whatsappOpened: boolean;
  onReset: () => void;
}) {
  const { estimate } = result;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <div className="rounded-3xl border border-zh-gold/40 bg-gradient-to-b from-zinc-950 via-black to-black p-6 shadow-[0_0_80px_rgba(200,169,106,0.12)] sm:p-8">
        <p className="text-[10px] uppercase tracking-[0.45em] text-zh-gold">Request received · pending review</p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">We have your request</h1>
        <p className="mt-2 font-mono text-sm text-zh-gold">{result.booking.confirmationCode}</p>
        <p className="mt-4 text-sm text-zinc-300">
          Your date is <strong className="text-white">not reserved yet</strong>. ZH Films will review availability and
          get back to you to confirm.
        </p>
        {estimate.total != null ? (
          <dl className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-black/50 p-5 text-sm">
            {estimate.packageName ? (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">{estimate.packageName}</dt>
                <dd className="text-white">{formatPkr(estimate.packagePrice)}</dd>
              </div>
            ) : null}
            {estimate.addons.map((a) => (
              <div key={a.name} className="flex justify-between gap-4">
                <dt className="text-zinc-400">+ {a.name}</dt>
                <dd className="text-white">{formatPkr(a.price)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-white/10 pt-2">
              <dt className="text-zinc-300">Estimated total</dt>
              <dd className="font-semibold text-zh-gold">{formatPkr(estimate.total)}</dd>
            </div>
            <p className="pt-1 text-[11px] text-zinc-500">
              Estimate only. Extra costs or negotiated discounts apply only once ZH Films approves a final quote.
            </p>
          </dl>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {result.statusUrl ? (
            <Button asChild>
              <Link href={result.statusUrl}>View booking status</Link>
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <a href={waLink(result.whatsappText)} target="_blank" rel="noreferrer">
              <MessageCircle /> {whatsappOpened ? "Open WhatsApp again" : "Continue on WhatsApp"}
            </a>
          </Button>
          <Button variant="ghost" type="button" onClick={onReset}>
            Start a new request
          </Button>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          WhatsApp is for discussing details and deals; it does not change or confirm your booking by itself. Keep the
          status link — we also email it if you gave an email address.
        </p>
      </div>
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  children
}: {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-zinc-500">{hint}</span> : null}
      {error ? <span className="block text-[11px] text-red-400">{error}</span> : null}
    </label>
  );
}

export const selectClass =
  "h-10 w-full rounded-md border border-white/10 bg-black/60 px-3 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zh-gold/50";

export { Input };
