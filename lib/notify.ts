import type { Booking, Payment } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { getSettings, ownerEmails } from "@/lib/settings";
import { BOOKING_TIMEZONE, SERVICES } from "@/lib/booking-rules";
import { EVENT_TYPES, WEDDING_FUNCTIONS } from "@/lib/enquiry";
import { prisma } from "@/lib/prisma";

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4317").replace(/\/$/, "");

export function customerLink(b: Pick<Booking, "confirmationCode" | "accessToken">) {
  return `${SITE()}/booking/${b.confirmationCode}${b.accessToken ? `?t=${b.accessToken}` : ""}`;
}

export function adminLink(b: Pick<Booking, "id">) {
  return `${SITE()}/admin/bookings/${b.id}`;
}

export function formatPkr(n: number | null | undefined) {
  return n == null ? "—" : `PKR ${n.toLocaleString("en-PK")}`;
}

export function formatInstant(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: BOOKING_TIMEZONE, dateStyle: "medium", timeStyle: "short" }).format(d);
}

function summary(b: Booking) {
  const service =
    b.packageName ??
    (b.eventType ? EVENT_TYPES[b.eventType as keyof typeof EVENT_TYPES]?.label : null) ??
    SERVICES[b.serviceType as keyof typeof SERVICES]?.label ??
    b.serviceType;
  return [
    `Reference: ${b.confirmationCode}`,
    `Service: ${service}`,
    b.estimatedTotal != null ? `Estimate (before ZH Films approval): ${formatPkr(b.estimatedTotal)}` : null,
    `Date: ${b.eventDate}${b.startTime && b.endTime ? `, ${b.startTime}–${b.endTime} (Pakistan time)` : ""}`,
    `Location: ${b.city}`
  ]
    .filter(Boolean)
    .join("\n");
}

async function functionLines(b: Booking) {
  const fns = await prisma.bookingFunction.findMany({ where: { bookingId: b.id }, orderBy: { sortOrder: "asc" } });
  if (fns.length < 2) return "";
  return `\nFunctions:\n${fns
    .map((f) => `• ${WEDDING_FUNCTIONS[f.type as keyof typeof WEDDING_FUNCTIONS]?.label ?? f.type} — ${f.eventDate} ${f.startTime}–${f.endTime}${f.venue ? ` @ ${f.venue}` : ""}`)
    .join("\n")}`;
}

const NOT_RESERVED = "Please note: this is a request, not a reservation. Your date is reserved only once we confirm it with you.";

export async function notifyNewRequest(b: Booking) {
  const settings = await getSettings();
  const owner = await ownerEmails(settings);
  const jobs = [
    sendEmail({
      kind: "customer_ack",
      dedupeKey: `customer_ack:${b.id}`,
      bookingId: b.id,
      to: b.email,
      subject: `We received your booking request · ${b.confirmationCode}`,
      text: `Hi ${b.names},\n\nThanks for reaching out to ZH Films. We've received your request. We'll check the date and details and let you know if we can confirm your booking.\n\n${summary(b)}\n\n${NOT_RESERVED}\n\nTrack your request here:\n${customerLink(b)}\n\n— ZH Films`
    })
  ];
  if (settings.notifications.onNewRequest && owner.length) {
    jobs.push(
      sendEmail({
        kind: "owner_new_request",
        dedupeKey: `owner_new_request:${b.id}`,
        bookingId: b.id,
        to: owner,
        subject: `New booking request · ${b.names} · ${b.eventDate}`,
        text: `A new booking request is waiting for review.${b.whatsappRequested ? " The customer is also continuing on WhatsApp." : ""}\n\n${summary(b)}${await functionLines(b)}${b.budget ? `\nBudget / deal request: ${b.budget}` : ""}\nClient: ${b.names}\nEmail: ${b.email || "not given"}\nPhone: ${b.phone}\nCoverage: ${b.coverage}\nDeliverables: ${b.deliverables}\n\nReview and check availability:\n${adminLink(b)}`
      })
    );
  }
  return Promise.all(jobs);
}

export async function notifyStatusChange(b: Booking, status: string, reason?: string) {
  const subjects: Record<string, string> = {
    confirmed: `Your booking is confirmed · ${b.confirmationCode}`,
    declined: `We can't take your booking request · ${b.confirmationCode}`,
    cancelled: `Your booking has been cancelled · ${b.confirmationCode}`
  };
  const bodies: Record<string, string> = {
    confirmed: `Good news: we've confirmed your booking. Your date and time are now reserved with ZH Films.\n\n${summary(b)}${
      b.advanceAmount && b.paymentStatus !== "paid"
        ? `\n\nAdvance: ${formatPkr(b.advanceAmount)}. We haven't received this payment yet. Payment details are on your booking page.`
        : ""
    }`,
    declined: `Thank you for thinking of us. Unfortunately we can't take this booking.\n\n${summary(b)}${
      reason ? `\n\nNote from ZH Films: ${reason}` : ""
    }\n\nIf another date works for you, we'd be glad to hear from you.`,
    cancelled: `Your booking has been cancelled and the time is no longer reserved.\n\n${summary(b)}${
      reason ? `\n\nNote from ZH Films: ${reason}` : ""
    }`
  };
  if (!subjects[status]) return null;
  return sendEmail({
    kind: `customer_${status}`,
    dedupeKey: `customer_${status}:${b.id}`,
    bookingId: b.id,
    to: b.email,
    subject: subjects[status],
    text: `Hi ${b.names},\n\n${bodies[status]}\n\nView your booking:\n${customerLink(b)}\n\n— ZH Films`
  });
}

export async function notifyHoldPlaced(b: Booking) {
  if (!b.holdExpiresAt) return null;
  return sendEmail({
    kind: "customer_hold",
    dedupeKey: `customer_hold:${b.id}:${b.holdExpiresAt.toISOString()}`,
    bookingId: b.id,
    to: b.email,
    subject: `We're holding your time until ${formatInstant(b.holdExpiresAt)}`,
    text: `Hi ${b.names},\n\nWhile we finalise the details with you, we have placed a temporary hold on your requested time until ${formatInstant(
      b.holdExpiresAt
    )} (Pakistan time).\n\n${summary(b)}\n\nThis hold is not a confirmed booking. If we have not confirmed by then, the time may be offered to other clients.\n\n${customerLink(b)}\n\n— ZH Films`
  });
}

export async function notifyAdvanceRequested(b: Booking) {
  return sendEmail({
    kind: "customer_advance_requested",
    dedupeKey: `customer_advance_requested:${b.id}:${b.advanceAmount}`,
    bookingId: b.id,
    to: b.email,
    subject: `Your quote and advance details · ${b.confirmationCode}`,
    text: `Hi ${b.names},\n\nHere are the details we agreed:\n\nTotal: ${formatPkr(b.quotedAmount)}\nAdvance required: ${formatPkr(
      b.advanceAmount
    )}\n\n${summary(b)}\n\nPayment instructions (Easypaisa / bank transfer) are on your booking page, where you can also submit your transaction reference:\n${customerLink(
      b
    )}\n\nWe never ask for your PIN, password or OTP.\n\n— ZH Films`
  });
}

export async function notifyPaymentSubmitted(b: Booking, p: Payment) {
  const settings = await getSettings();
  const owner = await ownerEmails(settings);
  if (!settings.notifications.onPaymentSubmitted || !owner.length) return null;
  return sendEmail({
    kind: "owner_payment_submitted",
    dedupeKey: `owner_payment_submitted:${p.id}`,
    bookingId: b.id,
    to: owner,
    subject: `Payment submitted — please verify · ${b.confirmationCode}`,
    text: `${b.names} reported a payment. It is NOT verified until you check your ${
      p.method === "easypaisa" ? "Easypaisa account" : "bank statement"
    }.\n\nAmount: ${formatPkr(p.amount)}\nMethod: ${p.method}\nReference: ${p.reference}\nReceipt: ${p.receiptPath ? "uploaded" : "none"}\n\nVerify or reject:\n${adminLink(b)}`
  });
}

export async function notifyCustomerCancelled(b: Booking, message: string) {
  const settings = await getSettings();
  const owner = await ownerEmails(settings);
  const jobs = [
    sendEmail({
      kind: "customer_cancelled_self",
      dedupeKey: `customer_cancelled_self:${b.id}`,
      bookingId: b.id,
      to: b.email,
      subject: `You cancelled your request · ${b.confirmationCode}`,
      text: `Hi ${b.names},\n\nYour request has been cancelled as you asked.\n\n${summary(b)}\n\nIf this was a mistake, send us a new request any time.\n\n— ZH Films`
    })
  ];
  if (owner.length) {
    jobs.push(
      sendEmail({
        kind: "owner_customer_cancelled",
        dedupeKey: `owner_customer_cancelled:${b.id}`,
        bookingId: b.id,
        to: owner,
        subject: `Customer cancelled their request · ${b.confirmationCode}`,
        text: `${b.names} cancelled their request before it was confirmed.\n\n${summary(b)}\nPhone: ${b.phone}\n\nTheir message:\n${message}\n\n${adminLink(b)}`
      })
    );
  }
  return Promise.all(jobs);
}

export async function notifyPaymentDecision(b: Booking, p: Payment) {
  if (p.status === "verified") {
    return sendEmail({
      kind: "customer_payment_verified",
      dedupeKey: `customer_payment_verified:${p.id}`,
      bookingId: b.id,
      to: b.email,
      subject: `Payment received · ${b.confirmationCode}`,
      text: `Hi ${b.names},\n\nWe have verified your payment of ${formatPkr(p.amount)} (reference ${p.reference}) in our account. Thank you!\n\n${summary(b)}\n\n${customerLink(b)}\n\n— ZH Films`
    });
  }
  if (p.status === "rejected") {
    return sendEmail({
      kind: "customer_payment_rejected",
      dedupeKey: `customer_payment_rejected:${p.id}`,
      bookingId: b.id,
      to: b.email,
      subject: `We couldn't verify your payment · ${b.confirmationCode}`,
      text: `Hi ${b.names},\n\nWe could not find a payment matching reference ${p.reference} for ${formatPkr(p.amount)}.${
        p.rejectionReason ? `\n\nNote: ${p.rejectionReason}` : ""
      }\n\nPlease check the details and submit again, or reply to this email:\n${customerLink(b)}\n\n— ZH Films`
    });
  }
  return null;
}
