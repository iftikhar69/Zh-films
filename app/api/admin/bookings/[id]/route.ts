import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { TRANSITIONS, isHeld, type BookingStatus } from "@/lib/booking-status";
import { holdExpiry } from "@/lib/booking-rules";
import { SlotUnavailableError, assertBookingFree, withScheduleLock } from "@/lib/booking-availability";
import { logBookingEvent } from "@/lib/booking-events";
import { getSettings } from "@/lib/settings";
import { formatInstant, formatPkr, notifyAdvanceRequested, notifyHoldPlaced, notifyStatusChange } from "@/lib/notify";

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), override: z.boolean().optional(), withoutAdvance: z.boolean().optional() }),
  z.object({ action: z.literal("decline"), reason: z.string().max(1000).optional() }),
  z.object({ action: z.literal("cancel"), reason: z.string().max(1000).optional() }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("hold"), hours: z.number().int().min(1).max(336).optional() }),
  z.object({ action: z.literal("release_hold") }),
  z.object({
    action: z.literal("set_quote"),
    quotedAmount: z.number().int().min(0).max(100_000_000),
    advanceAmount: z.number().int().min(0).max(100_000_000),
    note: z.string().max(500).optional()
  }),
  z.object({ action: z.literal("note"), note: z.string().min(1).max(2000) })
]);

const TARGET: Partial<Record<string, BookingStatus>> = {
  confirm: "confirmed",
  decline: "declined",
  cancel: "cancelled",
  complete: "completed"
};

class ActionError extends Error {
  constructor(message: string, public status = 400, public code?: string) {
    super(message);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.reason }, { status: gate.reason === "Admin access only" ? 403 : 401 });
  }
  const parsed = action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid action" }, { status: 400 });
  }
  const input = parsed.data;
  const { id } = await params;
  const actor = gate.actor;
  const settings = await getSettings();

  try {
    const { booking, previous } = await withScheduleLock(async (tx) => {
      const current = await tx.booking.findUnique({ where: { id } });
      if (!current) throw new ActionError("Booking not found", 404);
      const now = new Date();

      const target = TARGET[input.action];
      if (target) {
        if (!TRANSITIONS[current.status as BookingStatus]?.includes(target)) {
          throw new ActionError(`A ${current.status} booking cannot be marked ${target}.`, 409);
        }
        if (target === "completed" && current.endsAt && current.endsAt > now) {
          throw new ActionError("This event hasn't finished yet — mark it completed after the event.", 409);
        }
        if (target === "confirmed") {
          if (!current.blockStart || !current.blockEnd) throw new ActionError("This booking has no time range to reserve.");
          if (current.paymentStatus !== "paid" && !("withoutAdvance" in input && input.withoutAdvance)) {
            throw new ActionError(
              current.paymentStatus === "submitted"
                ? "The customer reported a payment. Verify it under Payments before confirming."
                : current.advanceAmount
                  ? "The advance hasn't been received yet. Confirm once the payment is verified."
                  : "Set a quote and advance first. The date is locked once the advance is verified.",
              409,
              "advance_unpaid"
            );
          }
          if (!("override" in input && input.override)) {
            await assertBookingFree(tx, current, now);
          }
        }
        const reason = "reason" in input ? input.reason : undefined;
        const updated = await tx.booking.update({
          where: { id },
          data: { status: target, holdExpiresAt: null, heldBy: null }
        });
        const overrideNote =
          ("override" in input && input.override ? " (availability override)" : "") +
          (target === "confirmed" && current.paymentStatus !== "paid" ? " (confirmed without verified advance)" : "");
        await logBookingEvent(tx, id, `status:${target}`, `${current.status} → ${target}${overrideNote}${reason ? ` — ${reason}` : ""}`, actor);
        return { booking: updated, previous: current };
      }

      if (input.action === "hold") {
        if (current.status !== "pending") throw new ActionError("Only pending requests can be held.", 409);
        if (!current.blockStart || !current.blockEnd) throw new ActionError("This booking has no time range to hold.");
        await assertBookingFree(tx, current, now);
        const until = holdExpiry(input.hours ?? settings.holds.defaultHours, now);
        const updated = await tx.booking.update({ where: { id }, data: { holdExpiresAt: until, heldBy: actor } });
        await logBookingEvent(tx, id, "hold", `Temporary hold until ${formatInstant(until)}`, actor);
        return { booking: updated, previous: current };
      }

      if (input.action === "release_hold") {
        if (!isHeld(current, now)) throw new ActionError("There is no active hold on this booking.", 409);
        const updated = await tx.booking.update({ where: { id }, data: { holdExpiresAt: null, heldBy: null } });
        await logBookingEvent(tx, id, "hold_released", "Hold released", actor);
        return { booking: updated, previous: current };
      }

      if (input.action === "set_quote") {
        if (input.advanceAmount > input.quotedAmount) throw new ActionError("The advance cannot be more than the total.");
        if (current.status === "declined" || current.status === "cancelled") {
          throw new ActionError("This booking is closed.", 409);
        }
        const paymentStatus =
          current.paymentStatus === "paid" || current.paymentStatus === "submitted" || current.paymentStatus === "refunded"
            ? current.paymentStatus
            : input.advanceAmount > 0
              ? "awaiting"
              : "not_requested";
        const updated = await tx.booking.update({
          where: { id },
          data: { quotedAmount: input.quotedAmount, advanceAmount: input.advanceAmount, paymentStatus }
        });
        const diff = current.estimatedTotal != null ? input.quotedAmount - current.estimatedTotal : null;
        const vsEstimate =
          diff == null || diff === 0
            ? ""
            : diff < 0
              ? ` — discount of ${formatPkr(-diff)} on the ${formatPkr(current.estimatedTotal)} estimate`
              : ` — ${formatPkr(diff)} above the ${formatPkr(current.estimatedTotal)} estimate`;
        await logBookingEvent(
          tx,
          id,
          "quote",
          `Quote ${formatPkr(input.quotedAmount)}, advance ${formatPkr(input.advanceAmount)}${vsEstimate}${input.note ? ` — ${input.note}` : ""}`,
          actor
        );
        return { booking: updated, previous: current };
      }

      if (input.action !== "note") throw new ActionError("Unknown action");
      await logBookingEvent(tx, id, "note", input.note, actor);
      return { booking: current, previous: current };
    });

    let email: { status: string; error?: string } | null = null;
    if (TARGET[input.action]) {
      email = await notifyStatusChange(booking, booking.status, "reason" in input ? input.reason : undefined).catch((e) => {
        console.error("[admin] notify failed", e);
        return { status: "failed", error: "Email could not be sent" };
      });
    } else if (input.action === "hold") {
      await notifyHoldPlaced(booking).catch((e) => console.error("[admin] notify failed", e));
    } else if (
      input.action === "set_quote" &&
      booking.advanceAmount &&
      booking.paymentStatus === "awaiting" &&
      previous.advanceAmount !== booking.advanceAmount
    ) {
      await notifyAdvanceRequested(booking).catch((e) => console.error("[admin] notify failed", e));
    }
    return NextResponse.json({ ok: true, booking, email });
  } catch (e) {
    if (e instanceof SlotUnavailableError) {
      return NextResponse.json(
        {
          ok: false,
          code: "slot_conflict",
          error:
            "Another confirmed booking or active hold overlaps this time. Decline or move one of them, or confirm with override if a second crew is available."
        },
        { status: 409 }
      );
    }
    if (e instanceof ActionError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.status });
    console.error("[admin] booking action failed", e);
    return NextResponse.json({ ok: false, error: "Action failed" }, { status: 500 });
  }
}
