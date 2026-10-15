import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notifyPaymentDecision } from "@/lib/notify";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3, "Give the customer a short reason").max(500) })
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.reason }, { status: gate.reason === "Admin access only" ? 403 : 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid action" }, { status: 400 });
  }
  const input = parsed.data;
  const { id } = await params;

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id }, include: { booking: true } });
    if (!payment) return { error: "Payment not found", status: 404 } as const;
    if (payment.status !== "submitted") return { error: `This payment is already ${payment.status}.`, status: 409 } as const;

    const now = new Date();
    const updated = await tx.payment.update({
      where: { id },
      data:
        input.action === "verify"
          ? { status: "verified", verifiedAt: now, verifiedBy: gate.actor }
          : { status: "rejected", verifiedAt: now, verifiedBy: gate.actor, rejectionReason: input.reason }
    });

    // Payment state is tracked separately from the booking status: verifying an advance
    // never confirms a booking or bypasses the availability check.
    const [verified, stillSubmitted] = await Promise.all([
      tx.payment.aggregate({ where: { bookingId: payment.bookingId, status: "verified" }, _sum: { amount: true } }),
      tx.payment.count({ where: { bookingId: payment.bookingId, status: "submitted" } })
    ]);
    const paid = (verified._sum.amount ?? 0) >= (payment.booking.advanceAmount ?? Infinity);
    const booking = await tx.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: paid ? "paid" : stillSubmitted ? "submitted" : "awaiting" }
    });
    await tx.bookingEvent.create({
      data: {
        bookingId: payment.bookingId,
        type: `payment_${updated.status}`,
        message:
          input.action === "verify"
            ? `Payment ${payment.reference} (PKR ${payment.amount.toLocaleString("en-PK")}) verified in account`
            : `Payment ${payment.reference} rejected — ${input.reason}`,
        actor: gate.actor
      }
    });
    return { payment: updated, booking } as const;
  });

  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  await notifyPaymentDecision(result.booking, result.payment).catch((e) => console.error("[payments] notify failed", e));
  return NextResponse.json({ ok: true, payment: result.payment, paymentStatus: result.booking.paymentStatus });
}
