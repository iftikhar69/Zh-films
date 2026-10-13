import { auth, currentUser } from "@clerk/nextjs/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function clerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
}

export async function getSessionUser() {
  if (!clerkConfigured()) return null;
  try {
    return await currentUser();
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  if (!clerkConfigured()) {
    return { ok: false as const, reason: "Clerk is not configured" };
  }
  const { userId } = await auth();
  if (!userId) return { ok: false as const, reason: "Sign in required" };
  const user = await currentUser();
  if (!user) return { ok: false as const, reason: "Sign in required" };

  const role = (user.publicMetadata as { role?: string } | null)?.role;
  const email =
    user.primaryEmailAddress?.emailAddress?.toLowerCase() ??
    user.emailAddresses[0]?.emailAddress?.toLowerCase() ??
    "";

  const isAdmin = role === "admin" || (email && ADMIN_EMAILS.includes(email));
  if (!isAdmin) return { ok: false as const, reason: "Admin access only" };
  return { ok: true as const, user, userId };
}

export async function isAdminUser() {
  const r = await requireAdmin();
  return r.ok;
}
