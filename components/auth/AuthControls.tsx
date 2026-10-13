"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AuthControls() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!hasClerk) return;
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { isAdmin?: boolean }) => {
        if (!cancelled) setIsAdmin(Boolean(d.isAdmin));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hasClerk) {
    return (
      <Link
        href="/sign-in"
        className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-300"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-300 hover:border-zh-gold/40 hover:text-zh-gold"
          >
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        {isAdmin ? (
          <Link
            href="/admin"
            className="hidden rounded-full border border-zh-gold/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zh-gold sm:inline-flex"
          >
            Office
          </Link>
        ) : (
          <Link
            href="/account"
            className="hidden rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-300 hover:text-zh-gold sm:inline-flex"
          >
            Call sheet
          </Link>
        )}
        <UserButton
          appearance={{
            elements: { avatarBox: "h-8 w-8" }
          }}
        />
      </Show>
    </>
  );
}
