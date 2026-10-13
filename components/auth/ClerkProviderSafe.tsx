"use client";

import { ClerkProvider } from "@clerk/nextjs";

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function ClerkProviderSafe({ children }: { children: React.ReactNode }) {
  if (!pk) return <>{children}</>;
  return (
    <ClerkProvider
      publishableKey={pk}
      appearance={{
        variables: {
          colorPrimary: "#c8a96a",
          colorBackground: "#0a0a0a",
          borderRadius: "0.75rem"
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
}
