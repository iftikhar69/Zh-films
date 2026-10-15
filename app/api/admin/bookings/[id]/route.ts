import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { BOOKING_STATUSES, PAYMENT_STATUSES } from "@/lib/booking-status";

const schema = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    notes: z.string().max(2000).optional()
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.reason }, { status: gate.reason === "Admin access only" ? 403 : 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update" }, { status: 400 });
  }

  const { id } = await params;
  try {
    const booking = await prisma.booking.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true, booking });
  } catch {
    return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
  }
}
