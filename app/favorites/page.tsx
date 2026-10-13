import type { Metadata } from "next";
import { FavoritesBoard } from "@/components/favorites/FavoritesBoard";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Your Favorites",
    description: "Reels, frames, crew and gear you saved on ZH Films.",
    path: "/favorites"
  }),
  robots: { index: false, follow: true }
};

export default function FavoritesPage() {
  return <FavoritesBoard />;
}
