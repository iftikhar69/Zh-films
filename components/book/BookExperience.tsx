"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSoundscape } from "@/hooks/useSoundscape";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const steps = ["Scene", "Lens", "Lock"] as const;

const bookingSchema = z.object({
  names: z.string().min(2, "Add both names"),
  city: z.string().min(2, "City is required"),
  eventDate: z.string().min(4, "Pick a date"),
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
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmPayload | null>(null);
  const { shutter, filmWind, applause } = useSoundscape();
  const {
    register,
    trigger,
    watch,
    formState: { errors },
    getValues,
    reset
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      names: "",
      city: "Lahore",
      eventDate: "",
      coverage: "",
      deliverables: "",
      references: "",
      email: "",
      phone: ""
    },
    mode: "onTouched"
  });

  const eventDate = watch("eventDate");

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
  }, [eventDate]);

  const fieldsForStep = useMemo(() => {
    if (step === 0) return ["names", "city", "eventDate"] as const;
    if (step === 1) return ["coverage", "deliverables", "references"] as const;
    return ["email", "phone"] as const;
  }, [step]);

  if (confirm) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
        <div className="relative overflow-hidden rounded-3xl border border-zh-gold/40 bg-gradient-to-b from-zinc-950 via-black to-black p-8 shadow-[0_0_80px_rgba(200,169,106,0.15)]">
          <p className="text-[10px] uppercase tracking-[0.45em] text-zh-gold">Call sheet locked</p>
          <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Confirmation</h1>
          <p className="mt-2 font-mono text-sm text-zh-gold">{confirm.booking.confirmationCode}</p>
          <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/50 p-5 font-sans text-sm leading-relaxed text-zinc-300">
            {confirm.confirmationMessage}
          </pre>
          <p className="mt-4 text-sm text-zh-gold/90">{confirm.note}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => {
                setConfirm(null);
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
          Pick a date — you get an instant call-sheet confirmation. Days stay open for multiple clients; admin sees each request separately.
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
          if (!ok) return;
          setSubmitting(true);
          try {
            const v = getValues();
            const res = await fetch("/api/bookings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(v)
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || "Booking failed");
            applause();
            setConfirm(data as ConfirmPayload);
          } catch (err) {
            alert(err instanceof Error ? err.message : "Could not lock scene");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {step === 0 && (
          <>
            <Field label="Names" placeholder="Noor & Ali" error={errors.names?.message} {...register("names")} />
            <Field label="Event city" placeholder="Lahore" error={errors.city?.message} {...register("city")} />
            <Field
              label="Event date"
              type="date"
              error={errors.eventDate?.message}
              {...register("eventDate")}
            />
            {datePulse ? (
              <div className="zh-callsheet rounded-xl border border-zh-gold/35 bg-zh-gold/10 px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-zh-gold/80">Date stamp</p>
                <p className="mt-2 text-sm normal-case tracking-normal text-zh-gold">{datePulse}</p>
                <p className="mt-2 text-xs normal-case tracking-normal text-zinc-400">
                  Locking this day does not block it. Another couple can still book — admin sees each client on a separate card.
                </p>
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
              Locking this scene places a separate client card on the production board — even if another couple already chose the same day.
            </div>
          </>
        )}

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
            {submitting ? "Locking…" : step === steps.length - 1 ? "Lock the date" : "Next scene"}
          </Button>
        </div>
      </form>
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
