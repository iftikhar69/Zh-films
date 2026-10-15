import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminPageGuard } from "@/lib/admin-guard";
import { emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Production Office",
  robots: { index: false, follow: false }
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await adminPageGuard("/admin");
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zh-gold/80">ZH Films · Production office</p>
          <p className="mt-1 text-xs text-zinc-500">Signed in as {gate.actor}</p>
        </div>
        {!emailConfigured() ? (
          <p className="rounded-full border border-amber-400/30 bg-amber-400/5 px-3 py-1 text-[11px] text-amber-200">
            Email not configured — notifications are logged, not sent
          </p>
        ) : null}
      </div>
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <AdminNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
