"use client";

import dynamic from "next/dynamic";

const Inner = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? dynamic(() => import("./CustomerWelcomeInner").then((m) => m.CustomerWelcomeInner), { ssr: false })
  : null;

/** Signed-in customers get their own desk under the hero; visitors see the public page unchanged. */
export function CustomerWelcome() {
  return Inner ? <Inner /> : null;
}
