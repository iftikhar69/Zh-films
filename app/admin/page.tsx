import type { Metadata } from "next";
import Link from "next/link";
import { AdminDesk } from "@/components/admin/AdminDesk";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Production Office",
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-32">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Restricted lot</p>
        <h1 className="mt-3 font-serif text-3xl text-white">Production Office</h1>
        <p className="mt-4 text-sm text-zinc-400">{gate.reason}.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Public accounts can book, hire, and rent. Admin sees every client as a separate card — even on the same date.
          Add your Clerk email to ADMIN_EMAILS or set publicMetadata.role to admin.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account">Public call sheet</Link>
          </Button>
        </div>
      </div>
    );
  }
  return <AdminDesk />;
}
