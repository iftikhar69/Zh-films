"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Settings } from "@/lib/settings";

const input =
  "mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-zinc-100 focus:border-zh-gold/50 focus:outline-none";
const area = "mt-1 w-full rounded-lg border border-white/10 bg-black/60 p-3 text-sm text-zinc-100 focus:border-zh-gold/50 focus:outline-none";

export function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) {
    setS((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  }
  function setPay<K extends keyof Settings["payments"]>(method: K, patch: Partial<Settings["payments"][K]>) {
    setS((prev) => ({ ...prev, payments: { ...prev.payments, [method]: { ...prev.payments[method], ...patch } } }));
  }

  return (
    <form
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s)
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        setBusy(false);
        if (!res.ok || !json.ok) toast.error(json.error ?? "Could not save settings");
        else toast.success("Settings saved");
      }}
    >
      <Section title="Easypaisa" hint="Shown to a client only after you set a quote with an advance.">
        <Toggle checked={s.payments.easypaisa.enabled} onChange={(v) => setPay("easypaisa", { enabled: v })} label="Accept Easypaisa" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Account title">
            <input className={input} value={s.payments.easypaisa.accountTitle} onChange={(e) => setPay("easypaisa", { accountTitle: e.target.value })} />
          </Field>
          <Field label="Easypaisa number">
            <input className={input} inputMode="tel" value={s.payments.easypaisa.accountNumber} onChange={(e) => setPay("easypaisa", { accountNumber: e.target.value })} placeholder="03xx xxxxxxx" />
          </Field>
        </div>
        <Field label="Extra instructions">
          <textarea className={area} rows={2} value={s.payments.easypaisa.instructions} onChange={(e) => setPay("easypaisa", { instructions: e.target.value })} />
        </Field>
      </Section>

      <Section title="Bank transfer">
        <Toggle checked={s.payments.bank.enabled} onChange={(v) => setPay("bank", { enabled: v })} label="Accept bank transfer" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bank name">
            <input className={input} value={s.payments.bank.bankName} onChange={(e) => setPay("bank", { bankName: e.target.value })} />
          </Field>
          <Field label="Account title">
            <input className={input} value={s.payments.bank.accountTitle} onChange={(e) => setPay("bank", { accountTitle: e.target.value })} />
          </Field>
          <Field label="Account number">
            <input className={input} value={s.payments.bank.accountNumber} onChange={(e) => setPay("bank", { accountNumber: e.target.value })} />
          </Field>
          <Field label="IBAN">
            <input className={input} value={s.payments.bank.iban} onChange={(e) => setPay("bank", { iban: e.target.value.toUpperCase() })} placeholder="PK00XXXX0000000000000000" />
          </Field>
        </div>
        <Field label="Extra instructions">
          <textarea className={area} rows={2} value={s.payments.bank.instructions} onChange={(e) => setPay("bank", { instructions: e.target.value })} />
        </Field>
      </Section>

      <Section title="Advance and holds">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Suggested advance (% of total)">
            <input className={input} type="number" min={0} max={100} value={s.advance.defaultPercent} onChange={(e) => set("advance", { defaultPercent: Number(e.target.value) })} />
          </Field>
          <Field label="Default temporary hold (hours)">
            <input className={input} type="number" min={1} max={336} value={s.holds.defaultHours} onChange={(e) => set("holds", { defaultHours: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Advance note shown to clients">
          <textarea className={area} rows={2} value={s.advance.note} onChange={(e) => set("advance", { note: e.target.value })} />
        </Field>
      </Section>

      <Section title="Notifications">
        <Field label="Send owner emails to">
          <input className={input} type="email" value={s.notifications.ownerEmail} onChange={(e) => set("notifications", { ownerEmail: e.target.value })} placeholder="Leave empty to use OWNER_NOTIFY_EMAIL / ADMIN_EMAILS" />
        </Field>
        <Toggle checked={s.notifications.onNewRequest} onChange={(v) => set("notifications", { onNewRequest: v })} label="Email me for every new booking request" />
        <Toggle checked={s.notifications.onPaymentSubmitted} onChange={(v) => set("notifications", { onPaymentSubmitted: v })} label="Email me when a client reports a payment" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Remind me about pending requests after (hours)">
            <input className={input} type="number" min={1} max={168} value={s.notifications.pendingReminderHours} onChange={(e) => set("notifications", { pendingReminderHours: Number(e.target.value) })} />
          </Field>
          <Field label="Remind clients about an unpaid advance after (hours)">
            <input className={input} type="number" min={1} max={336} value={s.notifications.customerAdvanceReminderHours} onChange={(e) => set("notifications", { customerAdvanceReminderHours: Number(e.target.value) })} />
          </Field>
        </div>
      </Section>

      <Section title="Policies" hint="Shown on the client's booking page.">
        <Field label="Booking policy">
          <textarea className={area} rows={3} value={s.policies.booking} onChange={(e) => set("policies", { booking: e.target.value })} />
        </Field>
        <Field label="Cancellation and refund policy">
          <textarea className={area} rows={3} value={s.policies.cancellation} onChange={(e) => set("policies", { cancellation: e.target.value })} />
        </Field>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/50 p-5">
      <legend className="px-1 font-serif text-lg text-white">{title}</legend>
      {hint ? <p className="-mt-2 text-xs text-zinc-500">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs text-zinc-400">{label}{children}</label>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 text-sm text-zinc-200">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#c8a96a]" />
      {label}
    </label>
  );
}
