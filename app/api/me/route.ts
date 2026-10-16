import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth";
import { getViewer } from "@/lib/galleries";
import { claimBookings, customerSummary } from "@/lib/customer";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ clerk: false, signedIn: false, isAdmin: false }, { headers: NO_STORE });
  }
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ clerk: true, signedIn: false, isAdmin: false }, { headers: NO_STORE });
    await claimBookings(viewer);
    const [summary, user] = await Promise.all([customerSummary(viewer), currentUser()]);
    return NextResponse.json(
      {
        clerk: true,
        signedIn: true,
        isAdmin: viewer.isAdmin,
        firstName: user?.firstName ?? null,
        emailVerified: viewer.emails.length > 0,
        ...summary
      },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json({ clerk: true, signedIn: false, isAdmin: false }, { headers: NO_STORE });
  }
}
