import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomerBooking } from "@/lib/booking-access";
import { getSettings } from "@/lib/settings";
import { SERVICES } from "@/lib/booking-rules";
import { bookingStatusLabel, isHeld, paymentStatusLabel } from "@/lib/booking-status";
import { formatInstant, formatPkr } from "@/lib/notify";
import { PaymentSubmitForm } from "@/components/booking/PaymentSubmitForm";
import { CancelRequestForm } from "@/components/booking/CancelRequestForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

export default async function CustomerBookingPage({
  params,
  searchParams
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ code }, { t }] = await Promise.all([params, searchParams]);
  const booking = await getCustomerBooking(code.toUpperCase(), t);
  if (!booking) notFound();

  const [settings, payments] = await Promise.all([
    getSettings(),
    prisma.payment.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, method: true, reference: true, status: true, createdAt: true, rejectionReason: true }
    })
  ]);
  const now = new Date();
  const held = isHeld(booking, now);
  const service = SERVICES[booking.serviceType as keyof typeof SERVICES]?.label ?? booking.serviceType;
  const methods = (["easypaisa", "bank"] as const).filter((m) => settings.payments[m].enabled);
  const verified = payments.filter((p) => p.status === "verified").reduce((n, p) => n + p.amount, 0);
  const remaining = Math.max(0, (booking.advanceAmount ?? 0) - verified);
  const showPayment =
    (booking.status === "pending" || booking.status === "confirmed") &&
    !!booking.advanceAmount &&
    (booking.paymentStatus === "awaiting" || booking.paymentStatus === "submitted");

  const headline =
    booking.status === "confirmed"
      ? "Your booking is confirmed"
      : booking.status === "completed"
        ? "Thank you for filming with us"
        : booking.status === "pending"
          ? held
            ? "Your time is temporarily held"
            : "Your request is with us"
          : bookingStatusLabel(booking.status);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <header>
        <p className="text-[10px] uppercase tracking-[0.4em] text-zh-gold/80">Booking {booking.confirmationCode}</p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">{headline}</h1>
        <p className="mt-3 text-sm text-zinc-400">
          {booking.status === "pending"
            ? held && booking.holdExpiresAt
              ? `We're holding this time for you until ${formatInstant(booking.holdExpiresAt)} while we finalise details. It is not confirmed yet.`
              : "This is a request, not a reservation. Your date is locked only after your advance is received and ZH Films confirms it."
            : booking.status === "confirmed"
              ? "Your date and time are reserved with ZH Films."
              : booking.status === "declined"
                ? "We're sorry we couldn't take this booking. Get in touch if another date works for you."
                : booking.status === "cancelled"
                  ? "This booking was cancelled and the time is no longer reserved."
                  : null}
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-5 text-sm sm:grid-cols-2">
        <Item label="Service">{service}</Item>
        <Item label="Date">{booking.eventDate}</Item>
        <Item label="Time">{booking.startTime ? `${booking.startTime}–${booking.endTime} (Pakistan time)` : "To be agreed"}</Item>
        <Item label="Location">{booking.city}</Item>
        <Item label="Status">{bookingStatusLabel(booking.status)}</Item>
        <Item label="Payment">{paymentStatusLabel(booking.paymentStatus)}</Item>
        {booking.quotedAmount != null ? <Item label="Agreed total">{formatPkr(booking.quotedAmount)}</Item> : null}
        {booking.advanceAmount ? <Item label="Advance required">{formatPkr(booking.advanceAmount)}</Item> : null}
      </section>

      {showPayment ? (
        <section className="space-y-5 rounded-2xl border border-zh-gold/30 bg-black/60 p-5 sm:p-6">
          <div>
            <h2 className="font-serif text-xl text-white">Pay your advance</h2>
            <p className="mt-1 text-sm text-zinc-400">{settings.advance.note}</p>
            {booking.status === "pending" ? (
              <p className="mt-2 text-xs text-amber-200">Paying an advance doesn&apos;t reserve the date by itself — we confirm your booking separately.</p>
            ) : null}
          </div>
          {methods.length === 0 ? (
            <p className="text-sm text-zinc-400">Payment details will be shared with you directly by ZH Films.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {settings.payments.easypaisa.enabled ? (
                  <div className="rounded-xl border border-white/10 p-4 text-sm">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zh-gold">Easypaisa</p>
                    <p className="mt-2 text-white">{settings.payments.easypaisa.accountTitle}</p>
                    <p className="font-mono text-zinc-200">{settings.payments.easypaisa.accountNumber}</p>
                    {settings.payments.easypaisa.instructions ? <p className="mt-2 text-xs text-zinc-400">{settings.payments.easypaisa.instructions}</p> : null}
                  </div>
                ) : null}
                {settings.payments.bank.enabled ? (
                  <div className="rounded-xl border border-white/10 p-4 text-sm">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zh-gold">Bank transfer</p>
                    <p className="mt-2 text-white">{settings.payments.bank.bankName}</p>
                    <p className="text-zinc-200">{settings.payments.bank.accountTitle}</p>
                    <p className="font-mono text-zinc-200">{settings.payments.bank.accountNumber}</p>
                    {settings.payments.bank.iban ? <p className="font-mono text-xs text-zinc-400">IBAN {settings.payments.bank.iban}</p> : null}
                    {settings.payments.bank.instructions ? <p className="mt-2 text-xs text-zinc-400">{settings.payments.bank.instructions}</p> : null}
                  </div>
                ) : null}
              </div>
              <p className="text-sm text-zinc-300">
                Amount to send: <span className="text-zh-gold">{formatPkr(remaining || booking.advanceAmount)}</span>. Use{" "}
                <span className="font-mono text-zh-gold">{booking.confirmationCode}</span> as the payment note if you can.
              </p>
              <PaymentSubmitForm code={booking.confirmationCode} token={t} methods={[...methods]} suggestedAmount={remaining || booking.advanceAmount!} />
            </>
          )}
        </section>
      ) : null}

      {payments.length ? (
        <section className="space-y-2">
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Your payments</h2>
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="rounded-xl border border-white/10 p-3 text-sm">
                <span className="text-white">{formatPkr(p.amount)}</span>{" "}
                <span className="text-zinc-500">· {p.method} · ref {p.reference} · {formatInstant(p.createdAt)}</span>
                <p className={p.status === "verified" ? "text-emerald-300" : p.status === "rejected" ? "text-red-300" : "text-orange-300"}>
                  {p.status === "verified" ? "Verified — received in our account" : p.status === "rejected" ? `Not verified${p.rejectionReason ? ` — ${p.rejectionReason}` : ""}` : "Awaiting verification"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {booking.status === "pending" ? (
        <section className="space-y-2">
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Changed your plans?</h2>
          {booking.paymentStatus === "submitted" || booking.paymentStatus === "paid" ? (
            <p className="text-xs text-amber-200">You&apos;ve sent a payment. After cancelling, contact ZH Films about your refund.</p>
          ) : null}
          <CancelRequestForm code={booking.confirmationCode} token={t} />
        </section>
      ) : booking.status === "confirmed" ? (
        <p className="text-xs text-zinc-500">To change or cancel a confirmed booking, please contact ZH Films directly.</p>
      ) : null}

      <section className="space-y-2 text-xs text-zinc-500">
        <p>{settings.policies.booking}</p>
        <p>{settings.policies.cancellation}</p>
      </section>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{label}</p>
      <p className="mt-1 text-zinc-100">{children}</p>
    </div>
  );
}
