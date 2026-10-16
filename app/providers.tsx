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
import { usePathname } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  // The Production Office is a work tool: no cinematic chrome, cursor, pop-ups or smooth scrolling.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <ClerkProviderSafe>
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster />
        </MotionConfig>
      </ClerkProviderSafe>
    );
  }
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
