import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clerkConfigured } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";

const schema = z.object({
  gearId: z.string().min(1),
  gearName: z.string().min(1),
  category: z.string().min(1),
  startDate: z.string().min(4),
  endDate: z.string().optional().default(""),
  clientName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  message: z.string().optional().default("")
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
    const row = await prisma.rentalInquiry.create({
      data: { ...body, endDate: body.endDate ?? "", message: body.message ?? "", clerkUserId, status: "pending" }
    });
    return NextResponse.json({
      ok: true,
      id: row.id,
      confirmationMessage: `Rental inquiry for ${body.gearName} received. Production office will confirm availability.`
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
