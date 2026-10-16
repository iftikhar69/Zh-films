import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentClerkUserId, enquiryBase, findPublicGear } from "@/lib/gear-enquiry";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const schema = enquiryBase.extend({ startDate: date, endDate: date.or(z.literal("")).optional().default("") });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ ok: false, field: issue?.path[0], error: issue?.message ?? "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  if (body.endDate && body.endDate < body.startDate) {
    return NextResponse.json({ ok: false, field: "endDate", error: "The return date is before the pickup date" }, { status: 400 });
  }
  const gear = await findPublicGear(body.gearId, "rent");
  if (!gear) return NextResponse.json({ ok: false, error: "This item is no longer listed for rent." }, { status: 404 });
  const row = await prisma.rentalInquiry.create({
    data: {
      gearId: gear.id,
      gearName: gear.name,
      category: gear.category,
      startDate: body.startDate,
      endDate: body.endDate,
      clientName: body.clientName,
      email: body.email,
      phone: body.phone,
      message: body.message,
      clerkUserId: await currentClerkUserId(),
      status: "pending"
    }
  });
  return NextResponse.json({
    ok: true,
    id: row.id,
    confirmationMessage: `Rental request for ${gear.name} received. ZH Films will confirm availability and the rate — your dates aren't held until we confirm.`
  });
}
