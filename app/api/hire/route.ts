import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clerkConfigured } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";

const schema = z.object({
  crewId: z.string().min(1),
  crewName: z.string().min(1),
  eventDate: z.string().min(4),
  brief: z.string().min(3),
  clientName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6)
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    let clerkUserId: string | undefined;
    if (clerkConfigured()) {
      try {
        const { userId } = await auth();
        clerkUserId = userId ?? undefined;
      } catch { /* public */ }
    }
    const row = await prisma.hireRequest.create({
      data: { ...body, clerkUserId, status: "pending" }
    });
    return NextResponse.json({
      ok: true,
      id: row.id,
      confirmationMessage: `Hire request locked for ${body.crewName} on ${body.eventDate}. ZH Film Family will confirm within 24 hours.`
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
