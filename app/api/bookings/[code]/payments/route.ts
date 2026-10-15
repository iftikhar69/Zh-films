import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomerBooking } from "@/lib/booking-access";
import { getSettings } from "@/lib/settings";
import { checkReceipt, storeReceipt } from "@/lib/receipts";
import { notifyPaymentSubmitted } from "@/lib/notify";

const fields = z.object({
  token: z.string().max(100).optional(),
  method: z.enum(["easypaisa", "bank"]),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  reference: z
    .string()
    .trim()
    .min(4, "Enter the transaction ID / reference")
    .max(64)
    .regex(/^[A-Za-z0-9\-_/ .]+$/, "Use only the letters and numbers from your receipt"),
  payerName: z.string().trim().max(120).optional().default("")
});

const OPEN_STATUSES = new Set(["pending", "confirmed"]);

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Invalid form" }, { status: 400 });

  const parsed = fields.safeParse({
    token: form.get("token") ?? undefined,
    method: form.get("method"),
    amount: form.get("amount"),
    reference: form.get("reference"),
    payerName: form.get("payerName") ?? undefined
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ ok: false, field: issue?.path[0], error: issue?.message }, { status: 400 });
  }
  const input = parsed.data;

  const booking = await getCustomerBooking(code, input.token);
  if (!booking) return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
  if (!OPEN_STATUSES.has(booking.status) || !booking.advanceAmount) {
    return NextResponse.json({ ok: false, error: "No payment has been requested for this booking." }, { status: 409 });
  }
  if (booking.paymentStatus === "paid") {
    return NextResponse.json({ ok: false, error: "Your advance has already been verified." }, { status: 409 });
  }

  const settings = await getSettings();
  if (!settings.payments[input.method].enabled) {
    return NextResponse.json({ ok: false, field: "method", error: "That payment method is not available." }, { status: 400 });
  }

  const pending = await prisma.payment.count({ where: { bookingId: booking.id, status: "submitted" } });
  if (pending >= 3) {
    return NextResponse.json(
      { ok: false, error: "You already have payments awaiting verification. We'll be in touch shortly." },
      { status: 429 }
    );
  }
  const duplicate = await prisma.payment.findFirst({
    where: { bookingId: booking.id, reference: input.reference, status: { in: ["submitted", "verified"] } }
  });
  if (duplicate) {
    return NextResponse.json({ ok: false, field: "reference", error: "This reference was already submitted." }, { status: 409 });
  }

  let receiptPath: string | undefined;
  let receiptMime: string | undefined;
  const file = form.get("receipt");
  if (file instanceof File && file.size > 0) {
    const check = await checkReceipt(file);
    if (!check.ok) return NextResponse.json({ ok: false, field: "receipt", error: check.error }, { status: 400 });
    receiptPath = await storeReceipt(check.bytes, check.ext);
    receiptMime = check.mime;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        bookingId: booking.id,
        method: input.method,
        amount: input.amount,
        reference: input.reference,
        payerName: input.payerName,
        receiptPath,
        receiptMime
      }
    });
    await tx.booking.update({ where: { id: booking.id }, data: { paymentStatus: "submitted" } });
    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: "payment_submitted",
        message: `Customer reported ${input.method} payment of PKR ${input.amount.toLocaleString("en-PK")} (ref ${input.reference})${receiptPath ? " with receipt" : ""}`,
        actor: "customer"
      }
    });
    return p;
  });

  await notifyPaymentSubmitted(booking, payment).catch((e) => console.error("[payments] notify failed", e));
  return NextResponse.json({ ok: true, payment: { id: payment.id, status: payment.status } });
}
