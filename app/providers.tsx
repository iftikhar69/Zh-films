"use client";

import { CinematicShell } from "@/components/layout/CinematicShell";
import { FilmNav } from "@/components/layout/FilmNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DirectorsCutClub } from "@/components/marketing/DirectorsCutClub";
import { ClerkProviderSafe } from "@/components/auth/ClerkProviderSafe";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { CustomCursor } from "@/components/motion/CustomCursor";
import { Preloader } from "@/components/motion/Preloader";
import { CommandPalette } from "@/components/search/CommandPalette";
import { FavoritesHydrator } from "@/components/favorites/FavoritesHydrator";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProviderSafe>
      <Preloader />
      <SmoothScroll />
      <ScrollProgress />
      <CustomCursor />
      <FavoritesHydrator />
      <CinematicShell>
        <FilmNav />
        <main className="min-h-[100svh]">{children}</main>
        <SiteFooter />
        <DirectorsCutClub />
      </CinematicShell>
      <CommandPalette />
      <Toaster />
    </ClerkProviderSafe>
  );
}
