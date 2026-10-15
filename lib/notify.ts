import type { Booking, Payment } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { getSettings, ownerEmails } from "@/lib/settings";
import { BOOKING_TIMEZONE, SERVICES } from "@/lib/booking-rules";

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
  const service = SERVICES[b.serviceType as keyof typeof SERVICES]?.label ?? b.serviceType;
  return [
    `Reference: ${b.confirmationCode}`,
    `Service: ${service}`,
    `Date: ${b.eventDate}${b.startTime && b.endTime ? `, ${b.startTime}–${b.endTime} (Pakistan time)` : ""}`,
    `Location: ${b.city}`
  ].join("\n");
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
      text: `Hi ${b.names},\n\nThank you — we have received your request.\n\n${summary(b)}\n\n${NOT_RESERVED}\n\nWe usually reply within 24 hours. Track your request here:\n${customerLink(b)}\n\n— ZH Films`
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
        text: `A new booking request is waiting for review.\n\n${summary(b)}\nClient: ${b.names}\nEmail: ${b.email}\nPhone: ${b.phone}\nCoverage: ${b.coverage}\nDeliverables: ${b.deliverables}\n\nReview and check availability:\n${adminLink(b)}`
      })
    );
  }
  return Promise.all(jobs);
}

export async function notifyStatusChange(b: Booking, status: string, reason?: string) {
  const subjects: Record<string, string> = {
    confirmed: `Your booking is confirmed · ${b.confirmationCode}`,
    declined: `Update on your booking request · ${b.confirmationCode}`,
    cancelled: `Your booking has been cancelled · ${b.confirmationCode}`
  };
  const bodies: Record<string, string> = {
    confirmed: `Great news — we have confirmed your booking. Your date and time are now reserved with ZH Films.\n\n${summary(b)}${
      b.advanceAmount ? `\n\nAdvance: ${formatPkr(b.advanceAmount)} — payment details are on your booking page.` : ""
    }`,
    declined: `We are sorry — we are not able to take this booking.\n\n${summary(b)}${
      reason ? `\n\nNote from ZH Films: ${reason}` : ""
    }\n\nIf you have another date in mind, we would love to hear from you.`,
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
