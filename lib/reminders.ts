import { prisma } from "@/lib/prisma";
import { sendEmail, type EmailResult } from "@/lib/email";
import { getSettings, ownerEmails } from "@/lib/settings";
import { adminLink, customerLink, formatInstant, formatPkr } from "@/lib/notify";

type Outcome = { kind: string; bookingId: string; result: EmailResult["status"] };

/**
 * Idempotent: every email has a dedupe key, so running this every 15 minutes (or twice by
 * accident) never sends the same reminder twice. Holds expire by time alone — this job only
 * tells people about it.
 */
export async function runReminders(now = new Date()) {
  const settings = await getSettings();
  const owner = await ownerEmails(settings);
  const out: Outcome[] = [];
  const pendingCutoff = new Date(now.getTime() - settings.notifications.pendingReminderHours * 3600000);

  const stale = await prisma.booking.findMany({
    where: { status: "pending", createdAt: { lte: pendingCutoff } },
    take: 200
  });
  for (const b of stale) {
    if (owner.length) {
      const r = await sendEmail({
        kind: "owner_pending_reminder",
        dedupeKey: `owner_pending_reminder:${b.id}`,
        bookingId: b.id,
        to: owner,
        subject: `Still pending: ${b.names} · ${b.eventDate}`,
        text: `This request has been waiting more than ${settings.notifications.pendingReminderHours} hours.\n\nReference: ${b.confirmationCode}\nClient: ${b.names} (${b.email}, ${b.phone})\nDate: ${b.eventDate} ${b.startTime ?? ""}–${b.endTime ?? ""}\n\nReview it: ${adminLink(b)}`
      });
      out.push({ kind: "owner_pending_reminder", bookingId: b.id, result: r.status });
    }
    const r = await sendEmail({
      kind: "customer_pending_update",
      dedupeKey: `customer_pending_update:${b.id}`,
      bookingId: b.id,
      to: b.email,
      subject: `We're still reviewing your request · ${b.confirmationCode}`,
      text: `Hi ${b.names},\n\nA quick update: we are still reviewing your request for ${b.eventDate}. It is not reserved yet — we will email you as soon as we confirm or if we need anything else.\n\n${customerLink(b)}\n\n— ZH Films`
    });
    out.push({ kind: "customer_pending_update", bookingId: b.id, result: r.status });
  }

  const expired = await prisma.booking.findMany({
    where: { status: "pending", holdExpiresAt: { lte: now } },
    take: 200
  });
  for (const b of expired) {
    const key = b.holdExpiresAt!.toISOString();
    const r1 = await sendEmail({
      kind: "customer_hold_expired",
      dedupeKey: `customer_hold_expired:${b.id}:${key}`,
      bookingId: b.id,
      to: b.email,
      subject: `Your temporary hold has ended · ${b.confirmationCode}`,
      text: `Hi ${b.names},\n\nThe temporary hold on ${b.eventDate} ended at ${formatInstant(b.holdExpiresAt!)}. Your request is still open, but the time is not reserved and may be offered to other clients. Reply to this email if you would like to go ahead.\n\n${customerLink(b)}\n\n— ZH Films`
    });
    out.push({ kind: "customer_hold_expired", bookingId: b.id, result: r1.status });
    if (owner.length) {
      const r2 = await sendEmail({
        kind: "owner_hold_expired",
        dedupeKey: `owner_hold_expired:${b.id}:${key}`,
        bookingId: b.id,
        to: owner,
        subject: `Hold expired: ${b.names} · ${b.eventDate}`,
        text: `The hold on ${b.confirmationCode} expired at ${formatInstant(b.holdExpiresAt!)}. The time is open again.\n\n${adminLink(b)}`
      });
      out.push({ kind: "owner_hold_expired", bookingId: b.id, result: r2.status });
    }
  }

  const advanceCutoff = new Date(now.getTime() - settings.notifications.customerAdvanceReminderHours * 3600000);
  const awaiting = await prisma.booking.findMany({
    where: { paymentStatus: "awaiting", status: { in: ["pending", "confirmed"] }, advanceAmount: { gt: 0 } },
    include: { events: { where: { type: "quote" }, orderBy: { createdAt: "desc" }, take: 1 } },
    take: 200
  });
  for (const b of awaiting) {
    const quotedAt = b.events[0]?.createdAt;
    if (!quotedAt || quotedAt > advanceCutoff) continue;
    const r = await sendEmail({
      kind: "customer_advance_reminder",
      dedupeKey: `customer_advance_reminder:${b.id}:${b.advanceAmount}`,
      bookingId: b.id,
      to: b.email,
      subject: `Reminder: advance for ${b.eventDate} · ${b.confirmationCode}`,
      text: `Hi ${b.names},\n\nA friendly reminder that the advance of ${formatPkr(b.advanceAmount)} for your booking has not reached us yet.${
        b.status === "pending" ? " Your date is not reserved until we confirm it." : ""
      }\n\nPayment details and the form to submit your transaction reference:\n${customerLink(b)}\n\n— ZH Films`
    });
    out.push({ kind: "customer_advance_reminder", bookingId: b.id, result: r.status });
  }

  const unverified = await prisma.payment.findMany({
    where: { status: "submitted", createdAt: { lte: pendingCutoff } },
    include: { booking: true },
    take: 200
  });
  for (const p of unverified) {
    if (!owner.length) break;
    const r = await sendEmail({
      kind: "owner_payment_reminder",
      dedupeKey: `owner_payment_reminder:${p.id}`,
      bookingId: p.bookingId,
      to: owner,
      subject: `Payment still unverified · ${p.booking.confirmationCode}`,
      text: `${p.booking.names} reported ${formatPkr(p.amount)} (ref ${p.reference}) more than ${settings.notifications.pendingReminderHours} hours ago. Check your account and verify or reject it:\n${adminLink(p.booking)}`
    });
    out.push({ kind: "owner_payment_reminder", bookingId: p.bookingId, result: r.status });
  }

  const counts = out.reduce<Record<string, number>>((acc, o) => ((acc[o.result] = (acc[o.result] ?? 0) + 1), acc), {});
  return { ranAt: now.toISOString(), ownerConfigured: owner.length > 0, counts, outcomes: out };
}
