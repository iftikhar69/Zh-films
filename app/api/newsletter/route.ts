import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; source?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, source: body.source ?? "directors_cut" },
      update: {}
    });

    return NextResponse.json({
      ok: true,
      discountCode: "DIRECTOR15",
      message: "Welcome to the Director’s Cut Club — 15% unlocked."
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save" }, { status: 500 });
  }
}
