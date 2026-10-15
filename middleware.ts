import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtected = createRouteMatcher(["/admin(.*)"]);
const isAdminApi = createRouteMatcher(["/api/admin(.*)"]);
const hasClerk =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isAdminApi(req)) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    return;
  }
  if (isProtected(req)) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("redirect_url", req.nextUrl.pathname);
    await auth.protect({ unauthenticatedUrl: signIn.toString() });
  }
});

export default function middleware(req: NextRequest, event: unknown) {
  if (!hasClerk) {
    if (isProtected(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirect_url", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (clerkHandler as any)(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
