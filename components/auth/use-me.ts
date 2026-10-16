"use client";

import { useEffect, useState } from "react";

export type Me = {
  signedIn: boolean;
  isAdmin: boolean;
  firstName: string | null;
  emailVerified?: boolean;
  bookings?: number;
  galleries?: number;
  next?: { confirmationCode: string; eventDate: string; status: string; packageName: string | null } | null;
};

const cache = new Map<string, Promise<Me | null>>();

/** One /api/me request per signed-in user per page load, shared by every component that asks. */
export function useMe(userId: string | null | undefined) {
  const [me, setMe] = useState<{ userId: string; data: Me } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    if (!cache.has(userId)) {
      cache.set(
        userId,
        fetch("/api/me", { cache: "no-store" })
          .then((r) => r.json() as Promise<Me>)
          .catch(() => null)
      );
    }
    void cache.get(userId)!.then((data) => {
      if (!cancelled && data) setMe({ userId, data });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return userId && me?.userId === userId ? me.data : null;
}
