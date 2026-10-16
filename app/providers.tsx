"use client";

import { CinematicShell } from "@/components/layout/CinematicShell";
import { FilmNav } from "@/components/layout/FilmNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LazyDirectorsCutClub } from "@/components/marketing/LazyDirectorsCutClub";
import { ClerkProviderSafe } from "@/components/auth/ClerkProviderSafe";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { CustomCursor } from "@/components/motion/CustomCursor";
import { Preloader } from "@/components/motion/Preloader";
import { SearchLauncher } from "@/components/search/SearchLauncher";
import { FavoritesHydrator } from "@/components/favorites/FavoritesHydrator";
import { Toaster } from "@/components/ui/sonner";
import { MotionConfig } from "framer-motion";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProviderSafe>
      <MotionConfig reducedMotion="user">
        <Preloader />
        <SmoothScroll />
        <ScrollProgress />
        <CustomCursor />
        <FavoritesHydrator />
        <CinematicShell>
          <FilmNav />
          <main className="min-h-[100svh]">{children}</main>
          <SiteFooter />
          <LazyDirectorsCutClub />
        </CinematicShell>
        <SearchLauncher />
        <Toaster />
      </MotionConfig>
    </ClerkProviderSafe>
  );
}
