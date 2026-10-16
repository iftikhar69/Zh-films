"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { ExternalLink, LogOut } from "lucide-react";

export function AdminAccount({ actor }: { actor: string }) {
  const { signOut } = useClerk();
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zh-gold/15 font-mono text-xs uppercase text-zh-gold">
          {actor.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zh-gold/80">Owner · Admin</p>
          <p className="truncate text-xs text-zinc-300" title={actor}>
            {actor}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-zinc-300 transition hover:border-white/25 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Website
        </Link>
        <button
          type="button"
          onClick={() => signOut({ redirectUrl: "/" })}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-zinc-300 transition hover:border-red-400/40 hover:text-red-300"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
}
