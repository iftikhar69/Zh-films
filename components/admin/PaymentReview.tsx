"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PaymentReview({ paymentId, amount, reference, method }: { paymentId: string; amount: string; reference: string; method: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<"verify" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!open) return;
    setBusy(true);
    const res = await fetch(`/api/admin/payments/${paymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(open === "verify" ? { action: "verify" } : { action: "reject", reason })
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !json.ok) {
      toast.error(json.error ?? "Could not save");
      return;
    }
    toast.success(open === "verify" ? "Payment verified — client emailed" : "Payment rejected — client emailed");
    setOpen(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { setChecked(false); setOpen("verify"); }}>
          Verify
        </Button>
        <Button size="sm" variant="outline" className="border-red-500/40 text-red-300" onClick={() => setOpen("reject")}>
          Reject
        </Button>
      </div>
      <Dialog open={open !== null} onOpenChange={(v) => !v && !busy && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open === "verify" ? "Verify this payment?" : "Reject this payment?"}</DialogTitle>
            <DialogDescription>
              {amount} via {method} · reference <span className="font-mono">{reference}</span>
            </DialogDescription>
          </DialogHeader>
          {open === "verify" ? (
            <label className="flex items-start gap-3 text-sm text-zinc-300">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
              I checked my {method === "easypaisa" ? "Easypaisa account" : "bank statement"} and this money has arrived. A screenshot alone is not proof.
            </label>
          ) : (
            <label className="block text-sm text-zinc-300">
              Reason shown to the client
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                className="mt-2 w-full rounded-md border border-white/10 bg-black p-2 text-sm"
                placeholder="No matching transaction found in our account"
              />
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setOpen(null)}>
              Back
            </Button>
            <Button
              disabled={busy || (open === "verify" ? !checked : reason.trim().length < 3)}
              className={open === "reject" ? "bg-red-600 text-white hover:bg-red-500" : undefined}
              onClick={submit}
            >
              {busy ? "Saving…" : open === "verify" ? "Mark verified" : "Reject payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
