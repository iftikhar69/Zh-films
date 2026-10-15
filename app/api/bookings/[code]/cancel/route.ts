import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomerBooking } from "@/lib/booking-access";
import { notifyCustomerCancelled } from "@/lib/notify";

const body = z.object({
  token: z.string().max(100).optional(),
  message: z.string().trim().min(3, "Tell us briefly why you're cancelling").max(1000)
});

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const booking = await getCustomerBooking(code.toUpperCase(), parsed.data.token);
  if (!booking) return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    // Conditional update so a booking confirmed by staff a moment earlier is never cancelled from here.
    const res = await tx.booking.updateMany({
      where: { id: booking.id, status: "pending" },
      data: { status: "cancelled", holdExpiresAt: null, heldBy: null }
    });
    if (res.count === 0) return null;
    await tx.bookingEvent.create({
      data: { bookingId: booking.id, type: "status:cancelled", message: `Cancelled by customer — ${parsed.data.message}`, actor: "customer" }
    });
    return tx.booking.findUnique({ where: { id: booking.id } });
  });
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "This booking is already confirmed or closed. Please contact ZH Films to change or cancel it." },
      { status: 409 }
    );
  }
  await notifyCustomerCancelled(updated, parsed.data.message).catch((e) => console.error("[cancel] notify failed", e));
  return NextResponse.json({ ok: true });
}
