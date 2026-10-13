import { NextResponse } from "next/server";
import { clerkConfigured, isAdminUser } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ clerk: false, signedIn: false, isAdmin: false });
  }
  try {
    const { userId } = await auth();
    const isAdmin = userId ? await isAdminUser() : false;
    return NextResponse.json({
      clerk: true,
      signedIn: Boolean(userId),
      isAdmin
    });
  } catch {
    return NextResponse.json({ clerk: true, signedIn: false, isAdmin: false });
  }
}
