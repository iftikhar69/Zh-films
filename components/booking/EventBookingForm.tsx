"use client";

import { useMemo, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { estimate, type PublicCatalog } from "@/lib/catalog-shared";
import { COVERAGE_TYPES, EVENT_TYPES, EVENT_TYPE_KEYS, formatPkr, type EventType } from "@/lib/enquiry";
import { SERVICES } from "@/lib/booking-rules";
import {
  AvailabilityNote,
  EnquirySuccess,
  Field,
  Input,
  selectClass,
  submitEnquiry,
  useDateBounds,
  useQueryReferences,
  useSessionDraft,
  type EnquiryResult
} from "@/components/booking/enquiry-kit";

type Draft = {
  eventType: EventType;
  eventDate: string;
  startTime: string;
  endTime: string;
  city: string;
  coverageType: string;
  deliverables: string;
  references: string;
  addonIds: string[];
  budget: string;
  names: string;
  phone: string;
  email: string;
};

const defaultsFor = (t: EventType) => {
  const s = SERVICES[EVENT_TYPES[t].service];
  return { startTime: s.defaultStart, endTime: s.defaultEnd };
};

export function EventBookingForm({ catalog, initialType }: { catalog: PublicCatalog; initialType: EventType | null }) {
  const start = initialType ?? "nikah";
  const [d, setD, clear] = useSessionDraft<Draft>("zh-event-draft", {
    eventType: start,
    eventDate: "",
    ...defaultsFor(start),
    city: "",
    coverageType: COVERAGE_TYPES[2],
    deliverables: "",
    references: "",
    addonIds: [],
    budget: "",
    names: "",
    phone: "",
    email: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ result: EnquiryResult; whatsappOpened: boolean } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const idempotencyKey = useRef<string | null>(null);
  const { minDate, maxDate } = useDateBounds();
  useQueryReferences((refs) => setD((v) => (v.references ? v : { ...v, references: refs })));

  const [appliedInitial, setAppliedInitial] = useState(false);
  if (!appliedInitial && initialType && d.eventType !== initialType) {
    setAppliedInitial(true);
    setD((v) => ({ ...v, eventType: initialType, ...defaultsFor(initialType) }));
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const validAddons = d.addonIds.filter((id) => catalog.addons.some((a) => a.id === id));
  const priced = useMemo(() => {
    try {
      return estimate(catalog, null, validAddons);
    } catch {
      return null;
    }
  }, [catalog, validAddons]);

  function validate() {
    const e: Record<string, string> = {};
    if (!d.eventDate) e.eventDate = "Pick a date";
    if (!d.startTime) e.startTime = "Start time";
    if (!d.endTime) e.endTime = "End time";
    if (d.city.trim().length < 2) e.city = "Add the venue or city";
    if (d.names.trim().length < 2) e.names = "Add your name";
    if (d.phone.replace(/\D/g, "").length < 10) e.phone = "Add a WhatsApp number we can reach";
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) e.email = "Check the email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function send(whatsapp: boolean) {
    if (!validate() || submitting) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setSubmitting(true);
    setSubmitError(null);
    const { result, whatsappOpened } = await submitEnquiry(
      {
        kind: "event",
        eventType: d.eventType,
        eventDate: d.eventDate,
        startTime: d.startTime,
        endTime: d.endTime,
        city: d.city,
        coverage: d.coverageType,
        deliverables: d.deliverables,
        references: d.references,
        addonIds: validAddons,
        budget: d.budget,
        customDeal: true,
        names: d.names,
        phone: d.phone,
        email: d.email,
        idempotencyKey: idempotencyKey.current
      },
      { whatsapp }
    );
    setSubmitting(false);
    if (!result.ok) {
      if (result.status === 409) {
        idempotencyKey.current = null;
        setRefreshKey((k) => k + 1);
      }
      setSubmitError(result.error);
      if (result.field) setErrors((e) => ({ ...e, [result.field!]: result.error }));
      return;
    }
    idempotencyKey.current = null;
    sessionStorage.removeItem("zh-event-draft");
    setDone({ result, whatsappOpened });
  }

  if (done) {
    return (
      <EnquirySuccess
        result={done.result}
        whatsappOpened={done.whatsappOpened}
        onReset={() => {
          clear();
          setDone(null);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Book an event in advance</p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Request a quote for your event</h1>
        <p className="mt-3 text-sm text-zinc-400">
          For a Nikah, engagement, birthday, corporate event or a custom cinematic shoot. We check the date against our
          calendar, then send you a quote. All dates are subject to confirmation.
        </p>
      </header>

      <form
        className="space-y-5 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void send(false);
        }}
        noValidate
      >
        <Field label="Event type">
          <select
            className={selectClass}
            value={d.eventType}
            onChange={(e) => {
              const t = e.target.value as EventType;
              setD((v) => ({ ...v, eventType: t, ...defaultsFor(t) }));
            }}
          >
            {EVENT_TYPE_KEYS.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPES[t].label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Date" error={errors.eventDate}>
            <Input type="date" min={minDate} max={maxDate} value={d.eventDate} onChange={(e) => set("eventDate", e.target.value)} />
          </Field>
          <Field label="From" error={errors.startTime}>
            <Input type="time" step={900} value={d.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </Field>
          <Field label="To" error={errors.endTime}>
            <Input type="time" step={900} value={d.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </Field>
        </div>
        {d.eventDate ? <AvailabilityNote date={d.eventDate} refreshKey={refreshKey} /> : null}
        <Field label="Venue, city and location" error={errors.city}>
          <Input value={d.city} maxLength={300} placeholder="e.g. Expo Centre, Lahore" onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Coverage type">
          <select className={selectClass} value={d.coverageType} onChange={(e) => set("coverageType", e.target.value)}>
            {COVERAGE_TYPES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Special requirements (optional)">
          <Textarea value={d.deliverables} maxLength={2000} placeholder="What you'd like filmed or delivered, guest count, timings" onChange={(e) => set("deliverables", e.target.value)} />
        </Field>
        {catalog.addons.length ? (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-400">Add-ons</legend>
            {catalog.addons.map((a) => {
              const on = d.addonIds.includes(a.id);
              return (
                <label key={a.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm", on ? "border-zh-gold/60 bg-zh-gold/5" : "border-white/10")}>
                  <input
                    type="checkbox"
                    checked={on}
                    className="accent-[#c8a96a]"
                    onChange={() => set("addonIds", on ? d.addonIds.filter((x) => x !== a.id) : [...d.addonIds, a.id])}
                  />
                  <span className="flex-1 text-white">{a.name}</span>
                  <span className="text-zh-gold">+ {formatPkr(a.price)}</span>
                </label>
              );
            })}
            {priced && priced.total > 0 ? (
              <p className="text-xs text-zinc-400">
                Add-ons estimate: <span className="text-zh-gold">{formatPkr(priced.total)}</span> — your event quote is added by ZH Films.
              </p>
            ) : null}
          </fieldset>
        ) : null}
        <Field label="Budget (optional)" hint="Helps us suggest the right coverage. It doesn't fix a price.">
          <Input value={d.budget} maxLength={300} onChange={(e) => set("budget", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your name" error={errors.names}>
            <Input value={d.names} autoComplete="name" maxLength={120} onChange={(e) => set("names", e.target.value)} />
          </Field>
          <Field label="WhatsApp number" error={errors.phone}>
            <Input value={d.phone} type="tel" autoComplete="tel" placeholder="+92 3xx xxxxxxx" maxLength={30} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </div>
        <Field label="Email (optional)" error={errors.email}>
          <Input value={d.email} type="email" autoComplete="email" maxLength={200} onChange={(e) => set("email", e.target.value)} />
        </Field>

        {submitError ? (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" disabled={submitting} onClick={() => void send(true)}>
            <MessageCircle /> Get a custom deal on WhatsApp
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Request a quote"}
          </Button>
        </div>
        <p className="text-[11px] text-zinc-500">
          Both buttons save your request first. Opening WhatsApp does not book or confirm a date — ZH Films confirms
          every booking with you.
        </p>
      </form>
    </div>
  );
}
