"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CancelRequestForm({ code, token }: { code: string; token?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${code}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message })
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Couldn't cancel. Please try again.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't cancel. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="border-red-500/40 text-red-300 hover:bg-red-500/10" onClick={() => setOpen(true)}>
        Cancel this request
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
      <p className="text-sm text-zinc-300">
        Cancelling releases this request. ZH Films will see your message. You can send a new request any time.
      </p>
      <label className="block text-sm text-zinc-300">
        Your message to ZH Films
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="e.g. We changed our date, or found another option."
          className="mt-2"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => setOpen(false)}>
          Keep my request
        </Button>
        <Button size="sm" disabled={busy || message.trim().length < 3} className="bg-red-600 text-white hover:bg-red-500" onClick={submit}>
          {busy ? "Cancelling…" : "Cancel request"}
        </Button>
      </div>
    </div>
  );
}
