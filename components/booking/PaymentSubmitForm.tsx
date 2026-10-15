"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Method = "easypaisa" | "bank";

export function PaymentSubmitForm({
  code,
  token,
  methods,
  suggestedAmount
}: {
  code: string;
  token?: string;
  methods: Method[];
  suggestedAmount: number;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>(methods[0]);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const inFlight = useRef(false);
  const input = "mt-1 h-11 w-full rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-zinc-100 focus:border-zh-gold/50 focus:outline-none";

  if (done) {
    return (
      <p role="status" className="rounded-xl border border-orange-400/30 bg-orange-400/10 p-4 text-sm text-orange-100">
        Thank you — we&apos;ve received your payment details. It shows as <strong>awaiting verification</strong> until we
        confirm the money has arrived in our account. We&apos;ll email you once it&apos;s verified.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      encType="multipart/form-data"
      onSubmit={async (e) => {
        e.preventDefault();
        if (inFlight.current) return;
        const form = new FormData(e.currentTarget);
        const file = form.get("receipt");
        if (file instanceof File && file.size > 5 * 1024 * 1024) {
          setError({ field: "receipt", message: "Receipts must be 5 MB or smaller." });
          return;
        }
        if (token) form.set("token", token);
        form.set("method", method);
        inFlight.current = true;
        setBusy(true);
        setError(null);
        try {
          const res = await fetch(`/api/bookings/${code}/payments`, { method: "POST", body: form });
          const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; field?: string };
          if (!res.ok || !json.ok) {
            setError({ field: json.field, message: json.error ?? "Could not submit. Please try again." });
            return;
          }
          setDone(true);
          router.refresh();
        } catch {
          setError({ message: "You appear to be offline. Please try again." });
        } finally {
          inFlight.current = false;
          setBusy(false);
        }
      }}
    >
      {methods.length > 1 ? (
        <div role="radiogroup" aria-label="Payment method" className="flex gap-2">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${method === m ? "border-zh-gold/60 bg-zh-gold/10 text-zh-gold" : "border-white/10 text-zinc-400"}`}
            >
              {m === "easypaisa" ? "Easypaisa" : "Bank transfer"}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-zinc-400">
          Amount sent (PKR)
          <input name="amount" required inputMode="numeric" pattern="[0-9]*" defaultValue={suggestedAmount} className={input} />
          {error?.field === "amount" ? <span className="text-red-400">{error.message}</span> : null}
        </label>
        <label className="text-xs text-zinc-400">
          Transaction ID / reference
          <input name="reference" required minLength={4} maxLength={64} autoComplete="off" className={`${input} font-mono`} />
          {error?.field === "reference" ? <span className="text-red-400">{error.message}</span> : null}
        </label>
        <label className="text-xs text-zinc-400 sm:col-span-2">
          Sender name (optional)
          <input name="payerName" maxLength={120} className={input} />
        </label>
        <label className="text-xs text-zinc-400 sm:col-span-2">
          Receipt (optional) — JPG, PNG, WebP or PDF, up to 5 MB
          <input
            name="receipt"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="mt-1 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zh-gold/20 file:px-3 file:py-2 file:text-zh-gold"
          />
          {error?.field === "receipt" ? <span className="text-red-400">{error.message}</span> : null}
        </label>
      </div>
      <p className="text-xs text-zinc-500">We will never ask for your PIN, password or OTP. Only share the transaction ID.</p>
      {error && !["amount", "reference", "receipt"].includes(error.field ?? "") ? (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error.message}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Submit payment details"}
      </Button>
    </form>
  );
}
