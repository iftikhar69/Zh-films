import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { confirmationCode, formatCallSheet } from "@/lib/film-family";
import { clerkConfigured } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";

const schema = z.object({
  names: z.string().min(2),
  city: z.string().min(2),
  eventDate: z.string().min(4),
  coverage: z.string().min(3),
  deliverables: z.string().min(3),
  references: z.string().optional().default(""),
  email: z.string().email(),
  phone: z.string().min(6)
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    let clerkUserId: string | undefined;
    if (clerkConfigured()) {
      try {
        const { userId } = await auth();
        clerkUserId = userId ?? undefined;
      } catch {
        /* public booking allowed */
      }
    }

    const code = confirmationCode();
    const booking = await prisma.booking.create({
      data: {
        confirmationCode: code,
        names: body.names,
        city: body.city,
        eventDate: body.eventDate,
        coverage: body.coverage,
        deliverables: body.deliverables,
        references: body.references ?? "",
        email: body.email,
        phone: body.phone,
        clerkUserId,
        status: "pending"
      }
    });

    const sameDayCount = await prisma.booking.count({
      where: { eventDate: body.eventDate }
    });

    const message = formatCallSheet({
      code: booking.confirmationCode,
      names: booking.names,
      eventDate: booking.eventDate,
      city: booking.city
    });

    return NextResponse.json({
      ok: true,
      booking: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        eventDate: booking.eventDate,
        names: booking.names
      },
      confirmationMessage: message,
      sameDayBookings: sameDayCount,
      note:
        sameDayCount > 1
          ? `This date still has room — ${sameDayCount} separate client requests are on the board for ${body.eventDate}.`
          : `You are the first call-sheet entry for ${body.eventDate}. The day remains available for other clients.`
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid booking";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ ok: false, error: "date required" }, { status: 400 });
  }
  const count = await prisma.booking.count({ where: { eventDate: date } });
  return NextResponse.json({
    ok: true,
    eventDate: date,
    bookingCount: count,
    available: true,
    message:
      count === 0
        ? "This day is open on the ZH call sheet."
        : `${count} client(s) already requested this day — it stays available; each booking is separate.`
  });
}
