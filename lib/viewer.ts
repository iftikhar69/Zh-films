import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { clerkConfigured } from "@/lib/auth";

export const VISITOR_COOKIE = "zh_vid";

export type Viewer = { ownerId: string; signedIn: boolean };

/**
 * Resolves who is favoriting. Signed-in Clerk users own their favorites; everyone
 * else gets an anonymous cookie. When a visitor signs in, their cookie favorites
 * are folded into their account.
 */
export async function getViewer({ create }: { create: boolean }): Promise<Viewer | null> {
  const jar = await cookies();
  let visitorId = jar.get(VISITOR_COOKIE)?.value;

  let userId: string | null = null;
  if (clerkConfigured()) {
    try {
      userId = (await auth()).userId;
    } catch {
      userId = null;
    }
  }

  if (userId) {
    const ownerId = `user:${userId}`;
    if (visitorId) {
      await adoptVisitorFavorites(`visitor:${visitorId}`, ownerId);
      jar.delete(VISITOR_COOKIE);
    }
    return { ownerId, signedIn: true };
  }

  if (!visitorId) {
    if (!create) return null;
    visitorId = crypto.randomUUID();
    jar.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }
  return { ownerId: `visitor:${visitorId}`, signedIn: false };
}

async function adoptVisitorFavorites(from: string, to: string) {
  const rows = await prisma.favorite.findMany({ where: { ownerId: from } });
  if (!rows.length) return;
  for (const r of rows) {
    await prisma.favorite.upsert({
      where: { ownerId_itemType_itemId: { ownerId: to, itemType: r.itemType, itemId: r.itemId } },
      create: { ownerId: to, itemType: r.itemType, itemId: r.itemId, createdAt: r.createdAt },
      update: {}
    });
  }
  await prisma.favorite.deleteMany({ where: { ownerId: from } });
}
