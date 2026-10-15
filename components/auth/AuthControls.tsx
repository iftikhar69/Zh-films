"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Clerk's client bundle is only fetched when sign-in is actually configured. */
const ClerkAuthControls = hasClerk
  ? dynamic(() =>
      import("./ClerkAuthControls").then((m) => m.ClerkAuthControls),
    )
  : null;

export function AuthControls({ onNavigate }: { onNavigate?: () => void }) {
  if (ClerkAuthControls) return <ClerkAuthControls onNavigate={onNavigate} />;
  return (
    <Link
      href="/sign-in"
      onClick={onNavigate}
      className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-300"
    >
      Sign in
    </Link>
  );
}
