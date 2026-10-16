import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FILM_FAMILY } from "@/lib/film-family";
import { currentClerkUserId, enquiryBase, findPublicGear } from "@/lib/gear-enquiry";

export async function POST(req: Request) {
  const parsed = enquiryBase.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ ok: false, field: issue?.path[0], error: issue?.message ?? "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  const gear = await findPublicGear(body.gearId, "sell");
  if (!gear) return NextResponse.json({ ok: false, error: "This item is no longer listed." }, { status: 404 });
  const row = await prisma.sellInquiry.create({
    data: {
      gearId: gear.id,
      gearName: gear.name,
      category: gear.category,
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
    confirmationMessage: `Your interest in ${gear.name} has been sent. ${FILM_FAMILY.ceo} or the ZH Films desk will reply with condition and price. Nothing is reserved until we confirm with you.`
  });
}
