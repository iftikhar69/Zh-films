"use client";

import { useEffect } from "react";
import { useFavorites } from "@/stores/favorites-store";

export function FavoritesHydrator() {
  const hydrate = useFavorites((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return null;
}
