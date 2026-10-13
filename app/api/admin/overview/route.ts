import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });
  }

  const [bookings, hires, rentals, sells, reviews, favoriteCount] = await Promise.all([
    prisma.booking.findMany({ orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }] }),
    prisma.hireRequest.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.rentalInquiry.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.sellInquiry.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.favorite.count()
  ]);

  // Group bookings by date so admin sees same-day clients separately
  const byDate: Record<string, typeof bookings> = {};
  for (const b of bookings) {
    (byDate[b.eventDate] ??= []).push(b);
  }

  return NextResponse.json({
    ok: true,
    bookings,
    bookingsByDate: byDate,
    hires,
    rentals,
    sells,
    reviews,
    counts: {
      reviews: reviews.length,
      favorites: favoriteCount,
      bookings: bookings.length,
      hires: hires.length,
      rentals: rentals.length,
      sells: sells.length
    }
  });
}
