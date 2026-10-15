import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clerkConfigured } from "@/lib/auth";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ ok: false, error: "Sign in is not configured" }, { status: 401 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const user = await currentUser();
  const verifiedEmails = (user?.emailAddresses ?? [])
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());
  if (verifiedEmails.length) {
    // Bookings made before signing in are attached only to a verified email the user owns.
    await prisma.booking.updateMany({
      where: { clerkUserId: null, email: { in: verifiedEmails } },
      data: { clerkUserId: userId }
    });
  }

  const [bookings, hires, rentals, sells] = await Promise.all([
    prisma.booking.findMany({
      where: { clerkUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        confirmationCode: true,
        names: true,
        eventDate: true,
        city: true,
        coverage: true,
        deliverables: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true
      }
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
