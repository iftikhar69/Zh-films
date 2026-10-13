import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clerkConfigured } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ ok: false, error: "Sign in is not configured" }, { status: 401 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const [bookings, hires, rentals, sells] = await Promise.all([
    prisma.booking.findMany({
      where: { clerkUserId: userId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.hireRequest.findMany({
      where: { clerkUserId: userId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.rentalInquiry.findMany({
      where: { clerkUserId: userId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.sellInquiry.findMany({
      where: { clerkUserId: userId },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return NextResponse.json({ ok: true, bookings, hires, rentals, sells });
}
