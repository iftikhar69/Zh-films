"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { waLink } from "@/lib/film-family";
import type { PublicGear } from "@/lib/gear";

export function gearWhatsApp(g: Pick<PublicGear, "name">, mode: "sell" | "rent") {
  return waLink(
    mode === "rent"
      ? `Assalam o Alaikum ZH Films! I'd like to rent the ${g.name}. Is it available, and what is the rate?`
      : `Assalam o Alaikum ZH Films! I'm interested in buying the ${g.name}. Could you share the condition and price?`
  );
}

export function GearEnquiry({ item, mode, onClose }: { item: PublicGear | null; mode: "sell" | "rent"; onClose: () => void }) {
  const [form, setForm] = useState({ clientName: "", phone: "", email: "", startDate: "", endDate: "", message: "" });
  const [state, setState] = useState<{ busy: boolean; error?: string; field?: string; done?: string }>({ busy: false });
  const today = new Date().toISOString().slice(0, 10);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!item) return;
    setState({ busy: true });
    const res = await fetch(mode === "rent" ? "/api/rent" : "/api/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gearId: item.id, ...form })
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : { error: "Network error — please try again." };
    if (!res?.ok || !json.ok) setState({ busy: false, error: json.error ?? "Couldn't send", field: json.field });
    else setState({ busy: false, done: json.confirmationMessage });
  }

  const err = (k: string) => (state.field === k ? <span className="text-[11px] normal-case tracking-normal text-red-400">{state.error}</span> : null);

  return (
    <Dialog
      open={!!item}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setState({ busy: false });
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.name}</DialogTitle>
          <DialogDescription>
            {mode === "rent"
              ? "Tell us your dates. We confirm availability and the rate before anything is held."
              : "We'll reply with the condition, price and how to see it. Nothing is reserved until we confirm."}
          </DialogDescription>
        </DialogHeader>
        {state.done ? (
          <div className="space-y-4">
            <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              {state.done}
            </p>
            {item ? (
              <a href={gearWhatsApp(item, mode)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-zh-gold">
                <MessageCircle className="h-4 w-4" /> Continue on WhatsApp
              </a>
            ) : null}
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="block space-y-1 text-xs text-zinc-400">
              <span>Your name {err("clientName")}</span>
              <Input value={form.clientName} onChange={(e) => set("clientName", e.target.value)} autoComplete="name" required />
            </label>
            <label className="block space-y-1 text-xs text-zinc-400">
              <span>WhatsApp / phone {err("phone")}</span>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" autoComplete="tel" required />
            </label>
            <label className="block space-y-1 text-xs text-zinc-400">
              <span>Email (optional) {err("email")}</span>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
            </label>
            {mode === "rent" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1 text-xs text-zinc-400">
                  <span>Pickup {err("startDate")}</span>
                  <Input type="date" min={today} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
                </label>
                <label className="block space-y-1 text-xs text-zinc-400">
                  <span>Return {err("endDate")}</span>
                  <Input type="date" min={form.startDate || today} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                </label>
              </div>
            ) : null}
            <label className="block space-y-1 text-xs text-zinc-400">
              <span>Message (optional)</span>
              <Textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={3} maxLength={2000} />
            </label>
            {state.error && !state.field ? (
              <p role="alert" className="text-sm text-red-300">
                {state.error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={state.busy}>
              {state.busy ? "Sending…" : mode === "rent" ? "Request these dates" : "Send enquiry"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
