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
  // An allow-listed email only counts once the user has verified they own it.
  const verifiedEmails = user.emailAddresses
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());

  const isAdmin = role === "admin" || verifiedEmails.some((e) => ADMIN_EMAILS.includes(e));
  if (!isAdmin) return { ok: false as const, reason: "Admin access only" };
  const actor = user.primaryEmailAddress?.emailAddress ?? verifiedEmails[0] ?? userId;
  return { ok: true as const, user, userId, actor };
}

/** For admin route handlers: either the admin, or the 401/403 response to return. */
export async function adminGate() {
  const gate = await requireAdmin();
  if (gate.ok) return { ok: true as const, actor: gate.actor };
  const status = gate.reason === "Admin access only" ? 403 : 401;
  return { ok: false as const, response: Response.json({ ok: false, error: gate.reason }, { status }) };
}

export async function isAdminUser() {
  const r = await requireAdmin();
  return r.ok;
}
