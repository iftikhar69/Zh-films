import { timingSafeEqual } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { clerkConfigured } from "@/lib/auth";

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Returns the booking only to its customer: either via the private link token from their
 * emails, or when the signed-in Clerk user owns it. Everyone else gets null (render 404).
 */
export async function getCustomerBooking(code: string, token?: string | null) {
  const booking = await prisma.booking.findUnique({ where: { confirmationCode: code } });
  if (!booking) return null;
  if (token && booking.accessToken && sameSecret(token, booking.accessToken)) return booking;
  if (clerkConfigured() && booking.clerkUserId) {
    try {
      const { userId } = await auth();
      if (userId && userId === booking.clerkUserId) return booking;
    } catch {
      /* not signed in */
    }
  }
  return null;
}
