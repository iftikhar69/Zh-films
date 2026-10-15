"use client";

import dynamic from "next/dynamic";

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const ClerkProvider = pk
  ? dynamic(() => import("@clerk/nextjs").then((m) => m.ClerkProvider))
  : null;

export function ClerkProviderSafe({ children }: { children: React.ReactNode }) {
  if (!ClerkProvider || !pk) return <>{children}</>;
  return (
    <ClerkProvider
      publishableKey={pk}
      appearance={{
        variables: {
          colorPrimary: "#c8a96a",
          colorBackground: "#0a0a0a",
          borderRadius: "0.75rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
