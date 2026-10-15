"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Show, SignInButton, UserButton, useAuth } from "@clerk/nextjs";

const pill =
  "inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors";

export function ClerkAuthControls({ onNavigate }: { onNavigate?: () => void }) {
  const { isLoaded, userId } = useAuth();
  const [admin, setAdmin] = useState<{ userId: string; isAdmin: boolean } | null>(null);

  // Re-check whenever the signed-in user changes (e.g. after signing in through the modal).
  useEffect(() => {
    if (!isLoaded || !userId) return;
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { isAdmin?: boolean }) => {
        if (!cancelled) setAdmin({ userId, isAdmin: Boolean(d.isAdmin) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);

  const isAdmin = Boolean(userId && admin?.userId === userId && admin.isAdmin);

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className={`${pill} border-white/10 text-zinc-300 hover:border-zh-gold/40 hover:text-zh-gold`}>
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link href="/account" onClick={onNavigate} className={`${pill} border-white/15 text-zinc-300 hover:text-zh-gold`}>
          My bookings
        </Link>
        {isAdmin ? (
          <Link href="/admin" onClick={onNavigate} className={`${pill} border-zh-gold/40 text-zh-gold hover:bg-zh-gold/10`}>
            Dashboard
          </Link>
        ) : null}
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      </Show>
    </>
  );
}
