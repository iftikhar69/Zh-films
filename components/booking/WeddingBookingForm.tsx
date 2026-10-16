"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, MessageCircle, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { estimate, type PublicCatalog } from "@/lib/catalog-shared";
import { NeedHelp } from "@/components/packages/NeedHelp";
import { MAX_FUNCTIONS, WEDDING_FUNCTIONS, WEDDING_FUNCTION_TYPES, formatPkr } from "@/lib/enquiry";
import {
  isSelected,
  removeFunction,
  sameDayOverlaps,
  toPayload,
  toggleFunction,
  updateFunction,
  withIds,
  type FunctionRow
} from "@/lib/wedding-functions";
import { BUDGET_TIERS, BUDGET_TIER_KEYS, budgetTierText, type BudgetTier } from "@/lib/budget-tiers";
import {
  AvailabilityNote,
  EnquirySuccess,
  Field,
  Input,
  submitEnquiry,
  useDateBounds,
  useQueryReferences,
  useSessionDraft,
  type EnquiryResult
} from "@/components/booking/enquiry-kit";

const STEPS = ["Package", "Functions", "Details", "Contact"] as const;

type Draft = {
  step: number;
  packageId: string;
  addonIds: string[];
  functions: FunctionRow[];
  city: string;
  coverage: string;
  photography: string;
  videography: string;
  editing: string;
  references: string;
  budget: string;
  budgetTier: BudgetTier | "";
  customDeal: boolean;
  names: string;
  phone: string;
  email: string;
};


export function WeddingBookingForm({ catalog, initialPackage }: { catalog: PublicCatalog; initialPackage: string | null }) {
  const firstPackage = catalog.packages.find((p) => p.id === initialPackage)?.id ?? catalog.packages[0]?.id ?? "";
  const [d, setD, clear] = useSessionDraft<Draft>("zh-wedding-draft", {
    step: 0,
    packageId: firstPackage,
    addonIds: [],
    functions: [],
    city: "",
    coverage: "",
    photography: "",
    videography: "",
    editing: "",
    references: "",
    budget: "",
    budgetTier: "",
    customDeal: false,
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

  // A ?package= link always wins over an older draft.
  const [appliedInitial, setAppliedInitial] = useState(false);
  if (!appliedInitial && initialPackage && catalog.packages.some((p) => p.id === initialPackage) && d.packageId !== initialPackage) {
    setAppliedInitial(true);
    setD((v) => ({ ...v, packageId: initialPackage }));
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const setFunctions = (next: (rows: FunctionRow[]) => FunctionRow[]) => {
    setD((prev) => ({ ...prev, functions: next(prev.functions) }));
    setErrors((e) => ({ ...e, functions: "" }));
  };
  const setFn = (id: string, patch: Partial<Omit<FunctionRow, "id">>) => setFunctions((rows) => updateFunction(rows, id, patch));

  // Drafts saved before rows had ids are upgraded once so each row can be edited on its own.
  const needsIds = d.functions.some((f) => !f.id);
  useEffect(() => {
    if (needsIds) setD((prev) => ({ ...prev, functions: withIds(prev.functions) }));
  }, [needsIds, setD]);
  const overlaps = useMemo(() => sameDayOverlaps(d.functions), [d.functions]);

  const validAddons = d.addonIds.filter((id) => catalog.addons.some((a) => a.id === id));
  const priced = useMemo(() => {
    try {
      return estimate(catalog, d.packageId || null, validAddons);
    } catch {
      return null;
    }
  }, [catalog, d.packageId, validAddons]);
  const pkg = catalog.packages.find((p) => p.id === d.packageId);

  function validate(step: number) {
    const e: Record<string, string> = {};
    if (step === 0 && !pkg) e.packageId = "Choose a package";
    if (step === 1) {
      if (!d.functions.length) e.functions = "Choose at least one function";
      else if (overlaps.length) {
        const [a, b] = overlaps[0];
        e.functions = `${WEDDING_FUNCTIONS[a.type].label} and ${WEDDING_FUNCTIONS[b.type].label} overlap on ${a.eventDate}. Change one of the times or dates.`;
      }
      d.functions.forEach((f, i) => {
        if (!f.eventDate) e[`functions.${i}.eventDate`] = "Pick a date";
        if (!f.startTime) e[`functions.${i}.startTime`] = "Start time";
        if (!f.endTime) e[`functions.${i}.endTime`] = "End time";
      });
    }
    if (step === 2 && d.city.trim().length < 2) e.city = "Add the venue, city or location";
    if (step === 3) {
      if (d.names.trim().length < 2) e.names = "Add your name";
      if (d.phone.replace(/\D/g, "").length < 10) e.phone = "Add a WhatsApp number we can reach";
      if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) e.email = "Check the email address";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function stepForField(field = "") {
    if (field.startsWith("package") || field.startsWith("addon")) return 0;
    if (field.startsWith("functions")) return 1;
    if (field === "city" || field === "coverage") return 2;
    return 3;
  }

  async function send(whatsapp: boolean) {
    for (let s = 0; s < STEPS.length; s++) {
      if (!validate(s)) {
        set("step", s);
        return;
      }
    }
    if (submitting) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setSubmitting(true);
    setSubmitError(null);
    const requirements = [
      d.photography && `Photography: ${d.photography}`,
      d.videography && `Videography: ${d.videography}`,
      d.editing && `Editing: ${d.editing}`
    ]
      .filter(Boolean)
      .join("\n");
    const { result, whatsappOpened } = await submitEnquiry(
      {
        kind: "wedding_package",
        packageId: d.packageId,
        addonIds: validAddons,
        functions: toPayload(d.functions),
        names: d.names,
        phone: d.phone,
        email: d.email,
        city: d.city,
        coverage: d.coverage,
        deliverables: requirements,
        references: d.references,
        budget: d.budget,
        budgetTier: pkg?.custom && d.budgetTier ? d.budgetTier : undefined,
        customDeal: d.customDeal,
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
      if (result.field) {
        setErrors((e) => ({ ...e, [result.field!]: result.error }));
        setD((v) => ({ ...v, step: stepForField(result.field) }));
      }
      return;
    }
    idempotencyKey.current = null;
    sessionStorage.removeItem("zh-wedding-draft");
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

  if (!catalog.packages.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-32 text-center">
        <h1 className="font-serif text-3xl text-white">Wedding packages are being updated</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Please <Link href="/book/event" className="text-zh-gold">request a custom quote</Link> in the meantime.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Wedding packages</p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Plan your wedding film</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Tell us about every function. Your request goes to ZH Films for review — all dates are subject to confirmation.
        </p>
      </header>

      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => set("step", i)}
              aria-current={i === d.step ? "step" : undefined}
              className={cn(
                "w-full rounded-full border px-2 py-2 text-[10px] uppercase tracking-[0.2em] transition",
                i === d.step ? "border-zh-gold/70 bg-zh-gold text-black" : "border-white/10 text-zinc-400 hover:border-zh-gold/40"
              )}
            >
              <span className="hidden sm:inline">{i + 1}. </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form
          className="space-y-5 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (d.step < STEPS.length - 1) {
              if (validate(d.step)) set("step", d.step + 1);
              return;
            }
            void send(false);
          }}
          noValidate
        >
          {d.step === 0 && (
            <>
              <fieldset className="space-y-3">
                <legend className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-400">Choose your package</legend>
                {catalog.packages.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-xl border p-3 transition",
                      d.packageId === p.id ? "border-zh-gold/70 bg-zh-gold/10" : "border-white/10 hover:border-white/25"
                    )}
                  >
                    <input
                      type="radio"
                      name="package"
                      value={p.id}
                      checked={d.packageId === p.id}
                      onChange={() => set("packageId", p.id)}
                      className="sr-only"
                    />
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                      <Image src={p.image} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-white">{p.name}</span>
                      <span className="block text-xs text-zinc-400">{p.tagline}</span>
                    </span>
                    <span className="text-right text-sm font-semibold text-zh-gold">
                      {p.custom ? (p.price > 0 ? `From ${formatPkr(p.price)}` : "You choose") : formatPkr(p.price)}
                      {p.listPrice != null ? <s className="block text-[11px] font-normal text-zinc-500">{formatPkr(p.listPrice)}</s> : null}
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        d.packageId === p.id ? "border-zh-gold bg-zh-gold text-black" : "border-white/20"
                      )}
                    >
                      {d.packageId === p.id ? <Check className="h-3 w-3" /> : null}
                    </span>
                  </label>
                ))}
                {errors.packageId ? <p className="text-[11px] text-red-400">{errors.packageId}</p> : null}
              </fieldset>
              {pkg ? <Inclusions pkg={pkg} /> : null}
              {pkg?.custom ? (
                <BudgetSuggestions value={d.budgetTier} onChange={(t) => set("budgetTier", t)} />
              ) : null}
              <fieldset className="space-y-2">
                <legend className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-400">Add-ons</legend>
                {catalog.addons.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No add-ons are listed yet. Mention anything extra in the details step or on WhatsApp.
                  </p>
                ) : (
                  catalog.addons.map((a) => {
                    const on = d.addonIds.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition",
                          on ? "border-zh-gold/60 bg-zh-gold/5" : "border-white/10 hover:border-white/25"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            set("addonIds", on ? d.addonIds.filter((x) => x !== a.id) : [...d.addonIds, a.id])
                          }
                          className="mt-0.5 accent-[#c8a96a]"
                        />
                        <span className="flex-1">
                          <span className="block text-white">{a.name}</span>
                          {a.description ? <span className="block text-xs text-zinc-400">{a.description}</span> : null}
                        </span>
                        <span className="text-zh-gold">+ {formatPkr(a.price)}</span>
                      </label>
                    );
                  })
                )}
              </fieldset>
            </>
          )}

          {d.step === 1 && (
            <fieldset className="space-y-4">
              <legend className="mb-1 text-[11px] uppercase tracking-[0.22em] text-zinc-400">Which functions should we cover?</legend>
              <p className="text-xs text-zinc-500">
                Select every function you want filmed — each gets its own date, time and venue. Tap a selected one again to
                remove it. Times are Pakistan time; an end time earlier than the start means it runs past midnight.
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Wedding functions">
                {WEDDING_FUNCTION_TYPES.map((t) => {
                  const on = t !== "other" && isSelected(d.functions, t);
                  const full = !on && d.functions.length >= MAX_FUNCTIONS;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      disabled={full}
                      onClick={() => setFunctions((rows) => toggleFunction(rows, t))}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition disabled:opacity-40",
                        on ? "border-zh-gold bg-zh-gold/15 text-zh-gold" : "border-white/15 text-zinc-300 hover:border-white/35"
                      )}
                    >
                      {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {WEDDING_FUNCTIONS[t].label}
                    </button>
                  );
                })}
              </div>
              {d.functions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-zinc-500">
                  No functions selected yet. Pick Nikah, Mehndi, Baraat, Walima or any combination above.
                </p>
              ) : null}
              {d.functions.map((f, i) => {
                const clash = overlaps.some(([x, y]) => x.id === f.id || y.id === f.id);
                return (
                  <div
                    key={f.id || i}
                    data-function={f.type}
                    className={cn("space-y-3 rounded-xl border bg-black/30 p-4", clash ? "border-amber-400/50" : "border-white/10")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-serif text-lg text-white">
                        <span className="mr-2 font-mono text-xs text-zh-gold">{String(i + 1).padStart(2, "0")}</span>
                        {WEDDING_FUNCTIONS[f.type].label}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${WEDDING_FUNCTIONS[f.type].label}`}
                        onClick={() => setFunctions((rows) => removeFunction(rows, f.id))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Date" error={errors[`functions.${i}.eventDate`]}>
                        <Input type="date" min={minDate} max={maxDate} value={f.eventDate} onChange={(e) => setFn(f.id, { eventDate: e.target.value })} />
                      </Field>
                      <Field label="From" error={errors[`functions.${i}.startTime`]}>
                        <Input type="time" step={900} value={f.startTime} onChange={(e) => setFn(f.id, { startTime: e.target.value })} />
                      </Field>
                      <Field label="To" error={errors[`functions.${i}.endTime`]}>
                        <Input type="time" step={900} value={f.endTime} onChange={(e) => setFn(f.id, { endTime: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Venue (optional)">
                      <Input value={f.venue} placeholder="Hall, home or hotel" onChange={(e) => setFn(f.id, { venue: e.target.value })} maxLength={200} />
                    </Field>
                    {f.eventDate ? <AvailabilityNote date={f.eventDate} refreshKey={refreshKey} /> : null}
                  </div>
                );
              })}
              {overlaps.length ? (
                <p className="flex items-start gap-2 text-xs text-amber-300" role="status">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {overlaps
                    .map(([a, b]) => `${WEDDING_FUNCTIONS[a.type].label} and ${WEDDING_FUNCTIONS[b.type].label} overlap on ${a.eventDate}`)
                    .join(" · ")}
                  . Our team needs setup and travel time between functions.
                </p>
              ) : null}
              {errors.functions ? <p className="text-[11px] text-red-400">{errors.functions}</p> : null}
            </fieldset>
          )}

          {d.step === 2 && (
            <>
              <Field label="Venue, city and location" error={errors.city}>
                <Input value={d.city} placeholder="e.g. Pearl Continental, Lahore" maxLength={300} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Approximate coverage times (optional)" hint="Anything beyond the times listed for each function.">
                <Textarea value={d.coverage} maxLength={2000} placeholder="e.g. Bride getting ready from 12:00 on Baraat day" onChange={(e) => set("coverage", e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Photography">
                  <Textarea value={d.photography} maxLength={600} placeholder="Album, candid, portraits…" onChange={(e) => set("photography", e.target.value)} />
                </Field>
                <Field label="Videography">
                  <Textarea value={d.videography} maxLength={600} placeholder="Highlight film, full film, reels…" onChange={(e) => set("videography", e.target.value)} />
                </Field>
                <Field label="Editing">
                  <Textarea value={d.editing} maxLength={600} placeholder="Music, length, colour style…" onChange={(e) => set("editing", e.target.value)} />
                </Field>
              </div>
              <Field label="Special instructions (optional)">
                <Textarea value={d.references} maxLength={2000} placeholder="Family requests, reference films, timings to note" onChange={(e) => set("references", e.target.value)} />
              </Field>
              {pkg?.custom ? (
                <BudgetSuggestions value={d.budgetTier} onChange={(t) => set("budgetTier", t)} compact />
              ) : null}
              <Field
                label={pkg?.custom ? "Your own budget or notes (optional)" : "Budget or custom-deal request (optional)"}
                hint={
                  pkg?.custom && d.budgetTier
                    ? `Sent together with “${budgetTierText(d.budgetTier)}”. Add a different amount or details here.`
                    : "This is shared with ZH Films; it doesn't change the advertised price."
                }
              >
                <Input value={d.budget} maxLength={300} placeholder="e.g. Around PKR 130,000 for three functions" onChange={(e) => set("budget", e.target.value)} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={d.customDeal} onChange={(e) => set("customDeal", e.target.checked)} className="accent-[#c8a96a]" />
                I&apos;d like to discuss a custom deal
              </label>
            </>
          )}

          {d.step === 3 && (
            <>
              <Field label="Your name" error={errors.names}>
                <Input value={d.names} autoComplete="name" maxLength={120} onChange={(e) => set("names", e.target.value)} />
              </Field>
              <Field label="WhatsApp number" error={errors.phone}>
                <Input value={d.phone} type="tel" autoComplete="tel" placeholder="+92 3xx xxxxxxx" maxLength={30} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Email (optional)" error={errors.email} hint="Add it to get your status link and updates by email.">
                <Input value={d.email} type="email" autoComplete="email" maxLength={200} onChange={(e) => set("email", e.target.value)} />
              </Field>
            </>
          )}

          {submitError ? (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-between gap-3 pt-2">
            <Button type="button" variant="outline" disabled={d.step === 0} onClick={() => set("step", Math.max(0, d.step - 1))}>
              Back
            </Button>
            {d.step < STEPS.length - 1 ? (
              <Button type="submit">Continue</Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => void send(true)}>
                  <MessageCircle /> Send &amp; discuss on WhatsApp
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Send booking request"}
                </Button>
              </div>
            )}
          </div>
          {d.step === STEPS.length - 1 ? (
            <p className="text-[11px] text-zinc-500">
              Both buttons save your request first. WhatsApp is for talking it through — it does not book or confirm a date.
            </p>
          ) : null}
        </form>

        <aside className="h-fit space-y-3 rounded-2xl border border-zh-gold/25 bg-black/60 p-5 lg:sticky lg:top-28" aria-label="Estimate">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zh-gold/80">Your selection</p>
          {pkg ? (
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-zinc-300">{pkg.name}</span>
              <span className="text-right text-white">
                {pkg.custom && pkg.price === 0 ? "—" : formatPkr(pkg.price)}
                {pkg.listPrice != null ? <s className="block text-[11px] text-zinc-500">{formatPkr(pkg.listPrice)}</s> : null}
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No package selected</p>
          )}
          {priced?.addons.map((a) => (
            <div key={a.id} className="flex justify-between gap-3 text-sm">
              <span className="text-zinc-400">+ {a.name}</span>
              <span className="text-white">{formatPkr(a.price)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
            <span className="text-sm text-zinc-300">Estimated total</span>
            <span className="text-lg font-semibold text-zh-gold" data-testid="estimated-total">
              {pkg?.custom && !priced?.total ? "Quote on request" : formatPkr(priced?.total ?? 0)}
            </span>
          </div>
          {pkg?.listPrice != null ? (
            <p className="text-xs text-emerald-300">
              {pkg.saleLabel || "Discount"}: you save {formatPkr(pkg.listPrice - pkg.price)}
            </p>
          ) : null}
          {pkg?.custom && d.budgetTier ? (
            <p className="text-xs text-zh-gold/90">{budgetTierText(d.budgetTier)}</p>
          ) : null}
          {d.functions.length ? (
            <ul className="space-y-1 border-t border-white/10 pt-3 text-xs text-zinc-400">
              {[...d.functions]
                .sort((x, y) => `${x.eventDate || "9"}${x.startTime}`.localeCompare(`${y.eventDate || "9"}${y.startTime}`))
                .map((f, i) => (
                  <li key={f.id || i}>
                    {WEDDING_FUNCTIONS[f.type].label}: {f.eventDate || "date?"} {f.startTime}–{f.endTime}
                    {f.venue ? ` · ${f.venue}` : ""}
                  </li>
                ))}
            </ul>
          ) : null}
          <p className="text-[11px] leading-relaxed text-zinc-500">
            The advertised package price and add-ons are an estimate. Any additional costs or negotiated discounts need
            approval from ZH Films and are confirmed in your final quote.
          </p>
        </aside>
        <NeedHelp context={pkg ? pkg.name : "wedding booking"} className="lg:col-start-2" />
      </div>
    </div>
  );
}

function Inclusions({ pkg }: { pkg: PublicCatalog["packages"][number] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
      {pkg.description ? <p className="mb-3 text-zinc-300">{pkg.description}</p> : null}
      {pkg.custom ? (
        <p className="text-zinc-400">
          Choose the add-ons you want below and describe your functions in the next steps. ZH Films reviews your selection
          and sends a final quote.
        </p>
      ) : pkg.inclusions.length ? (
        <ul className="space-y-1.5">
          {pkg.inclusions.map((x) => (
            <li key={x} className="flex gap-2 text-zinc-200">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-zh-gold" /> {x}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-400">
          The exact inclusions for this package are being finalised by ZH Films. Ask on WhatsApp or note what you need in
          the details step.
        </p>
      )}
      {pkg.exclusions.length ? (
        <p className="mt-3 text-xs text-zinc-500">Not included: {pkg.exclusions.join(" · ")}</p>
      ) : null}
    </div>
  );
}

function BudgetSuggestions({ value, onChange, compact = false }: { value: BudgetTier | ""; onChange: (t: BudgetTier | "") => void; compact?: boolean }) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-zh-gold/20 bg-gradient-to-b from-zh-gold/[0.06] to-transparent p-4 sm:p-5">
      <legend className="px-1 text-[11px] uppercase tracking-[0.22em] text-zh-gold/90">Suggested budgets</legend>
      {!compact ? (
        <p className="text-xs text-zinc-400">
          Pick a starting point, then choose your functions and requirements. These are guides to help us plan — not a fixed
          price or a final quote.
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Suggested budget">
        {BUDGET_TIER_KEYS.map((t) => {
          const tier = BUDGET_TIERS[t];
          const on = value === t;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={on}
              data-tier={t}
              onClick={() => onChange(on ? "" : t)}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                on ? "border-zh-gold bg-zh-gold/10 shadow-[0_0_30px_rgba(200,169,106,0.12)]" : "border-white/10 bg-black/40 hover:border-white/30"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-400">{tier.label}</span>
                {on ? <Check className="h-4 w-4 text-zh-gold" /> : null}
              </span>
              <span className="mt-1 block font-serif text-lg text-white">{tier.amount}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-500">
        {value ? `${BUDGET_TIERS[value].label} selected — tap it again to clear. ` : ""}ZH Films reviews your selection and sends
        the final quote.
      </p>
    </fieldset>
  );
}
