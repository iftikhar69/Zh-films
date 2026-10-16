"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type Kind = "confirm" | "decline" | "cancel" | "complete" | "hold" | "release_hold";

type Props = {
  bookingId: string;
  status: string;
  held: boolean;
  eventEnded: boolean;
  defaultHoldHours: number;
  quotedAmount: number | null;
  advanceAmount: number | null;
  defaultAdvancePercent: number;
  /** Server-computed package + add-ons estimate, if the customer chose a package. */
  estimatedTotal?: number | null;
};

const COPY: Record<Kind, { title: string; body: string; cta: string; danger?: boolean; reason?: boolean }> = {
  confirm: {
    title: "Confirm this booking?",
    body: "The date is only locked once the advance is verified. Availability is re-checked on the server; if the time is free the booking is confirmed and the client is emailed.",
    cta: "Confirm booking"
  },
  decline: {
    title: "Decline this request?",
    body: "The client is told we can't take the booking. This cannot be undone.",
    cta: "Decline request",
    danger: true,
    reason: true
  },
  cancel: {
    title: "Cancel this booking?",
    body: "The time is released for other clients and the client is emailed. This cannot be undone.",
    cta: "Cancel booking",
    danger: true,
    reason: true
  },
  complete: { title: "Mark as completed?", body: "Use this after the event has taken place.", cta: "Mark completed" },
  hold: {
    title: "Place a temporary hold?",
    body: "Other requests for this time are refused until the hold ends. It expires automatically — it is not a confirmation.",
    cta: "Place hold"
  },
  release_hold: { title: "Release the hold?", body: "The time becomes available to other clients again.", cta: "Release hold" }
};

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string; email?: { status: string; error?: string } | null };
  return { res, json };
}

export function BookingActions(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<Kind | null>(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(props.defaultHoldHours);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [unpaid, setUnpaid] = useState<string | null>(null);
  const [overrideUsed, setOverrideUsed] = useState(false);

  async function run(kind: Kind, override = false, withoutAdvance = false) {
    setBusy(true);
    setConflict(null);
    setUnpaid(null);
    try {
      const body =
        kind === "hold"
          ? { action: kind, hours }
          : kind === "decline" || kind === "cancel"
            ? { action: kind, reason: reason.trim() || undefined }
            : kind === "confirm"
              ? { action: kind, override, withoutAdvance }
              : { action: kind };
      const { res, json } = await post(`/api/admin/bookings/${props.bookingId}`, body);
      if (res.status === 409 && json.code === "slot_conflict") {
        setConflict(json.error ?? "Time conflict");
        return;
      }
      if (res.status === 409 && json.code === "advance_unpaid") {
        setUnpaid(json.error ?? "The advance hasn't been verified yet.");
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Action failed");
      toast.success(kind === "confirm" ? "Confirmed. This doesn't mean the advance has been paid." : "Saved");
      const mail = json.email?.status;
      if (mail === "sent") toast.success("Email sent to the client");
      else if (mail === "skipped") toast.warning("No email sent: email isn't set up or the client gave no address. Let them know directly.");
      else if (mail === "failed") toast.error("The email failed to send. Contact the client directly; it's logged under email issues.");
      setOpen(null);
      setReason("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const actions: { kind: Kind; show: boolean; variant?: "outline" | "default" }[] = [
    { kind: "confirm", show: props.status === "pending" },
    { kind: "hold", show: props.status === "pending" && !props.held, variant: "outline" },
    { kind: "release_hold", show: props.held, variant: "outline" },
    { kind: "complete", show: props.status === "confirmed" && props.eventEnded, variant: "outline" },
    { kind: "decline", show: props.status === "pending", variant: "outline" },
    { kind: "cancel", show: props.status === "pending" || props.status === "confirmed", variant: "outline" }
  ];
  const visible = actions.filter((a) => a.show);
  const copy = open ? COPY[open] : null;

  return (
    <div className="space-y-6">
      {visible.length ? (
        <div className="flex flex-wrap gap-2">
          {visible.map((a) => (
            <Button
              key={a.kind}
              variant={a.variant ?? "default"}
              size="sm"
              className={COPY[a.kind].danger ? "border-red-500/40 text-red-300 hover:bg-red-500/10" : undefined}
              onClick={() => {
                setConflict(null);
                setOpen(a.kind);
              }}
            >
              {COPY[a.kind].cta}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">This booking is closed — no further status changes.</p>
      )}

      {props.status === "pending" || props.status === "confirmed" ? <QuoteForm {...props} /> : null}

      <Dialog open={open !== null} onOpenChange={(v) => !v && !busy && setOpen(null)}>
        {copy && open ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.body}</DialogDescription>
            </DialogHeader>
            {open === "hold" ? (
              <label className="block text-sm text-zinc-300">
                Hold for
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="ml-2 h-9 rounded-md border border-white/10 bg-black px-2"
                >
                  {[12, 24, 48, 72, 168].map((h) => (
                    <option key={h} value={h}>
                      {h < 168 ? `${h} hours` : "7 days"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {copy.reason ? (
              <label className="block text-sm text-zinc-300">
                Message to the client (optional)
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="mt-2 w-full rounded-md border border-white/10 bg-black p-2 text-sm"
                />
              </label>
            ) : null}
            {conflict ? (
              <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {conflict}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-red-400/50 text-red-200"
                  disabled={busy}
                  onClick={() => {
                    setOverrideUsed(true);
                    run("confirm", true);
                  }}
                >
                  I have a second crew — confirm anyway
                </Button>
              </div>
            ) : null}
            {unpaid ? (
              <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                {unpaid}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-amber-400/50 text-amber-100"
                  disabled={busy}
                  onClick={() => run("confirm", overrideUsed, true)}
                >
                  Advance received another way — confirm anyway
                </Button>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" disabled={busy} onClick={() => setOpen(null)}>
                Back
              </Button>
              <Button
                disabled={busy}
                className={copy.danger ? "bg-red-600 text-white hover:bg-red-500" : undefined}
                onClick={() => run(open)}
              >
                {busy ? "Working…" : copy.cta}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function QuoteForm({ bookingId, quotedAmount, advanceAmount, defaultAdvancePercent, estimatedTotal }: Props) {
  const router = useRouter();
  const [total, setTotal] = useState(quotedAmount?.toString() ?? "");
  const [advance, setAdvance] = useState(advanceAmount?.toString() ?? "");
  const [note, setNote] = useState("");
  const diff = estimatedTotal != null && total ? Number(total) - estimatedTotal : null;
  const [busy, setBusy] = useState(false);
  const input = "h-10 w-full rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-zinc-100";

  return (
    <form
      className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const q = Number(total);
        const a = Number(advance);
        if (!Number.isInteger(q) || q < 0 || !Number.isInteger(a) || a < 0) {
          toast.error("Enter whole rupee amounts");
          return;
        }
        setBusy(true);
        const { res, json } = await post(`/api/admin/bookings/${bookingId}`, {
          action: "set_quote",
          quotedAmount: q,
          advanceAmount: a,
          note: note.trim() || undefined
        });
        setBusy(false);
        if (!res.ok || !json.ok) toast.error(json.error ?? "Could not save");
        else {
          toast.success(a > 0 ? "Quote saved — payment instructions are now visible to the client" : "Quote saved");
          router.refresh();
        }
      }}
    >
      <label className="text-xs text-zinc-400">
        Agreed total (PKR)
        <input
          inputMode="numeric"
          value={total}
          onChange={(e) => {
            setTotal(e.target.value.replace(/\D/g, ""));
            if (!advanceAmount && e.target.value) {
              setAdvance(String(Math.round((Number(e.target.value.replace(/\D/g, "")) * defaultAdvancePercent) / 100)));
            }
          }}
          className={`${input} mt-1`}
        />
      </label>
      <label className="text-xs text-zinc-400">
        Required advance (PKR)
        <input
          inputMode="numeric"
          value={advance}
          onChange={(e) => setAdvance(e.target.value.replace(/\D/g, ""))}
          className={`${input} mt-1`}
        />
      </label>
      <label className="text-xs text-zinc-400">
        Discount / custom deal note (optional)
        <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Agreed on WhatsApp: 3 functions" className={`${input} mt-1`} />
      </label>
      <Button type="submit" size="sm" disabled={busy || !total}>
        {busy ? "Saving…" : "Save quote"}
      </Button>
      {estimatedTotal != null ? (
        <p className="text-xs text-zinc-500 sm:col-span-4">
          Package estimate: PKR {estimatedTotal.toLocaleString("en-PK")}
          {diff ? (diff < 0 ? ` · discount PKR ${(-diff).toLocaleString("en-PK")}` : ` · PKR ${diff.toLocaleString("en-PK")} above estimate`) : ""}
          {!total ? (
            <button type="button" className="ml-2 text-zh-gold hover:underline" onClick={() => {
              setTotal(String(estimatedTotal));
              if (!advanceAmount) setAdvance(String(Math.round((estimatedTotal * defaultAdvancePercent) / 100)));
            }}>
              Use estimate
            </button>
          ) : null}
          . The agreed total becomes the customer&apos;s final price only when you save it here.
        </p>
      ) : null}
    </form>
  );
}
