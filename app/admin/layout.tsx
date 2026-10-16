import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAccount } from "@/components/admin/AdminAccount";
import { adminPageGuard } from "@/lib/admin-guard";
import { emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Production Office",
  robots: { index: false, follow: false }
};

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-zh-gold to-[#8a6f3a] font-serif text-sm font-semibold text-black">
        ZH
      </span>
      <span className="leading-tight">
        <span className="block font-serif text-base text-white">ZH Films</span>
        <span className="block text-[10px] uppercase tracking-[0.3em] text-zinc-500">Production Office</span>
      </span>
    </Link>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await adminPageGuard("/admin");
  const emailOff = !emailConfigured();
  return (
    <div className="min-h-[100svh] bg-[#07070a] text-zinc-100" data-admin-shell>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0b0b0f] px-4 py-5 lg:flex">
        <Brand />
        <p className="mb-2 mt-8 px-2 text-[10px] uppercase tracking-[0.3em] text-zinc-600">Manage</p>
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
        <AdminAccount actor={gate.actor} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#07070a]/90 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <Brand />
            </div>
            <p className="hidden text-xs text-zinc-500 lg:block">
              Signed in as <span className="text-zinc-300">{gate.actor}</span>
            </p>
            <div className="flex items-center gap-2">
              {emailOff ? (
                <span className="hidden rounded-full border border-amber-400/30 bg-amber-400/5 px-3 py-1 text-[11px] text-amber-200 sm:inline">
                  Email not configured — notifications are logged, not sent
                </span>
              ) : null}
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View website
              </Link>
            </div>
          </div>
          <div className="border-t border-white/[0.05] px-4 py-2 sm:px-6 lg:hidden">
            <AdminNav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
