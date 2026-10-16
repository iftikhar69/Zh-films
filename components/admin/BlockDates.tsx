"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Conflict = { id: string; names: string; eventDate: string };

export function BlockDatesForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [startDate, setStart] = useState(defaultDate);
  const [endDate, setEnd] = useState(defaultDate);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  async function submit(force = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate: endDate || startDate, reason: reason || undefined, force })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setConflicts(data.bookings ?? []);
        setError(data.error);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not save. Please try again.");
        return;
      }
      setConflicts([]);
      setReason("");
      toast.success(startDate === endDate ? `${startDate} marked busy` : `${startDate} to ${endDate} marked busy`);
      router.refresh();
    } catch {
      setError("Network error. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white";
  return (
    <form
      className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="font-serif text-lg text-white">Mark dates busy</h2>
      <p className="text-xs text-zinc-500">Busy dates can&apos;t be booked. Clients only see that the date is taken, never the reason.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-400">
          From
          <input type="date" required value={startDate} onChange={(e) => { setStart(e.target.value); if (!endDate || endDate < e.target.value) setEnd(e.target.value); }} className={input} />
        </label>
        <label className="text-xs text-zinc-400">
          To
          <input type="date" required min={startDate} value={endDate} onChange={(e) => setEnd(e.target.value)} className={input} />
        </label>
      </div>
      <label className="block text-xs text-zinc-400">
        Private note (optional)
        <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Travelling to Skardu" className={input} />
      </label>
      {error ? (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          <p>{error}</p>
          {conflicts.length ? (
            <>
              <ul className="mt-2 list-disc pl-4">
                {conflicts.map((c) => (
                  <li key={c.id}>{c.eventDate}: {c.names}</li>
                ))}
              </ul>
              <button type="button" disabled={busy} onClick={() => submit(true)} className="mt-2 underline">
                Block anyway (the bookings stay as they are)
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-zh-gold px-4 py-2 text-sm font-medium text-black disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Saving…" : "Mark busy"}
      </button>
    </form>
  );
}

export function UnblockButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/admin/blocked-dates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) toast.error(data.error ?? "Could not remove");
          else toast.success("Dates are open again");
          router.refresh();
        } catch {
          toast.error("Network error. Nothing changed.");
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 disabled:opacity-50"
    >
      {busy ? "Removing…" : "Make available"}
    </button>
  );
}
