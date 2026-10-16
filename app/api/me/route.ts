import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth";
import { getViewer } from "@/lib/galleries";
import { claimBookings, customerSummary } from "@/lib/customer";
import { prisma } from "@/lib/prisma";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ clerk: false, signedIn: false, isAdmin: false }, { headers: NO_STORE });
  }
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ clerk: true, signedIn: false, isAdmin: false }, { headers: NO_STORE });
    await claimBookings(viewer);
    const now = new Date();
    const [summary, user, office] = await Promise.all([
      customerSummary(viewer),
      currentUser(),
      viewer.isAdmin
        ? Promise.all([
            prisma.booking.count({ where: { status: "pending" } }),
            prisma.payment.count({ where: { status: "submitted" } }),
            prisma.booking.count({ where: { status: "confirmed", startsAt: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) } } })
          ]).then(([pending, paymentsToVerify, upcoming]) => ({ pending, paymentsToVerify, upcoming }))
        : Promise.resolve(undefined)
    ]);
    return NextResponse.json(
      {
        clerk: true,
        signedIn: true,
        isAdmin: viewer.isAdmin,
        firstName: user?.firstName ?? null,
        emailVerified: viewer.emails.length > 0,
        ...summary,
        ...(office ? { office } : {})
      },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json({ clerk: true, signedIn: false, isAdmin: false }, { headers: NO_STORE });
  }
}
