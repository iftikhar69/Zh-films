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
  phone: z.string().min(6),
  idempotencyKey: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  let idempotencyKey: string | undefined;
  try {
    const body = schema.parse(await req.json());
    idempotencyKey = body.idempotencyKey;
    let clerkUserId: string | undefined;
    if (clerkConfigured()) {
      try {
        const { userId } = await auth();
        clerkUserId = userId ?? undefined;
      } catch {
        /* public booking allowed */
      }
    }

    if (body.idempotencyKey) {
      const existing = await prisma.booking.findUnique({
        where: { idempotencyKey: body.idempotencyKey },
      });
      if (existing) return NextResponse.json(await confirmation(existing));
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
        email: body.email.trim().toLowerCase(),
        phone: body.phone,
        clerkUserId,
        status: "pending",
        idempotencyKey: body.idempotencyKey,
      },
    });

    return NextResponse.json(await confirmation(booking));
  } catch (e) {
    if (idempotencyKey && (e as { code?: string })?.code === "P2002") {
      const existing = await prisma.booking.findUnique({ where: { idempotencyKey } });
      if (existing) return NextResponse.json(await confirmation(existing));
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Could not save the booking. Please try again." },
      { status: 500 },
    );
  }
}

async function confirmation(booking: {
  id: string;
  confirmationCode: string;
  names: string;
  eventDate: string;
  city: string;
}) {
  const sameDayCount = await prisma.booking.count({
    where: { eventDate: booking.eventDate },
  });

  const message = formatCallSheet({
    code: booking.confirmationCode,
    names: booking.names,
    eventDate: booking.eventDate,
    city: booking.city,
  });

  return {
    ok: true,
    booking: {
      id: booking.id,
      confirmationCode: booking.confirmationCode,
      eventDate: booking.eventDate,
      names: booking.names,
    },
    confirmationMessage: message,
    sameDayBookings: sameDayCount,
    note:
      sameDayCount > 1
        ? `This date still has room — ${sameDayCount} separate client requests are on the board for ${booking.eventDate}.`
        : `You are the first call-sheet entry for ${booking.eventDate}. The day remains available for other clients.`,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json(
      { ok: false, error: "date required" },
      { status: 400 },
    );
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
        : `${count} client(s) already requested this day — it stays available; each booking is separate.`,
  });
}
