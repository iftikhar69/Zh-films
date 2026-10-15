"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSoundscape } from "@/hooks/useSoundscape";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BOOKING_WINDOW, SERVICES, SERVICE_TYPES, todayIn, type ServiceType } from "@/lib/booking-rules";

const steps = ["Scene", "Lens", "Lock"] as const;
const DRAFT_KEY = "zh-booking-draft";

const bookingSchema = z.object({
  names: z.string().min(2, "Add both names"),
  city: z.string().min(2, "Location is required"),
  serviceType: z.enum(SERVICE_TYPES, { errorMap: () => ({ message: "Choose a service" }) }),
  eventDate: z.string().min(4, "Pick a date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick an end time"),
  coverage: z.string().min(3, "Coverage is required"),
  deliverables: z.string().min(3, "Deliverables are required"),
  references: z.string().optional().default(""),
  email: z.string().email("Valid email required"),
  phone: z.string().min(6, "Phone/WhatsApp required")
});
type BookingValues = z.infer<typeof bookingSchema>;

type ConfirmPayload = {
  confirmationMessage: string;
  note: string;
  booking: { confirmationCode: string; eventDate: string; names: string };
  sameDayBookings: number;
};

export function BookExperience() {
  const [step, setStep] = useState(0);
  const [datePulse, setDatePulse] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmPayload | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const idempotencyKey = useRef<string | null>(null);
  const { shutter, filmWind, applause } = useSoundscape();
  const {
    register,
    trigger,
    watch,
    formState: { errors },
    getValues,
    setValue,
    setError,
    reset
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      names: "",
      city: "",
      serviceType: "wedding",
      eventDate: "",
      startTime: SERVICES.wedding.defaultStart,
      endTime: SERVICES.wedding.defaultEnd,
      coverage: "",
      deliverables: "",
      references: "",
      email: "",
      phone: ""
    },
    mode: "onTouched"
  });

  const eventDate = watch("eventDate");
  const [{ minDate, maxDate }] = useState(() => {
    const today = todayIn();
    const shift = (days: number) => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    return { minDate: shift(BOOKING_WINDOW.minLeadDays), maxDate: shift(BOOKING_WINDOW.maxAdvanceDays) };
  });

  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as
        | { values: Partial<BookingValues>; step: number }
        | null;
      if (draft) {
        for (const [k, v] of Object.entries(draft.values)) {
          if (typeof v === "string") setValue(k as keyof BookingValues, v);
        }
        setStep(Math.min(Math.max(draft.step, 0), steps.length - 1));
      }
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
    const params = new URLSearchParams(window.location.search);
    const refs = params.get("references");
    if (refs) setValue("references", refs.slice(0, 500));
    const service = params.get("service");
    if (service && service in SERVICES) {
      setValue("serviceType", service as ServiceType);
      setValue("startTime", SERVICES[service as ServiceType].defaultStart);
      setValue("endTime", SERVICES[service as ServiceType].defaultEnd);
    } else if (service && !getValues("coverage")) setValue("coverage", service.slice(0, 120));
  }, [setValue, getValues]);

  useEffect(() => {
    const sub = watch((values) => {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values, step }));
    });
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values: getValues(), step }));
    return () => sub.unsubscribe();
  }, [watch, getValues, step]);

  useEffect(() => {
    if (!eventDate) {
      setDatePulse(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/bookings?date=${encodeURIComponent(eventDate)}`);
      const data = (await res.json()) as { message?: string };
      if (!cancelled) setDatePulse(data.message ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventDate, refreshKey]);

  const fieldsForStep = useMemo(() => {
    if (step === 0) return ["names", "serviceType", "city", "eventDate", "startTime", "endTime"] as const;
    if (step === 1) return ["coverage", "deliverables", "references"] as const;
    return ["email", "phone"] as const;
  }, [step]);

  if (confirm) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
        <div className="relative overflow-hidden rounded-3xl border border-zh-gold/40 bg-gradient-to-b from-zinc-950 via-black to-black p-8 shadow-[0_0_80px_rgba(200,169,106,0.15)]">
          <p className="text-[10px] uppercase tracking-[0.45em] text-zh-gold">Request received · awaiting confirmation</p>
          <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Your time is on hold</h1>
          <p className="mt-2 font-mono text-sm text-zh-gold">{confirm.booking.confirmationCode}</p>
          <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/50 p-5 font-sans text-sm leading-relaxed text-zinc-300">
            {confirm.confirmationMessage}
          </pre>
          <p className="mt-4 text-sm text-zh-gold/90">{confirm.note}</p>
          <p className="mt-4 text-xs text-zinc-400">
            Track this booking under{" "}
            <Link href="/account" className="text-zh-gold underline-offset-4 hover:underline">
              your account
            </Link>{" "}
            by signing in with the same email address.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => {
                setConfirm(null);
                sessionStorage.removeItem(DRAFT_KEY);
                reset();
                setStep(0);
                shutter();
              }}
            >
              Book another date
            </Button>
            <Button type="button" variant="cinematic" asChild>
              <a href="/hire">Meet the Film Family</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Booking suite · Film Family</p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Book Your Film</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Choose your service, date and time. You will see straight away whether the time is open; a producer then
          confirms your booking with you.
        </p>
      </header>

      <div className="mb-8 flex gap-2">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setStep(i);
              shutter();
            }}
            className={`flex-1 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.25em] transition ${
              i === step ? "border-zh-gold/70 bg-zh-gold text-black" : "border-white/10 text-zinc-400 hover:border-zh-gold/40"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <form
        className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (step < steps.length - 1) {
            const ok = await trigger(fieldsForStep as unknown as (keyof BookingValues)[], { shouldFocus: true });
            if (!ok) return;
            setStep((s) => s + 1);
            filmWind();
            return;
          }
          const ok = await trigger(undefined, { shouldFocus: true });
          if (!ok || inFlight.current) return;
          inFlight.current = true;
          idempotencyKey.current ??= crypto.randomUUID();
          setSubmitting(true);
          setSubmitError(null);
          try {
            const res = await fetch("/api/bookings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...getValues(), idempotencyKey: idempotencyKey.current })
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 409 || (res.status === 400 && data.field && data.field in getValues())) {
              const field = (data.field ?? "startTime") as keyof BookingValues;
              setError(field, { message: data.error });
              setStep(0);
              if (res.status === 409) {
                idempotencyKey.current = null;
                setDatePulse(null);
                setRefreshKey((k) => k + 1);
              }
              throw new Error(
                res.status === 409 ? "That time was just taken. Choose another time or date on step 1." : data.error
              );
            }
            if (!res.ok || !data.ok) throw new Error(data.error || "Booking failed");
            applause();
            sessionStorage.removeItem(DRAFT_KEY);
            idempotencyKey.current = null;
            setConfirm(data as ConfirmPayload);
          } catch (err) {
            setSubmitError(
              err instanceof TypeError
                ? "You appear to be offline. Your details are saved — try again when you're connected."
                : err instanceof Error
                  ? err.message
                  : "Could not send your booking. Please try again."
            );
          } finally {
            inFlight.current = false;
            setSubmitting(false);
          }
        }}
      >
        {step === 0 && (
          <>
            <Field label="Names" placeholder="Noor & Ali" error={errors.names?.message} {...register("names")} />
            <label className="block space-y-2 text-xs uppercase tracking-[0.22em] text-zinc-400">
              <span>Service</span>
              <select
                className="h-10 w-full rounded-md border border-white/10 bg-black/60 px-3 text-sm normal-case tracking-normal text-zinc-100"
                {...register("serviceType", {
                  onChange: (e) => {
                    const svc = SERVICES[e.target.value as ServiceType];
                    if (svc) {
                      setValue("startTime", svc.defaultStart);
                      setValue("endTime", svc.defaultEnd);
                    }
                  }
                })}
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SERVICES[t].label}
                  </option>
                ))}
              </select>
              {errors.serviceType ? (
                <span className="text-[11px] normal-case tracking-normal text-red-400">{errors.serviceType.message}</span>
              ) : null}
            </label>
            <Field
              label="Event location (city / venue)"
              placeholder="Karimabad, Hunza"
              error={errors.city?.message}
              {...register("city")}
            />
            <Field
              label="Event date"
              type="date"
              min={minDate}
              max={maxDate}
              error={errors.eventDate?.message}
              {...register("eventDate")}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time" type="time" step={900} error={errors.startTime?.message} {...register("startTime")} />
              <Field label="End time" type="time" step={900} error={errors.endTime?.message} {...register("endTime")} />
            </div>
            <p className="-mt-1 text-[11px] text-zinc-500">
              Pakistan time. If it runs past midnight, enter the end time on the next day (e.g. 20:00 → 02:00). Book
              at least {BOOKING_WINDOW.minLeadDays} days and up to 2 years ahead.
            </p>
            {datePulse ? (
              <div className="zh-callsheet rounded-xl border border-zh-gold/35 bg-zh-gold/10 px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-zh-gold/80">Availability on this date</p>
                <p className="mt-2 text-sm normal-case tracking-normal text-zh-gold">{datePulse}</p>
              </div>
            ) : null}
          </>
        )}
        {step === 1 && (
          <>
            <Field label="Coverage" placeholder="Full wedding weekend + pre-events" error={errors.coverage?.message} {...register("coverage")} />
            <Field label="Deliverables" placeholder="Feature film + vertical reels" error={errors.deliverables?.message} {...register("deliverables")} />
            <Field label="Reference films" placeholder="Links or moods you love" error={errors.references?.message} {...register("references")} />
          </>
        )}
        {step === 2 && (
          <>
            <Field label="Email" type="email" placeholder="you@email.com" error={errors.email?.message} {...register("email")} />
            <Field label="Phone / WhatsApp" placeholder="+92 …" error={errors.phone?.message} {...register("phone")} />
            <div className="text-xs text-zinc-500">
              Sending this request holds your time for 48 hours while a producer reviews it. It becomes a confirmed booking only after we confirm with you.
            </div>
          </>
        )}

        {submitError ? (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {submitError}
          </p>
        ) : null}

        <div className="flex justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => {
              setStep((s) => Math.max(0, s - 1));
              shutter();
            }}
          >
            Previous
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : step === steps.length - 1 ? "Send booking request" : "Next scene"}
          </Button>
        </div>
      </form>
      <p className="mt-4 text-xs text-zinc-500">
        No account needed to book. Want to track status and payments?{" "}
        <Link href="/sign-in?redirect_url=%2Fbook" className="text-zh-gold underline-offset-4 hover:underline">
          Sign in
        </Link>{" "}
        — your details are kept and you will come straight back here.
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  ...props
}: { label: string; error?: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className="block space-y-2 text-xs uppercase tracking-[0.22em] text-zinc-400">
      <span>{label}</span>
      <Input {...props} />
      {error ? <span className="text-[11px] normal-case tracking-normal text-red-400">{error}</span> : null}
    </label>
  );
}
