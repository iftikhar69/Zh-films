import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clerkConfigured } from "@/lib/auth";
import { galleriesFor, getViewer } from "@/lib/galleries";
import { claimBookings } from "@/lib/customer";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ ok: false, error: "Sign in is not configured" }, { status: 401, headers: NO_STORE });
  }
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401, headers: NO_STORE });
  }
  const userId = viewer.userId;
  await claimBookings(viewer);

  const [bookings, hires, rentals, sells, galleries] = await Promise.all([
    prisma.booking.findMany({
      where: { clerkUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        confirmationCode: true,
        names: true,
        eventDate: true,
        city: true,
        coverage: true,
        serviceType: true,
        startTime: true,
        endTime: true,
        holdExpiresAt: true,
        deliverables: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.hireRequest.findMany({ where: { clerkUserId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.rentalInquiry.findMany({ where: { clerkUserId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.sellInquiry.findMany({ where: { clerkUserId: userId }, orderBy: { createdAt: "desc" } }),
    galleriesFor(viewer)
  ]);

  return NextResponse.json(
    {
      ok: true,
      emailVerified: viewer.emails.length > 0,
      bookings,
      hires,
      rentals,
      sells,
      galleries: galleries.map((g) => ({ id: g.id, title: g.title, eventDate: g.eventDate, photos: g._count.photos }))
    },
    { headers: NO_STORE }
  );
}
