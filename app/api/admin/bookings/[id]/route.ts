import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { BOOKING_STATUSES, PAYMENT_STATUSES } from "@/lib/booking-status";
import { BLOCKING_STATUSES } from "@/lib/booking-rules";
import { SlotUnavailableError, assertSlotFree, withScheduleLock } from "@/lib/booking-availability";

const schema = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    notes: z.string().max(2000).optional(),
    /** Staff may knowingly double-book (e.g. a second crew is available). Logged in notes. */
    override: z.boolean().optional()
  })
  .strict()
  .refine((v) => v.status || v.paymentStatus || v.notes !== undefined, "Nothing to update");

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: gate.reason },
      { status: gate.reason === "Admin access only" ? 403 : 401 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update" }, { status: 400 });
  }
  const { override, ...patch } = parsed.data;
  const { id } = await params;

  try {
    const booking = await withScheduleLock(async (tx) => {
      const current = await tx.booking.findUnique({ where: { id } });
      if (!current) return null;

      const willBlock = patch.status && (BLOCKING_STATUSES as readonly string[]).includes(patch.status);
      const alreadyBlocking = (BLOCKING_STATUSES as readonly string[]).includes(current.status);
      if (willBlock && !alreadyBlocking && current.blockStart && current.blockEnd && !override) {
        await assertSlotFree(tx, { blockStart: current.blockStart, blockEnd: current.blockEnd }, new Date(), id);
      }

      const data: typeof patch & { holdExpiresAt?: null } = { ...patch };
      // Once staff decide, the temporary hold no longer applies.
      if (patch.status && patch.status !== "pending") data.holdExpiresAt = null;
      if (override && willBlock) {
        const stamp = `[${new Date().toISOString()}] Conflict override by ${gate.user.primaryEmailAddress?.emailAddress ?? gate.userId}`;
        data.notes = [current.notes, patch.notes, stamp].filter(Boolean).join("\n");
      }
      return tx.booking.update({ where: { id }, data });
    });
    if (!booking) return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    return NextResponse.json({ ok: true, booking });
  } catch (e) {
    if (e instanceof SlotUnavailableError) {
      return NextResponse.json(
        {
          ok: false,
          code: "slot_conflict",
          error: "Another confirmed or held booking overlaps this time. Decline one, or confirm with override if a second crew is available."
        },
        { status: 409 }
      );
    }
    console.error("admin booking update failed", e);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}
