"use client";

import { CinematicShell } from "@/components/layout/CinematicShell";
import { FilmNav } from "@/components/layout/FilmNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DirectorsCutClub } from "@/components/marketing/DirectorsCutClub";
import { ClerkProviderSafe } from "@/components/auth/ClerkProviderSafe";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProviderSafe>
      <CinematicShell>
        <FilmNav />
        <main className="min-h-[100svh]">{children}</main>
        <SiteFooter />
        <DirectorsCutClub />
      </CinematicShell>
    </ClerkProviderSafe>
  );
}
