import "server-only";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/galleries";

/** Bookings made before signing in are attached only to an email the user has verified. */
export async function claimBookings(viewer: Viewer) {
  if (!viewer.emails.length) return;
  await prisma.booking.updateMany({
    where: { clerkUserId: null, email: { in: viewer.emails } },
    data: { clerkUserId: viewer.userId }
  });
}

export async function customerSummary(viewer: Viewer) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const [bookings, next, galleries] = await Promise.all([
    prisma.booking.count({ where: { clerkUserId: viewer.userId } }),
    prisma.booking.findFirst({
      where: { clerkUserId: viewer.userId, status: { in: ["pending", "confirmed"] }, eventDate: { gte: today } },
      orderBy: { eventDate: "asc" },
      select: { confirmationCode: true, eventDate: true, status: true, packageName: true }
    }),
    viewer.emails.length
      ? prisma.familyGallery.count({ where: { status: "active", members: { some: { email: { in: viewer.emails } } } } })
      : Promise.resolve(0)
  ]);
  return { bookings, galleries, next };
}
