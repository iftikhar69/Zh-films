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
        ? prisma
            .$queryRaw<{ pending: number; paymentsToVerify: number; upcoming: number }[]>`
              SELECT
                (SELECT count(*)::int FROM "Booking" WHERE status = 'pending') AS pending,
                (SELECT count(*)::int FROM "Payment" WHERE status = 'submitted') AS "paymentsToVerify",
                (SELECT count(*)::int FROM "Booking" WHERE status = 'confirmed' AND "startsAt" >= ${now} AND "startsAt" <= ${new Date(now.getTime() + 30 * 86400000)}) AS upcoming
            `
            .then((rows) => rows[0])
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
