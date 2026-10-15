import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

/**
 * Call at the top of every admin page. Layouts are not re-run on client navigation, so each
 * page checks again on the server. Signed-out users go to sign-in; signed-in non-admins get 404.
 */
export async function adminPageGuard(path: string) {
  const gate = await requireAdmin();
  if (gate.ok) return gate;
  if (gate.reason === "Admin access only") notFound();
  redirect(`/sign-in?redirect_url=${encodeURIComponent(path)}`);
}
