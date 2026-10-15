import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { confirmationCode, formatCallSheet } from "@/lib/film-family";
import { clerkConfigured } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";
import {
  BOOKING_TIMEZONE,
  SERVICES,
  SERVICE_TYPES,
  TEAM_ID,
  resolveSlot
} from "@/lib/booking-rules";
import { randomBytes } from "node:crypto";
import { logBookingEvent } from "@/lib/booking-events";
import { notifyNewRequest } from "@/lib/notify";
import { SlotUnavailableError, assertSlotFree, busyRangesForDate, withScheduleLock } from "@/lib/booking-availability";

const schema = z.object({
  names: z.string().trim().min(2),
  city: z.string().trim().min(2),
  serviceType: z.enum(SERVICE_TYPES),
  eventDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  coverage: z.string().trim().min(3),
  deliverables: z.string().trim().min(3),
  references: z.string().max(2000).optional().default(""),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
  idempotencyKey: z.string().uuid().optional()
});

type BookingRow = Awaited<ReturnType<typeof prisma.booking.create>>;

function confirmation(booking: BookingRow) {
  const holdUntil = booking.holdExpiresAt
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: BOOKING_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short"
      }).format(booking.holdExpiresAt)
    : undefined;
  const service = SERVICES[booking.serviceType as keyof typeof SERVICES]?.label ?? booking.serviceType;
  const timeRange = booking.startTime && booking.endTime ? `${booking.startTime}–${booking.endTime}` : undefined;
  return {
    ok: true,
    booking: {
      id: booking.id,
      confirmationCode: booking.confirmationCode,
      eventDate: booking.eventDate,
      names: booking.names,
      status: booking.status
    },
    confirmationMessage: formatCallSheet({
      code: booking.confirmationCode,
      names: booking.names,
      eventDate: booking.eventDate,
      city: booking.city,
      service,
      timeRange,
      holdUntil
    }),
    note: "Request received — pending review. This is not yet a confirmed booking.",
    statusUrl: booking.accessToken ? `/booking/${booking.confirmationCode}?t=${booking.accessToken}` : undefined
  };
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, field: issue?.path[0], error: `${issue?.path.join(".")}: ${issue?.message}` },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const resolved = resolveSlot(body);
  if (!resolved.ok) {
    return NextResponse.json({ ok: false, field: resolved.field, error: resolved.error }, { status: 400 });
  }
  const { slot } = resolved;

  let clerkUserId: string | undefined;
  if (clerkConfigured()) {
    try {
      clerkUserId = (await auth()).userId ?? undefined;
    } catch {
      /* public booking allowed */
    }
  }

  try {
    const booking = await withScheduleLock(async (tx) => {
      if (body.idempotencyKey) {
        const existing = await tx.booking.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
        if (existing) return existing;
      }
      const now = new Date();
      await assertSlotFree(tx, slot, now);
      const created = await tx.booking.create({
        data: {
          confirmationCode: confirmationCode(),
          names: body.names,
          city: body.city,
          serviceType: body.serviceType,
          eventDate: body.eventDate,
          startTime: body.startTime,
          endTime: body.endTime,
          timezone: BOOKING_TIMEZONE,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          blockStart: slot.blockStart,
          blockEnd: slot.blockEnd,
          teamId: TEAM_ID,
          accessToken: randomBytes(24).toString("base64url"),
          coverage: body.coverage,
          deliverables: body.deliverables,
          references: body.references ?? "",
          email: body.email.toLowerCase(),
          phone: body.phone,
          clerkUserId,
          status: "pending",
          idempotencyKey: body.idempotencyKey
        }
      });
      await logBookingEvent(tx, created.id, "created", "Request submitted by customer", clerkUserId ? `user:${clerkUserId}` : "public");
      return created;
    });
    // Emails are deduplicated, so a retried request never notifies twice.
    await notifyNewRequest(booking).catch((e) => console.error("[booking] notify failed", e));
    return NextResponse.json(confirmation(booking));
  } catch (e) {
    if (e instanceof SlotUnavailableError) {
      return NextResponse.json(
        { ok: false, field: "startTime", code: "slot_unavailable", error: e.message, busy: await busyRangesForDate(body.eventDate) },
        { status: 409 }
      );
    }
    if (body.idempotencyKey && (e as { code?: string })?.code === "P2002") {
      const existing = await prisma.booking.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
      if (existing) return NextResponse.json(confirmation(existing));
    }
    console.error("booking create failed", e);
    return NextResponse.json({ ok: false, error: "Could not save the booking. Please try again." }, { status: 500 });
  }
}

/** Public availability for one date: busy time ranges only, no client details. */
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return NextResponse.json({ ok: false, error: "Use date=YYYY-MM-DD" }, { status: 400 });
  }
  const busy = await busyRangesForDate(date);
  return NextResponse.json(
    {
      ok: true,
      eventDate: date,
      timezone: BOOKING_TIMEZONE,
      busy,
      message:
        busy.length === 0
          ? "No bookings on this date yet."
          : `Already booked: ${busy.map((b) => `${b.from}–${b.to}`).join(", ")} (Pakistan time, incl. setup and travel). Other times are open.`
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
