import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clerkConfigured } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";
import { FILM_FAMILY } from "@/lib/film-family";

const schema = z.object({
  gearId: z.string().optional(),
  gearName: z.string().min(1),
  category: z.string().min(1),
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
    const row = await prisma.sellInquiry.create({
      data: {
        gearId: body.gearId,
        gearName: body.gearName,
        category: body.category,
        clientName: body.clientName,
        email: body.email,
        phone: body.phone,
        message: body.message ?? "",
        clerkUserId,
        status: "pending"
      }
    });
    return NextResponse.json({
      ok: true,
      id: row.id,
      confirmationMessage: `Interest in ${body.gearName} sent to ${FILM_FAMILY.ceo}. He or the desk will reply with condition & price.`,
      contact: FILM_FAMILY.ceo
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
