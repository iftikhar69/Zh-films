import "server-only";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { clerkConfigured } from "@/lib/auth";
import { publicGearWhere } from "@/lib/gear";

export const enquiryBase = z.object({
  gearId: z.string().min(1).max(40),
  clientName: z.string().trim().min(2, "Add your name").max(120),
  email: z.string().trim().email("Check the email address").or(z.literal("")).optional().default(""),
  phone: z.string().trim().min(6, "Add a WhatsApp or phone number").max(30),
  message: z.string().trim().max(2000).optional().default("")
});

/** The listing as stored. Names and categories never come from the browser. */
export async function findPublicGear(id: string, mode: "sell" | "rent") {
  return prisma.gearItem.findFirst({ where: { id, ...publicGearWhere(mode) }, select: { id: true, name: true, category: true, status: true } });
}

export async function currentClerkUserId() {
  if (!clerkConfigured()) return undefined;
  try {
    return (await auth()).userId ?? undefined;
  } catch {
    return undefined;
  }
}
