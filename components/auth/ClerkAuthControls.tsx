"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Show, SignInButton, useAuth, useClerk, useUser } from "@clerk/nextjs";
import { CalendarCheck, ChevronDown, Heart, Images, LayoutDashboard, LogOut, Settings, UserRound } from "lucide-react";
import { useMe } from "@/components/auth/use-me";
import { cn } from "@/lib/utils";

const pill =
  "inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors";

export function ClerkAuthControls({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className={`${pill} border-white/10 text-zinc-300 hover:border-zh-gold/40 hover:text-zh-gold`}>
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">{onNavigate ? <AccountList onNavigate={onNavigate} /> : <AccountMenu />}</Show>
    </>
  );
}

function useAccountLinks() {
  const { userId } = useAuth();
  const me = useMe(userId);
  return {
    me,
    links: [
      { href: "/account", label: "Account overview", icon: UserRound },
      { href: "/account#bookings", label: "My bookings", icon: CalendarCheck, count: me?.bookings },
      { href: "/galleries", label: "Family galleries", icon: Images, count: me?.galleries },
      { href: "/favorites", label: "Saved", icon: Heart }
    ]
  };
}

function Avatar({ size = 28 }: { size?: number }) {
  const { user } = useUser();
  const initial = (user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? "?").slice(0, 1).toUpperCase();
  return user?.hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.imageUrl} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex items-center justify-center rounded-full bg-zh-gold text-[11px] font-semibold text-black" style={{ width: size, height: size }}>
      {initial}
    </span>
  );
}

function AccountMenu() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { me, links } = useAccountLinks();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const name = me?.firstName ?? user?.firstName ?? "Account";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-black/30 py-1 pl-1 pr-3 text-xs text-zinc-200 transition hover:border-zh-gold/50"
      >
        <Avatar />
        <span className="max-w-[8rem] truncate">{name}</span>
        {me?.galleries ? <span className="h-1.5 w-1.5 rounded-full bg-zh-gold" aria-label="You have private galleries" /> : null}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl">
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{user?.fullName || name}</p>
              <p className="truncate text-xs text-zinc-500">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          {me?.next ? (
            <Link
              href={`/booking/${me.next.confirmationCode}`}
              onClick={() => setOpen(false)}
              className="mx-1 mb-1 block rounded-xl border border-zh-gold/30 bg-zh-gold/5 px-3 py-2 text-xs text-zinc-300"
            >
              <span className="block text-[10px] uppercase tracking-[0.25em] text-zh-gold">Next date</span>
              {me.next.packageName ?? "Your booking"} · {me.next.eventDate} · {me.next.status === "confirmed" ? "Confirmed" : "Awaiting confirmation"}
            </Link>
          ) : null}
          <ul className="py-1">
            {links.map(({ href, label, icon: Icon, count }) => (
              <li key={href}>
                <Link role="menuitem" href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">
                  <Icon className="h-4 w-4 text-zinc-500" /> <span className="flex-1">{label}</span>
                  {count ? <span className="rounded-full bg-white/10 px-2 text-[11px] text-zinc-200">{count}</span> : null}
                </Link>
              </li>
            ))}
            {me?.isAdmin ? (
              <li>
                <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zh-gold hover:bg-zh-gold/10">
                  <LayoutDashboard className="h-4 w-4" /> Admin dashboard
                </Link>
              </li>
            ) : null}
          </ul>
          <div className="border-t border-white/10 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openUserProfile();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <Settings className="h-4 w-4" /> Manage sign-in & email
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut({ redirectUrl: "/" })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The same links laid out for the mobile menu. */
function AccountList({ onNavigate }: { onNavigate: () => void }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { me, links } = useAccountLinks();
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-3">
        <Avatar size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm text-white">{user?.fullName || me?.firstName || "Your account"}</p>
          <p className="truncate text-xs text-zinc-500">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {links.slice(1).map(({ href, label, icon: Icon, count }) => (
          <li key={href}>
            <Link href={href} onClick={onNavigate} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-zinc-200">
              <Icon className="h-4 w-4 text-zh-gold" /> <span className="flex-1">{label}</span>
              {count ? <span className="text-zinc-400">{count}</span> : null}
            </Link>
          </li>
        ))}
        {me?.isAdmin ? (
          <li>
            <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2 rounded-xl border border-zh-gold/40 px-3 py-2.5 text-xs text-zh-gold">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          </li>
        ) : null}
        <li>
          <button type="button" onClick={() => void signOut({ redirectUrl: "/" })} className="flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-zinc-400">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </li>
      </ul>
    </div>
  );
}
